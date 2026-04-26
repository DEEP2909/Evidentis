/**
 * Wraps raw route sections into proper Fastify plugin modules.
 * Merges related sections (documents + documents-extra, analytics + analytics-extra, etc.)
 */
import fs from 'node:fs';
import path from 'node:path';

const routesDir = path.resolve('apps/api/src/routes');

// Merge plan: combine related raw files
const merges = {
  'documents.ts': ['_raw_documents.ts', '_raw_documents-extra.ts'],
  'analytics.ts': ['_raw_analytics.ts', '_raw_analytics-extra.ts'],
  'billing.ts': ['_raw_billing.ts', '_raw_billing-extra.ts'],
  'auth.ts': ['_raw_auth.ts', '_raw_auth-extra.ts'],
  'matters.ts': ['_raw_matters.ts', '_raw_portal.ts'],
  'admin.ts': ['_raw_admin.ts'],
  'research.ts': ['_raw_research.ts'],
  'legal-ops.ts': ['_raw_legal-ops.ts', '_raw_obligations.ts'],
  'legal-rules.ts': ['_raw_legal-rules.ts', '_raw_jobs.ts'],
  'webhooks.ts': ['_raw_webhooks.ts'],
  'ai.ts': ['_raw_ai.ts', '_raw_review.ts', '_raw_context-agent.ts'],
};

// Common imports that almost every module needs
const commonImports = `import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { query, queryOne, withTransaction } from '../database.js';
import { logger } from '../logger.js';
import {
  type AuthenticatedRequest,
  authenticateRequest,
  requireRoles,
} from './_helpers.js';
`;

// Per-module additional imports
const moduleImports = {
  'auth.ts': `import * as OTPAuth from 'otpauth';
import { fileTypeFromBuffer } from 'file-type';
import {
  type AccessTokenPayload,
  generateAccessToken,
  generateFingerprint,
  generateRefreshToken,
  verifyAccessToken,
} from '../auth.js';
import { corsOrigins, rateLimits } from '../config.js';
import { sendInvitationEmail, sendPasswordResetEmail } from '../email.js';
import { redis } from '../redis.js';
import { attorneyRepo, tenantRepo } from '../repository.js';
import {
  generateApiKey,
  generateRecoveryCodes,
  generateSecureToken,
  hashPassword,
  hashRecoveryCodes,
  hashToken,
  validatePasswordPolicy,
  verifyPassword,
} from '../security.js';
import {
  loginSchema,
  _registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  otpSendSchema,
  otpVerifySchema,
  inviteSchema,
  normalizeIndianPhoneNumber,
  getPhoneLookupDigits,
  maskPhoneNumber,
  generateOtpCode,
  sendOtpViaMsg91,
  resolveCorsOrigin,
} from './_helpers.js';
`,
  'matters.ts': `import {
  matterCreateSchema,
  matterUpdateSchema,
  parseJsonObject,
  getAiServiceHeaders,
  resolveCorsOrigin,
} from './_helpers.js';
import { redis } from '../redis.js';
import {
  generateSecureToken,
  hashToken,
} from '../security.js';
import { sendInvitationEmail } from '../email.js';
`,
  'documents.ts': `import { fileTypeFromBuffer } from 'file-type';
import {
  enforceActiveSubscription,
  enforceDocumentQuota,
  incrementDocumentUsage,
} from '../billing-enforcement.js';
import { startDocumentPipeline, getPipelineStatus } from '../orchestrator.js';
import {
  parseJsonObject,
  getAiServiceHeaders,
} from './_helpers.js';
`,
  'admin.ts': `import {
  adminMemberUpdateSchema,
  adminSecuritySettingsSchema,
  adminPlaybookCreateSchema,
  adminPlaybookUpdateSchema,
  inviteSchema,
} from './_helpers.js';
import { sendInvitationEmail } from '../email.js';
import { playbookRepo, attorneyRepo, tenantRepo } from '../repository.js';
import {
  generateSecureToken,
  hashPassword,
  hashToken,
  verifyPassword,
  generateApiKey,
} from '../security.js';
`,
  'research.ts': `import {
  enforceActiveSubscription,
  enforceResearchQuota,
  incrementResearchUsage,
} from '../billing-enforcement.js';
import { createDualRateLimiter } from '../rate-limit.js';
import {
  type ResearchSource,
  getAiServiceHeaders,
  getResearchEmbedding,
  findResearchDocumentChunks,
  findRelevantBareActSections,
  combineResearchSources,
  buildResearchSourcesPayload,
  buildResearchClientSources,
  buildResearchContextPrompt,
  supportedLanguageSchema,
} from './_helpers.js';
`,
  'legal-ops.ts': `import {
  getAiServiceHeaders,
  supportedLanguageSchema,
  indianStateSchema,
  toActSlug,
} from './_helpers.js';
import {
  enforceActiveSubscription,
} from '../billing-enforcement.js';
`,
  'analytics.ts': ``,
  'billing.ts': `import { handleRazorpayWebhook } from '../billing.js';
`,
  'legal-rules.ts': `import { getJobStatus } from '../worker.js';
`,
  'webhooks.ts': `import { handleRazorpayWebhook } from '../billing.js';
import {
  generateSecureToken,
  hashToken,
} from '../security.js';
`,
  'ai.ts': `import {
  executePromptPipeline,
  getInteractionHistory,
  getInteractionById,
  generateUserReport,
  generateMatterReport,
} from '../context-agent.js';
import { createDualRateLimiter } from '../rate-limit.js';
import {
  getAiServiceHeaders,
  supportedLanguageSchema,
} from './_helpers.js';
import { redis } from '../redis.js';
import {
  generateAccessToken,
  generateFingerprint,
  generateRefreshToken,
} from '../auth.js';
import {
  generateSecureToken,
  hashPassword,
  hashToken,
  validatePasswordPolicy,
  verifyPassword,
} from '../security.js';
import { corsOrigins, rateLimits } from '../config.js';
`,
};

const moduleExportNames = {
  'auth.ts': 'authRoutes',
  'matters.ts': 'matterRoutes',
  'documents.ts': 'documentRoutes',
  'admin.ts': 'adminRoutes',
  'research.ts': 'researchRoutes',
  'legal-ops.ts': 'legalOpsRoutes',
  'analytics.ts': 'analyticsRoutes',
  'billing.ts': 'billingRoutes',
  'legal-rules.ts': 'legalRulesRoutes',
  'webhooks.ts': 'webhookRoutes',
  'ai.ts': 'aiRoutes',
};

for (const [outFile, rawFiles] of Object.entries(merges)) {
  const rawContents = rawFiles.map(f => {
    const p = path.join(routesDir, f);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : '';
  });
  const mergedBody = rawContents.join('\n\n');
  
  const exportName = moduleExportNames[outFile] || outFile.replace(/\.ts$/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + 'Routes';
  const extraImports = moduleImports[outFile] || '';
  
  const moduleContent = `/**
 * EvidentIS API — ${exportName.replace('Routes', ' Routes')}
 * Auto-extracted from monolithic routes.ts
 */

${commonImports}
${extraImports}

export default async function ${exportName}(fastify: FastifyInstance): Promise<void> {
${mergedBody}
}
`;

  fs.writeFileSync(path.join(routesDir, outFile), moduleContent, 'utf-8');
  console.log(`Created ${outFile} (${exportName})`);
}

// Clean up raw files
for (const f of fs.readdirSync(routesDir)) {
  if (f.startsWith('_raw_')) {
    fs.unlinkSync(path.join(routesDir, f));
  }
}

console.log('\nCleaned up raw files. Module files created successfully.');
