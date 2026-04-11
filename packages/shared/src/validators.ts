/**
 * EvidentIS India Shared Validators
 * Zod schemas for tenant-safe India legal workflows.
 */

import { z } from 'zod';
import {
  ADVOCATE_ROLES,
  ATTORNEY_STATUSES,
  CLAUSE_TYPES,
  DOC_TYPES,
  FLAG_STATUSES,
  INDIAN_STATE_CODES,
  MATTER_STATUSES,
  MATTER_TYPES,
  OBLIGATION_STATUSES,
  PLANS,
  PRIORITIES,
  REVIEW_STATUSES,
  RISK_LEVELS,
  SECURITY_STATUSES,
  SUBSCRIPTION_STATUSES,
  SUPPORTED_LANGUAGE_CODES,
} from './index.js';

export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email().max(255).toLowerCase();
export const urlSchema = z.string().url().max(2048);
export const slugSchema = z
  .string()
  .min(2)
  .max(63)
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Slug must be lowercase alphanumeric with hyphens');

export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const indianPhoneSchema = z
  .string()
  .regex(/^(?:\+91)?[6-9]\d{9}$/, 'Phone must be a valid Indian mobile number');

export const gstinSchema = z
  .string()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'GSTIN must be valid')
  .optional();

export const barCouncilEnrollmentSchema = z
  .string()
  .min(6)
  .max(40)
  .regex(/^[A-Z]{1,4}[-/0-9A-Z]+$/, 'Bar Council enrollment number format is invalid')
  .optional();

export const bciEnrollmentSchema = z
  .string()
  .min(6)
  .max(40)
  .regex(/^[A-Z0-9/-]+$/, 'BCI enrollment number format is invalid')
  .optional();

export const cnrNumberSchema = z
  .string()
  .regex(/^[A-Z]{4}\d{12}$/, 'CNR number must match the standard eCourts format')
  .optional();

export const languageCodeSchema = z.enum(SUPPORTED_LANGUAGE_CODES);
export const stateCodeSchema = z.enum(INDIAN_STATE_CODES);
export const tenantPlanSchema = z.enum(PLANS);
export const subscriptionStatusSchema = z.enum(SUBSCRIPTION_STATUSES);
export const advocateRoleSchema = z.enum(ADVOCATE_ROLES);
export const attorneyRoleSchema = advocateRoleSchema;
export const attorneyStatusSchema = z.enum(ATTORNEY_STATUSES);
export const matterTypeSchema = z.enum(MATTER_TYPES);
export const matterStatusSchema = z.enum(MATTER_STATUSES);
export const matterPrioritySchema = z.enum(PRIORITIES);
export const docTypeSchema = z.enum(DOC_TYPES);
export const riskLevelSchema = z.enum(RISK_LEVELS);
export const securityStatusSchema = z.enum(SECURITY_STATUSES);
export const reviewStatusSchema = z.enum(REVIEW_STATUSES);
export const flagStatusSchema = z.enum(FLAG_STATUSES);
export const obligationStatusSchema = z.enum(OBLIGATION_STATUSES);
export const clauseTypeSchema = z.enum(CLAUSE_TYPES);

export const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: slugSchema,
  plan: tenantPlanSchema.default('starter'),
  region: z.enum(['centralindia', 'ap-mumbai-1']).default('centralindia'),
  barCouncilState: stateCodeSchema.optional(),
  preferredLanguage: languageCodeSchema.default('en'),
  gstin: gstinSchema,
});

export const updateTenantSchema = createTenantSchema.partial();

export const createAdvocateSchema = z.object({
  email: emailSchema,
  displayName: z.string().min(2).max(100),
  role: advocateRoleSchema.default('junior_advocate'),
  practiceGroup: z.string().max(80).optional(),
  barCouncilEnrollmentNumber: barCouncilEnrollmentSchema,
  barCouncilState: stateCodeSchema.optional(),
  bciEnrollmentNumber: bciEnrollmentSchema,
  phoneNumber: indianPhoneSchema.optional(),
  preferredLanguage: languageCodeSchema.default('en'),
  password: passwordSchema.optional(),
});

export const updateAdvocateSchema = createAdvocateSchema.partial().omit({ password: true });
export const createAttorneySchema = createAdvocateSchema;
export const updateAttorneySchema = updateAdvocateSchema;

export const inviteAdvocateSchema = z.object({
  email: emailSchema,
  role: advocateRoleSchema.default('junior_advocate'),
  practiceGroup: z.string().max(80).optional(),
  preferredLanguage: languageCodeSchema.default('en'),
});

export const inviteAttorneySchema = inviteAdvocateSchema;

export const loginSchema = z
  .object({
    email: emailSchema.optional(),
    password: z.string().min(1).optional(),
    phoneNumber: indianPhoneSchema.optional(),
    otp: z.string().length(6).regex(/^\d{6}$/).optional(),
    tenantSlug: slugSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const passwordFlow = value.email && value.password;
    const otpFlow = value.phoneNumber && value.otp;
    if (!passwordFlow && !otpFlow) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either email + password or phoneNumber + otp',
      });
    }
  });

export const otpRequestSchema = z.object({
  phoneNumber: indianPhoneSchema,
  purpose: z.enum(['login', 'verify_phone', 'reset_password']).default('login'),
});

