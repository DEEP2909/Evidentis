import { createHash, randomBytes } from 'node:crypto';
import {
  type VerifiedAuthenticationResponse,
  type VerifiedRegistrationResponse,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/types';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Redis } from 'ioredis';
import type pg from 'pg';
import { config } from './config.js';
import { authenticateRequest } from './routes.js';

// ============================================================================
// TYPES
// ============================================================================

interface WebAuthnCredential {
  id: string;
  credentialId: Buffer;
  credentialPublicKey: Buffer;
  counter: number;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  transports?: AuthenticatorTransportFuture[];
  aaguid: string;
  attestationObject?: Buffer;
  createdAt: Date;
  lastUsedAt?: Date;
  friendlyName?: string;
}

interface StoredChallenge {
  challenge: string;
  advocateId: string;
  type: 'registration' | 'authentication';
  expiresAt: Date;
}

interface RequestUser {
  tenantId: string;
  advocateId: string;
  email?: string;
  displayName?: string;
  role?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: RequestUser;
  }
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const rpName = config.WEBAUTHN_RP_NAME;
const rpID = config.WEBAUTHN_RP_ID;
const origin = config.WEBAUTHN_ORIGIN;

// Timeout for WebAuthn ceremonies (5 minutes)
const CEREMONY_TIMEOUT = 300000;

// Challenge expiration (5 minutes)
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000;

// ============================================================================
// CHALLENGE STORAGE (In production, use Redis)
// ============================================================================

const challengeStore = new Map<string, StoredChallenge>();
let challengeRedis: Redis | null | undefined;

function getChallengeStoreKey(
  identifier: string,
  type: 'registration' | 'authentication',
): string {
  return `webauthn:challenge:${type}:${Buffer.from(identifier, 'utf8').toString('base64url')}`;
}

async function getChallengeRedis(): Promise<Redis | null> {
  if (challengeRedis !== undefined) {
    return challengeRedis;
  }

  if (config.NODE_ENV === 'test' || !config.REDIS_URL) {
    challengeRedis = null;
    return challengeRedis;
  }

  const redis = new Redis(config.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });

  try {
    await redis.connect();
    challengeRedis = redis;
  } catch {
    await redis.quit().catch(() => undefined);
    challengeRedis = null;
  }

  return challengeRedis;
}

async function storeChallenge(
  identifier: string,
  challenge: string,
  type: 'registration' | 'authentication',
): Promise<void> {
  const key = getChallengeStoreKey(identifier, type);
  const record: StoredChallenge = {
    challenge,
    advocateId: identifier,
    type,
    expiresAt: new Date(Date.now() + CHALLENGE_EXPIRY_MS),
  };
  const redis = await getChallengeRedis();

  if (redis) {
    await redis.set(key, JSON.stringify(record), 'PX', CHALLENGE_EXPIRY_MS);
    return;
  }

  if (config.NODE_ENV === 'production') {
    throw new Error('Redis unavailable — cannot store WebAuthn challenge');
  }

  challengeStore.set(key, record);

  // Cleanup old challenges periodically when Redis is unavailable.
  setTimeout(() => {
    challengeStore.delete(key);
  }, CHALLENGE_EXPIRY_MS);
}

async function getChallenge(
  identifier: string,
  type: 'registration' | 'authentication',
): Promise<string | null> {
  const key = getChallengeStoreKey(identifier, type);
  const redis = await getChallengeRedis();

  if (redis) {
    const raw = await redis.get(key);
    if (!raw) {
      return null;
    }

    const stored = JSON.parse(raw) as StoredChallenge;
    return stored.challenge;
  }

  const stored = challengeStore.get(key);

  if (!stored || stored.expiresAt < new Date()) {
    challengeStore.delete(key);
    return null;
  }

  return stored.challenge;
}

