import { createHash, randomBytes } from 'node:crypto';
// EvidentIS - OIDC/OAuth2 PKCE SSO Implementation
import { type FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as jose from 'jose';
import { config } from './config.js';
import { pool } from './database.js';
import { logger } from './logger.js';
import { encrypt, decrypt } from './encryption.js';

// OIDC Provider Configuration
interface OIDCProviderConfig {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  jwksUri: string;
  clientId: string;
  clientSecret?: string;
  scopes: string[];
}
import { redis } from './redis.js';

const SSO_STATE_TTL = 600; // 10 minutes
const SSO_STATE_PREFIX = 'sso:state:';

// Generate PKCE code verifier and challenge
function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

// Generate random state and nonce
function generateSecureRandom(): string {
  return randomBytes(32).toString('base64url');
}

// Get OIDC configuration for a tenant
async function getOIDCConfig(
  tenantId: string,
): Promise<OIDCProviderConfig | null> {
  const result = await pool.query(
    `SELECT provider_type, issuer_url, client_id, client_secret_encrypted, scopes
     FROM sso_configurations
     WHERE tenant_id = $1 AND enabled = true AND provider_type = 'oidc'`,
    [tenantId],
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  // Fetch well-known configuration
  const wellKnownUrl = `${row.issuer_url}/.well-known/openid-configuration`;
  const wellKnown = await fetch(wellKnownUrl).then((r) => r.json());

  return {
    issuer: row.issuer_url,
    authorizationEndpoint: wellKnown.authorization_endpoint,
    tokenEndpoint: wellKnown.token_endpoint,
    userinfoEndpoint: wellKnown.userinfo_endpoint,
    jwksUri: wellKnown.jwks_uri,
    clientId: row.client_id,
    clientSecret: row.client_secret_encrypted
      ? decrypt(row.client_secret_encrypted)
      : undefined,
    scopes: row.scopes || ['openid', 'email', 'profile'],
  };
}

// Initiate OIDC login
export async function initiateOIDCLogin(
  tenantId: string,
  redirectUri: string,
): Promise<{ authUrl: string; state: string }> {
  const oidcConfig = await getOIDCConfig(tenantId);
  if (!oidcConfig) {
    throw new Error('OIDC not configured for tenant');
  }

  const { verifier, challenge } = generatePKCE();
  const state = generateSecureRandom();
  const nonce = generateSecureRandom();

  // Store state for callback verification in Redis
  await redis.set(
    `${SSO_STATE_PREFIX}${state}`,
    JSON.stringify({
      tenantId,
      codeVerifier: verifier,
      nonce,
      redirectUri,
      provider: 'oidc',
    }),
    'EX',
    SSO_STATE_TTL,
  );

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: oidcConfig.clientId,
    redirect_uri: redirectUri,
    scope: oidcConfig.scopes.join(' '),
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `${oidcConfig.authorizationEndpoint}?${params.toString()}`;

  logger.info({ tenantId, provider: 'oidc' }, 'OIDC login initiated');

  return { authUrl, state };
}

// Handle OIDC callback
export async function handleOIDCCallback(
  code: string,
  state: string,
): Promise<{
  email: string;
  name: string;
  sub: string;
  tenantId: string;
}> {
  const stateKey = `${SSO_STATE_PREFIX}${state}`;
  const storedStateJson = await redis.get(stateKey);

  if (!storedStateJson) {
    throw new Error('Invalid or expired state');
  }

  const storedState = JSON.parse(storedStateJson) as {
    tenantId: string;
    codeVerifier: string;
    nonce: string;
    redirectUri: string;
    provider: string;
  };

  await redis.del(stateKey);

  const oidcConfig = await getOIDCConfig(storedState.tenantId);
  if (!oidcConfig) {
    throw new Error('OIDC configuration not found');
  }

  // Exchange code for tokens
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: storedState.redirectUri,
    client_id: oidcConfig.clientId,
    code_verifier: storedState.codeVerifier,
  });

  if (oidcConfig.clientSecret) {
    tokenParams.set('client_secret', oidcConfig.clientSecret);
  }

  const tokenResponse = await fetch(oidcConfig.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString(),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    logger.error({ error }, 'OIDC token exchange failed');
    throw new Error('Token exchange failed');
  }

  const tokens = await tokenResponse.json();

  // Verify ID token
  const JWKS = jose.createRemoteJWKSet(new URL(oidcConfig.jwksUri));
  const { payload } = await jose.jwtVerify(tokens.id_token, JWKS, {
    issuer: oidcConfig.issuer,
    audience: oidcConfig.clientId,
  });

  // Verify nonce
  if (payload.nonce !== storedState.nonce) {
    throw new Error('Nonce mismatch');
  }

  // Get user info if needed
  let userInfo = payload;
  if (!payload.email) {
    const userInfoResponse = await fetch(oidcConfig.userinfoEndpoint, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    userInfo = await userInfoResponse.json();
  }

  logger.info(
    { tenantId: storedState.tenantId, sub: payload.sub },
    'OIDC authentication successful',
  );

  return {
    email: (userInfo.email as string) || '',
    name:
      (userInfo.name as string) ||
      (userInfo.preferred_username as string) ||
      '',
    sub: payload.sub as string,
    tenantId: storedState.tenantId,
  };
}

// Link SSO identity to existing user
export async function linkSSOIdentity(
  advocateId: string,
  provider: string,
  providerUserId: string,
  tenantId: string,
  email: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO identity_links (advocate_id, provider, external_id, tenant_id, created_at, email)
     VALUES ($1, $2, $3, $4, NOW(), $5)
     ON CONFLICT (tenant_id, provider, external_id) DO UPDATE SET
       last_login_at = NOW(),
       email = EXCLUDED.email`,
    [advocateId, provider, providerUserId, tenantId, email],
  );

  logger.info({ advocateId, provider }, 'SSO identity linked');
}

// Find user by SSO identity
export async function findUserBySSOIdentity(
  provider: string,
  providerUserId: string,
  tenantId: string,
): Promise<{ id: string; email: string; role: string } | null> {
  const result = await pool.query(
    `SELECT a.id, a.email, a.role
     FROM attorneys a
     JOIN identity_links l ON a.id = l.advocate_id
     WHERE l.provider = $1 AND l.external_id = $2 AND a.tenant_id = $3`,
    [provider, providerUserId, tenantId],
  );

  return result.rows[0] || null;
}

// OAuth2 providers (Google, Microsoft, etc.)
interface OAuth2Provider {
  name: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

const OAUTH2_PROVIDERS: Record<string, OAuth2Provider> = {
  google: {
    name: 'Google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'email', 'profile'],
  },
  microsoft: {
    name: 'Microsoft',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scopes: ['openid', 'email', 'profile', 'User.Read'],
  },
};

// Initiate OAuth2 login
export async function initiateOAuth2Login(
  provider: string,
  clientId: string,
  redirectUri: string,
  tenantId: string,
): Promise<{ authUrl: string; state: string }> {
  const providerConfig = OAUTH2_PROVIDERS[provider];
  if (!providerConfig) {
    throw new Error(`Unknown OAuth2 provider: ${provider}`);
  }

  const { verifier, challenge } = generatePKCE();
  const state = generateSecureRandom();
  const nonce = generateSecureRandom();

  // Store state for callback verification in Redis
  await redis.set(
    `${SSO_STATE_PREFIX}${state}`,
    JSON.stringify({
      tenantId,
      codeVerifier: verifier,
      nonce,
      redirectUri,
      provider,
    }),
    'EX',
    SSO_STATE_TTL,
  );

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: providerConfig.scopes.join(' '),
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  });

  return {
    authUrl: `${providerConfig.authUrl}?${params.toString()}`,
    state,
  };
}

// SSO Configuration management
export async function configureSSOProvider(
  tenantId: string,
  providerType: 'oidc' | 'saml' | 'oauth2',
  config: {
    issuerUrl?: string;
    clientId: string;
    clientSecret?: string;
    metadataUrl?: string;
    certificate?: string;
    scopes?: string[];
  },
): Promise<{ id: string }> {
  const result = await pool.query(
    `INSERT INTO sso_configurations (
       tenant_id, provider_type, issuer_url, client_id, client_secret_encrypted,
       metadata_url, certificate, scopes, enabled, created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
     ON CONFLICT (tenant_id, provider_type) DO UPDATE SET
       issuer_url = EXCLUDED.issuer_url,
       client_id = EXCLUDED.client_id,
       client_secret_encrypted = EXCLUDED.client_secret_encrypted,
       metadata_url = EXCLUDED.metadata_url,
       certificate = EXCLUDED.certificate,
       scopes = EXCLUDED.scopes,
       updated_at = NOW()
     RETURNING id`,
    [
      tenantId,
      providerType,
      config.issuerUrl,
      config.clientId,
      config.clientSecret ? encrypt(config.clientSecret) : null,
      config.metadataUrl,
      config.certificate,
      config.scopes || ['openid', 'email', 'profile'],
    ],
  );

  logger.info({ tenantId, providerType }, 'SSO provider configured');

  return { id: result.rows[0].id };
}

// Get SSO configuration for tenant
export async function getSSOConfiguration(tenantId: string): Promise<
  Array<{
    id: string;
    providerType: string;
    issuerUrl: string;
    enabled: boolean;
  }>
> {
  const result = await pool.query(
    `SELECT id, provider_type, issuer_url, enabled
     FROM sso_configurations
     WHERE tenant_id = $1`,
    [tenantId],
  );

  return result.rows.map(
    (row: {
      id: string;
      provider_type: string;
      issuer_url: string;
      enabled: boolean;
    }) => ({
      id: row.id,
      providerType: row.provider_type,
      issuerUrl: row.issuer_url,
      enabled: row.enabled,
    }),
  );
}

// Disable SSO provider
export async function disableSSOProvider(
  tenantId: string,
  providerId: string,
): Promise<void> {
  await pool.query(
    `UPDATE sso_configurations
     SET enabled = false, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2`,
    [providerId, tenantId],
  );

  logger.info({ tenantId, providerId }, 'SSO provider disabled');
}

// SSO domain verification
export async function verifyDomain(
  tenantId: string,
  domain: string,
): Promise<{ verified: boolean; verificationRecord: string }> {
  const verificationToken = randomBytes(16).toString('hex');
  const verificationRecord = `evidentis-verify=${verificationToken}`;

  await pool.query(
    `INSERT INTO sso_domains (tenant_id, domain, verification_token, verified, created_at)
     VALUES ($1, $2, $3, false, NOW())
     ON CONFLICT (tenant_id, domain) DO UPDATE SET
       verification_token = EXCLUDED.verification_token,
       verified = false`,
    [tenantId, domain, verificationToken],
  );

  return { verified: false, verificationRecord };
}

// Check domain verification via DNS TXT record
export async function checkDomainVerification(
  tenantId: string,
  domain: string,
): Promise<boolean> {
  const result = await pool.query(
    `SELECT verification_token FROM sso_domains
     WHERE tenant_id = $1 AND domain = $2`,
    [tenantId, domain],
  );

  if (result.rows.length === 0) return false;

  // In production, query DNS TXT records
  // For now, simulate verification
  const verified = true; // DNS lookup would happen here

  if (verified) {
    await pool.query(
      `UPDATE sso_domains SET verified = true, verified_at = NOW()
       WHERE tenant_id = $1 AND domain = $2`,
      [tenantId, domain],
    );
  }

  return verified;
}

// JIT (Just-in-Time) provisioning
export async function jitProvisionUser(
  tenantId: string,
  email: string,
  name: string,
  providerUserId: string,
  provider: string,
): Promise<{ id: string; created: boolean }> {
  const normalizedEmail = email.toLowerCase();
  const displayName = name.trim() || normalizedEmail.split('@')[0];

  // Check if user exists
  const existing = await pool.query(
    'SELECT id FROM attorneys WHERE email = $1 AND tenant_id = $2',
    [normalizedEmail, tenantId],
  );

  if (existing.rows.length > 0) {
    // Link SSO identity to existing user
    await linkSSOIdentity(
      existing.rows[0].id,
      provider,
      providerUserId,
      tenantId,
      normalizedEmail,
    );
    return { id: existing.rows[0].id, created: false };
  }

  // Check if JIT provisioning is enabled
  const tenant = await pool.query(
    'SELECT jit_provisioning_enabled, default_role FROM tenants WHERE id = $1',
    [tenantId],
  );

  if (!tenant.rows[0]?.jit_provisioning_enabled) {
    throw new Error('JIT provisioning not enabled. Contact administrator.');
  }

  // Create new user
  const result = await pool.query(
    `INSERT INTO attorneys (
       tenant_id, email, display_name, role,
       status, created_at, password_hash
     )
     VALUES ($1, $2, $3, $4, 'active', NOW(), 'SSO_USER')
     RETURNING id`,
    [
      tenantId,
      normalizedEmail,
      displayName,
      tenant.rows[0].default_role || 'advocate',
    ],
  );

  // Link SSO identity
  await linkSSOIdentity(
    result.rows[0].id,
    provider,
    providerUserId,
    tenantId,
    normalizedEmail,
  );

  logger.info(
    { tenantId, email: normalizedEmail, provider },
    'User JIT provisioned via SSO',
  );

  return { id: result.rows[0].id, created: true };
}

export async function registerSsoRoutes(app: FastifyInstance): Promise<void> {
  app.get('/auth/sso/start', async (request, reply) => {
    const { tenantId, redirectUri } = request.query as {
      tenantId?: string;
      redirectUri?: string;
    };

    if (!tenantId) {
      return reply
        .status(400)
        .send({ success: false, error: { message: 'tenantId is required' } });
    }

    const callbackUrl = redirectUri || `${config.FRONTEND_URL}/auth/callback`;
    const { authUrl, state } = await initiateOIDCLogin(tenantId, callbackUrl);
    return { success: true, data: { authUrl, state } };
  });

  app.get('/auth/sso/callback', async (request, reply) => {
    const { code, state } = request.query as { code?: string; state?: string };

    if (!code || !state) {
      return reply
        .status(400)
        .send({ success: false, error: { message: 'Missing code or state' } });
    }

    const profile = await handleOIDCCallback(code, state);
    return { success: true, data: profile };
  });
}

export const sso = {
  initiateOIDCLogin,
  handleOIDCCallback,
  initiateOAuth2Login,
  configureSSOProvider,
  getSSOConfiguration,
  disableSSOProvider,
  verifyDomain,
  checkDomainVerification,
  linkSSOIdentity,
  findUserBySSOIdentity,
  jitProvisionUser,
};