export const otpVerifySchema = z.object({
  phoneNumber: indianPhoneSchema,
  otp: z.string().length(6).regex(/^\d{6}$/),
});

export const mfaVerifySchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema.optional(),
  phoneNumber: indianPhoneSchema.optional(),
});

export const passwordResetSchema = z.object({
  token: z.string().min(32),
  newPassword: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const createMatterSchema = z.object({
  matterCode: z.string().min(1).max(50),
  matterName: z.string().min(1).max(200),
  matterType: matterTypeSchema,
  clientName: z.string().min(1).max(200),
  counterpartyName: z.string().max(200).optional(),
  governingLawState: stateCodeSchema.optional(),
  status: matterStatusSchema.default('open'),
  priority: matterPrioritySchema.default('normal'),
  targetCloseDate: z.string().date().optional(),
  valueInPaise: z.number().int().min(0).optional(),
  notes: z.string().max(10000).optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  courtName: z.string().max(200).optional(),
  caseType: z.string().max(120).optional(),
  cnrNumber: cnrNumberSchema,
  clientPhone: indianPhoneSchema.optional(),
  clientPreferredLanguage: languageCodeSchema.optional(),
});

export const updateMatterSchema = createMatterSchema.partial();

export const matterFilterSchema = z.object({
  status: matterStatusSchema.optional(),
  priority: matterPrioritySchema.optional(),
  matterType: matterTypeSchema.optional(),
  clientName: z.string().max(200).optional(),
  governingLawState: stateCodeSchema.optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const uploadDocumentSchema = z.object({
  matterId: uuidSchema,
  docType: docTypeSchema,
  fileName: z.string().min(1).max(255),
  language: languageCodeSchema.optional(),
});

export const documentFilterSchema = z.object({
  matterId: uuidSchema.optional(),
  docType: docTypeSchema.optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const clauseFilterSchema = z.object({
  documentId: uuidSchema.optional(),
  matterId: uuidSchema.optional(),
  clauseType: clauseTypeSchema.optional(),
  riskLevel: riskLevelSchema.optional(),
  reviewerStatus: reviewStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const bareActQuerySchema = z.object({
  q: z.string().max(250).optional(),
  category: z.enum(['criminal', 'civil', 'corporate', 'labour', 'property', 'family', 'constitutional', 'state']).optional(),
  language: languageCodeSchema.optional(),
  state: stateCodeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const ecourtsLookupSchema = z.object({
  cnrNumber: cnrNumberSchema.unwrap(),
});

export const legalResearchQuerySchema = z.object({
  query: z.string().min(3).max(2000),
  matterId: uuidSchema.optional(),
  actSlug: z.string().max(120).optional(),
  section: z.string().max(50).optional(),
  court: z.string().max(120).optional(),
  judgeName: z.string().max(120).optional(),
  fromDate: z.string().date().optional(),
  toDate: z.string().date().optional(),
  language: languageCodeSchema.default('en'),
  topK: z.coerce.number().int().min(1).max(50).default(10),
});

export const createInvoiceSchema = z.object({
  matterId: uuidSchema.optional(),
  clientName: z.string().min(1).max(200),
  clientGstin: gstinSchema,
  issueDate: z.string().date(),
  dueDate: z.string().date(),
  lineItems: z.array(
    z.object({
      description: z.string().min(1).max(500),
      quantity: z.number().positive(),
      unitAmountPaise: z.number().int().nonnegative(),
    })
  ).min(1),
});

export const createLegalNoticeSchema = z.object({
  noticeType: z.enum(['section_80_cpc', 'consumer', 'cheque_bounce', 'general']),
  language: languageCodeSchema.default('en'),
  clientName: z.string().min(1).max(200),
  recipientName: z.string().min(1).max(200),
  facts: z.string().min(20).max(10000),
  governingState: stateCodeSchema.optional(),
  responseDeadlineDays: z.coerce.number().int().min(1).max(180).default(15),
});

export const dpdpRequestSchema = z.object({
  requestType: z.enum(['information', 'correction', 'erasure', 'grievance', 'nomination']),
  details: z.string().max(5000).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type TenantPlan = z.infer<typeof tenantPlanSchema>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type AdvocateRole = z.infer<typeof advocateRoleSchema>;
export type CreateAdvocateInput = z.infer<typeof createAdvocateSchema>;
export type UpdateAdvocateInput = z.infer<typeof updateAdvocateSchema>;
export type InviteAdvocateInput = z.infer<typeof inviteAdvocateSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type CreateMatterInput = z.infer<typeof createMatterSchema>;
export type UpdateMatterInput = z.infer<typeof updateMatterSchema>;
export type MatterFilterInput = z.infer<typeof matterFilterSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type DocumentFilterInput = z.infer<typeof documentFilterSchema>;
export type ClauseFilterInput = z.infer<typeof clauseFilterSchema>;
export type BareActQueryInput = z.infer<typeof bareActQuerySchema>;
export type EcourtsLookupInput = z.infer<typeof ecourtsLookupSchema>;
export type LegalResearchQueryInput = z.infer<typeof legalResearchQuerySchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type CreateLegalNoticeInput = z.infer<typeof createLegalNoticeSchema>;
export type DpdpRequestInput = z.infer<typeof dpdpRequestSchema>;