async function consumeChallenge(
  identifier: string,
  type: 'registration' | 'authentication',
): Promise<string | null> {
  const key = getChallengeStoreKey(identifier, type);
  const challenge = await getChallenge(identifier, type);
  if (!challenge) {
    return null;
  }

  const redis = await getChallengeRedis();
  if (redis) {
    await redis.del(key);
    return challenge;
  }

  challengeStore.delete(key);
  return challenge;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function getCredentialsForUser(
  db: pg.Pool | pg.PoolClient,
  tenantId: string,
  advocateId: string,
): Promise<WebAuthnCredential[]> {
  const result = await db.query(
    `SELECT 
      id, credential_id, credential_public_key, counter,
      credential_device_type, credential_backed_up, transports,
      aaguid, attestation_object, created_at, last_used_at, friendly_name
    FROM webauthn_credentials
    WHERE tenant_id = $1 AND advocate_id = $2`,
    [tenantId, advocateId],
  );

  return result.rows.map((row: {
    id: string;
    credential_id: Buffer;
    credential_public_key: Buffer;
    counter: number;
    credential_device_type: string;
    credential_backed_up: boolean;
    transports: AuthenticatorTransportFuture[];
    aaguid: string;
    attestation_object: Buffer;
    created_at: Date;
    last_used_at: Date;
    friendly_name: string;
  }) => ({
    id: row.id,
    credentialId: row.credential_id,
    credentialPublicKey: row.credential_public_key,
    counter: row.counter,
    credentialDeviceType: row.credential_device_type,
    credentialBackedUp: row.credential_backed_up,
    transports: row.transports,
    aaguid: row.aaguid,
    attestationObject: row.attestation_object,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    friendlyName: row.friendly_name,
  }));
}

async function saveCredential(
  db: pg.Pool | pg.PoolClient,
  tenantId: string,
  advocateId: string,
  credential: {
    credentialId: Uint8Array | string;
    credentialPublicKey: Uint8Array;
    counter: number;
    credentialDeviceType: string;
    credentialBackedUp: boolean;
    transports?: AuthenticatorTransportFuture[];
    aaguid: string;
    attestationObject?: Uint8Array;
  },
  friendlyName?: string,
): Promise<string> {
  const id = randomBytes(16).toString('hex');

  await db.query(
    `INSERT INTO webauthn_credentials (
      id, tenant_id, advocate_id, credential_id, credential_public_key,
      counter, credential_device_type, credential_backed_up, transports,
      aaguid, attestation_object, friendly_name, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
    [
      id,
      tenantId,
      advocateId,
      typeof credential.credentialId === 'string'
        ? Buffer.from(credential.credentialId, 'base64url')
        : Buffer.from(credential.credentialId),
      Buffer.from(credential.credentialPublicKey),
      credential.counter,
      credential.credentialDeviceType,
      credential.credentialBackedUp,
      credential.transports || [],
      credential.aaguid,
      credential.attestationObject
        ? Buffer.from(credential.attestationObject)
        : null,
      friendlyName || 'Security Key',
    ],
  );

  return id;
}

async function updateCredentialCounter(
  db: pg.Pool | pg.PoolClient,
  credentialId: Buffer,
  newCounter: number,
): Promise<void> {
  await db.query(
    `UPDATE webauthn_credentials 
    SET counter = $1, last_used_at = NOW() 
    WHERE credential_id = $2`,
    [newCounter, credentialId],
  );
}

async function deleteCredential(
  db: pg.Pool | pg.PoolClient,
  tenantId: string,
  advocateId: string,
  credentialDbId: string,
): Promise<boolean> {
  const result = await db.query(
    `DELETE FROM webauthn_credentials 
    WHERE id = $1 AND tenant_id = $2 AND advocate_id = $3`,
    [credentialDbId, tenantId, advocateId],
  );
  return (result.rowCount ?? 0) > 0;
}

async function getCredentialById(
  db: pg.Pool | pg.PoolClient,
  credentialId: Uint8Array,
): Promise<WebAuthnCredential | null> {
  const result = await db.query(
    `SELECT 
      wc.id, wc.credential_id, wc.credential_public_key, wc.counter,
      wc.credential_device_type, wc.credential_backed_up, wc.transports,
      wc.aaguid, wc.attestation_object, wc.created_at, wc.last_used_at,
      wc.friendly_name, wc.tenant_id, wc.advocate_id
    FROM webauthn_credentials wc
    WHERE wc.credential_id = $1`,
    [Buffer.from(credentialId)],
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    credentialId: row.credential_id,
    credentialPublicKey: row.credential_public_key,
    counter: row.counter,
    credentialDeviceType: row.credential_device_type,
    credentialBackedUp: row.credential_backed_up,
    transports: row.transports,
    aaguid: row.aaguid,
    attestationObject: row.attestation_object,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    friendlyName: row.friendly_name,
  };
}

// ============================================================================
// REGISTRATION FLOW
// ============================================================================

export async function generatePasskeyRegistrationOptions(
  db: pg.Pool | pg.PoolClient,
  tenantId: string,
  advocateId: string,
  userEmail: string,
  userName: string,
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  // Get existing credentials to exclude
  const existingCredentials = await getCredentialsForUser(
    db,
    tenantId,
    advocateId,
  );

  const excludeCredentials = existingCredentials.map((cred) => ({
    id: cred.credentialId.toString('base64url'),
    type: 'public-key' as const,
    transports: cred.transports,
  }));

  // Generate user ID from attorney ID (deterministic, privacy-preserving)
  const userIdHash = createHash('sha256')
    .update(`${tenantId}:${advocateId}`)
    .digest();

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: userIdHash,
    userName: userEmail,
    userDisplayName: userName,
    attestationType: 'none', // For privacy; use 'direct' if you need attestation
    excludeCredentials,
    authenticatorSelection: {
      // Prefer platform authenticators (Touch ID, Windows Hello) but allow cross-platform
      authenticatorAttachment: undefined,
      // Require user verification (biometric, PIN)
      userVerification: 'preferred',
      // Require resident key for discoverable credentials (true passkeys)
      residentKey: 'preferred',
      requireResidentKey: false,
    },
    timeout: CEREMONY_TIMEOUT,
    supportedAlgorithmIDs: [
      -7, // ES256 (most common)
      -257, // RS256 (Windows Hello)
      -8, // EdDSA
    ],
  });

  // Store challenge for verification
  await storeChallenge(advocateId, options.challenge, 'registration');

  return options;
}

export async function verifyPasskeyRegistration(
  db: pg.Pool | pg.PoolClient,
  tenantId: string,
  advocateId: string,
  response: RegistrationResponseJSON,
  friendlyName?: string,
): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  const expectedChallenge = await consumeChallenge(advocateId, 'registration');

  if (!expectedChallenge) {
    return { success: false, error: 'Challenge expired or not found' };
  }

  try {
    const verification: VerifiedRegistrationResponse =
      await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      });

    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, error: 'Registration verification failed' };
    }

    const { registrationInfo } = verification;

    // Save the credential to database
    const credentialId = await saveCredential(
      db,
      tenantId,
      advocateId,
      {
        credentialId: registrationInfo.credentialID,
        credentialPublicKey: registrationInfo.credentialPublicKey,
        counter: registrationInfo.counter,
        credentialDeviceType: registrationInfo.credentialDeviceType,
        credentialBackedUp: registrationInfo.credentialBackedUp,
        transports: response.response.transports,
        aaguid: registrationInfo.aaguid,
        attestationObject: registrationInfo.attestationObject,
      },
      friendlyName,
    );

    return { success: true, credentialId };
  } catch (error) {
    console.error('WebAuthn registration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    };
  }
}

// ============================================================================
// AUTHENTICATION FLOW
// ============================================================================

export async function generatePasskeyAuthenticationOptions(
  db: pg.Pool | pg.PoolClient,
  tenantId?: string,
  advocateId?: string,
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  let allowCredentials: {
    id: string;
    type: 'public-key';
    transports?: AuthenticatorTransportFuture[];
  }[] = [];

  // If we know the user, limit to their credentials
  if (tenantId && advocateId) {
    const existingCredentials = await getCredentialsForUser(
      db,
      tenantId,
      advocateId,
    );
    allowCredentials = existingCredentials.map((cred) => ({
      id: cred.credentialId.toString('base64url'),
      type: 'public-key' as const,
      transports: cred.transports,
    }));
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    timeout: CEREMONY_TIMEOUT,
    // If empty, allows discoverable credentials (true passkey login)
    allowCredentials:
      allowCredentials.length > 0 ? allowCredentials : undefined,
  });

  // Store challenge - use session ID if no attorney ID (for discoverable credential flow)
  const challengeKey = advocateId || options.challenge;
  await storeChallenge(challengeKey, options.challenge, 'authentication');

  return options;
}

export async function verifyPasskeyAuthentication(
  db: pg.Pool | pg.PoolClient,
  response: AuthenticationResponseJSON,
  expectedChallenge?: string,
  advocateId?: string,
): Promise<{
  success: boolean;
  tenantId?: string;
  advocateId?: string;
  attorneyId?: string;
  error?: string;
}> {
  // Get the credential to find the user
  const credentialIdBuffer = Buffer.from(response.id, 'base64url');

  // Look up the credential
  const credentialResult = await db.query(
    `SELECT 
      wc.id, wc.credential_id, wc.credential_public_key, wc.counter,
      wc.tenant_id, wc.advocate_id, a.email, a.display_name, a.status
    FROM webauthn_credentials wc
    JOIN attorneys a ON wc.advocate_id = a.id AND wc.tenant_id = a.tenant_id
    WHERE wc.credential_id = $1`,
    [credentialIdBuffer],
  );

  if (credentialResult.rows.length === 0) {
    return { success: false, error: 'Credential not found' };
  }

  const credentialRow = credentialResult.rows[0];

  // Check attorney status
  if (credentialRow.status !== 'active') {
    return { success: false, error: 'Account is not active' };
  }

  // Get or consume challenge
  const challengeKey =
    advocateId || expectedChallenge || response.response.clientDataJSON;
  const storedChallenge = await consumeChallenge(
    challengeKey,
    'authentication',
  );

  if (!storedChallenge) {
    return { success: false, error: 'Challenge expired or not found' };
  }

  if (expectedChallenge && storedChallenge !== expectedChallenge) {
    return { success: false, error: 'Challenge mismatch' };
  }

  try {
    const authenticator = {
      credentialID: credentialRow.credential_id,
      credentialPublicKey: credentialRow.credential_public_key,
      counter: credentialRow.counter,
    };

    const verification: VerifiedAuthenticationResponse =
      await verifyAuthenticationResponse({
        response,
        expectedChallenge: storedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        authenticator,
        requireUserVerification: true,
      });

    if (!verification.verified) {
      return { success: false, error: 'Authentication verification failed' };
    }

    // Update counter to prevent replay attacks
    const { authenticationInfo } = verification;
    await updateCredentialCounter(
      db,
      credentialRow.credential_id,
      authenticationInfo.newCounter,
    );

    return {
      success: true,
      tenantId: credentialRow.tenant_id,
      advocateId: credentialRow.advocate_id,
    };
  } catch (error) {
    console.error('WebAuthn authentication error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

// ============================================================================
// FASTIFY ROUTES
// ============================================================================

export function registerWebAuthnRoutes(app: FastifyInstance, db: pg.Pool | pg.PoolClient): void {
  // Get registered passkeys for current user
  app.get(
    '/auth/passkeys',
    { preHandler: authenticateRequest },
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const { tenantId, advocateId } = request.user as RequestUser;

      const credentials = await getCredentialsForUser(db, tenantId, advocateId);

      return credentials.map((cred) => ({
        id: cred.id,
        friendlyName: cred.friendlyName,
        deviceType: cred.credentialDeviceType,
        backedUp: cred.credentialBackedUp,
        createdAt: cred.createdAt,
        lastUsedAt: cred.lastUsedAt,
      }));
    },
  );

  // Start passkey registration
  app.post(
    '/auth/passkeys/register/options',
    { preHandler: authenticateRequest },
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const {
        tenantId,
        advocateId,
        email = '',
        displayName = '',
      } = request.user as RequestUser;

      try {
        const options = await generatePasskeyRegistrationOptions(
          db,
          tenantId,
          advocateId,
          email,
          displayName,
        );

        return options;
      } catch (error) {
        if (error instanceof Error && error.message.includes('Redis unavailable')) {
          return _reply.status(503).send({ error: 'Authentication service temporarily unavailable' });
        }
        throw error;
      }
    },
  );

  // Complete passkey registration
  app.post<{
    Body: { response: RegistrationResponseJSON; friendlyName?: string };
  }>(
    '/auth/passkeys/register/verify',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const { tenantId, advocateId } = request.user as RequestUser;
      const { response, friendlyName } = request.body;

      const result = await verifyPasskeyRegistration(
        db,
        tenantId,
        advocateId,
        response,
        friendlyName,
      );

      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }

      return { success: true, credentialId: result.credentialId };
    },
  );

  // Delete a passkey
  app.delete<{ Params: { credentialId: string } }>(
    '/auth/passkeys/:credentialId',
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const { tenantId, advocateId } = request.user as RequestUser;
      const { credentialId } = request.params;

      // Ensure user has at least one other auth method before deleting
      const credentials = await getCredentialsForUser(db, tenantId, advocateId);

      if (credentials.length <= 1) {
        // Check if user has password or other auth method
        const attorney = await db.query(
          'SELECT password_hash, mfa_enabled FROM attorneys WHERE tenant_id = $1 AND id = $2',
          [tenantId, advocateId],
        );

        if (!attorney.rows[0]?.password_hash && credentials.length === 1) {
          return reply.status(400).send({
            error: 'Cannot delete last authentication method',
          });
        }
      }

      const deleted = await deleteCredential(
        db,
        tenantId,
        advocateId,
        credentialId,
      );

      if (!deleted) {
        return reply.status(404).send({ error: 'Passkey not found' });
      }

      return { success: true };
    },
  );

  // Rename a passkey
  app.patch<{
    Params: { credentialId: string };
    Body: { friendlyName: string };
  }>(
    '/auth/passkeys/:credentialId',
    { preHandler: authenticateRequest },
    async (request, _reply) => {
      const { tenantId, advocateId } = request.user as RequestUser;
      const { credentialId } = request.params;
      const { friendlyName } = request.body;

      await db.query(
        `UPDATE webauthn_credentials 
      SET friendly_name = $1 
      WHERE id = $2 AND tenant_id = $3 AND advocate_id = $4`,
        [friendlyName, credentialId, tenantId, advocateId],
      );

      return { success: true };
    },
  );

  // Start passwordless authentication (for login page)
  app.post(
    '/auth/passkeys/authenticate/options',
    async (
      request: FastifyRequest<{
        Body: { email?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { email } = request.body || {};

      let tenantId: string | undefined;
      let advocateId: string | undefined;

      // If email provided, look up user's credentials
      if (email) {
        const userResult = await db.query(
          `SELECT tenant_id, id FROM attorneys WHERE email = $1 AND status = 'active'`,
          [email.toLowerCase()],
        );

        if (userResult.rows.length > 0) {
          tenantId = userResult.rows[0].tenant_id;
          advocateId = userResult.rows[0].id;
        }
      }

      try {
        const options = await generatePasskeyAuthenticationOptions(
          db,
          tenantId,
          advocateId,
        );

        // Store the challenge in session/cookie for verification
        reply.setCookie('webauthn_challenge', options.challenge, {
          httpOnly: true,
          secure: config.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 300, // 5 minutes
          path: '/auth',
        });

        return options;
      } catch (error) {
        if (error instanceof Error && error.message.includes('Redis unavailable')) {
          return reply.status(503).send({ error: 'Authentication service temporarily unavailable' });
        }
        throw error;
      }
    },
  );

  // Complete passwordless authentication
  app.post(
    '/auth/passkeys/authenticate/verify',
    async (
      request: FastifyRequest<{
        Body: { response: AuthenticationResponseJSON };
      }>,
      reply: FastifyReply,
    ) => {
      const { response } = request.body;
      const expectedChallenge = request.cookies.webauthn_challenge;

      if (!expectedChallenge) {
        return reply
          .status(400)
          .send({ error: 'Authentication session expired' });
      }

      const result = await verifyPasskeyAuthentication(
        db,
        response,
        expectedChallenge,
      );

      // Clear the challenge cookie
      reply.clearCookie('webauthn_challenge', { path: '/auth' });

      if (!result.success) {
        return reply.status(401).send({ error: result.error });
      }

      // Generate JWT tokens for the authenticated user
      const attorneyResult = await db.query(
        `SELECT a.id, a.tenant_id, a.email, a.display_name, a.role, t.slug as tenant_slug
      FROM attorneys a
      JOIN tenants t ON a.tenant_id = t.id
      WHERE a.id = $1 AND a.tenant_id = $2`,
        [result.advocateId, result.tenantId],
      );

      if (attorneyResult.rows.length === 0) {
        return reply.status(401).send({ error: 'User not found' });
      }

      const attorney = attorneyResult.rows[0];

      // Update last login
      await db.query(
        'UPDATE attorneys SET last_login_at = NOW() WHERE id = $1',
        [attorney.id],
      );

      // Generate tokens (assuming jwt utilities are available)
      const { generateAccessToken, generateRefreshToken } = await import(
        './auth.js'
      );

      const accessToken = await generateAccessToken({
        sub: attorney.id,
        tenantId: attorney.tenant_id,
        email: attorney.email,
        role: attorney.role,
      });

      const refreshToken = await generateRefreshToken({
        sub: attorney.id,
        tenantId: attorney.tenant_id,
        email: attorney.email,
        role: attorney.role,
        tokenId: randomBytes(16).toString('hex'),
      });

      return {
        success: true,
        accessToken,
        refreshToken,
        user: {
          id: attorney.id,
          email: attorney.email,
          displayName: attorney.display_name,
          role: attorney.role,
          tenantSlug: attorney.tenant_slug,
        },
      };
    },
  );
}

// ============================================================================
// DATABASE MIGRATION
// ============================================================================

export const webauthnMigration = `
-- WebAuthn Credentials Table
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  attorney_id UUID NOT NULL REFERENCES attorneys(id) ON DELETE CASCADE,
  credential_id BYTEA NOT NULL UNIQUE,
  credential_public_key BYTEA NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  credential_device_type TEXT NOT NULL,
  credential_backed_up BOOLEAN NOT NULL DEFAULT FALSE,
  transports TEXT[] DEFAULT '{}',
  aaguid TEXT NOT NULL,
  attestation_object BYTEA,
  friendly_name TEXT DEFAULT 'Security Key',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  -- Indexes
  CONSTRAINT fk_webauthn_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_webauthn_attorney FOREIGN KEY (attorney_id) REFERENCES attorneys(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_webauthn_attorney ON webauthn_credentials(tenant_id, attorney_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credential_id ON webauthn_credentials(credential_id);
`;

export default {
  generatePasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  generatePasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
  registerWebAuthnRoutes,
  webauthnMigration,
};
