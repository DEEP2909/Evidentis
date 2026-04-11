import { describe, expect, it } from 'vitest';

import {
  createAdvocateSchema,
  createInvoiceSchema,
  createMatterSchema,
  ecourtsLookupSchema,
  legalResearchQuerySchema,
  loginSchema,
  otpRequestSchema,
} from '../src/validators';

describe('India validators', () => {
  it('accepts OTP login flows for Indian mobile numbers', () => {
    const parsed = loginSchema.parse({
      phoneNumber: '+919876543210',
      otp: '123456',
    });

    expect(parsed.phoneNumber).toBe('+919876543210');
  });

  it('validates advocate onboarding payloads', () => {
    const parsed = createAdvocateSchema.parse({
      email: 'advocate@example.com',
      displayName: 'Asha Rao',
      role: 'senior_advocate',
      phoneNumber: '+919876543210',
      preferredLanguage: 'hi',
      barCouncilEnrollmentNumber: 'DL/1234/2019',
    });

    expect(parsed.role).toBe('senior_advocate');
    expect(parsed.preferredLanguage).toBe('hi');
  });

  it('validates matters with Indian court fields', () => {
    const parsed = createMatterSchema.parse({
      matterCode: 'DL-HC-001',
      matterName: 'Section 138 Complaint',
      matterType: 'litigation',
      clientName: 'Rao Industries',
      governingLawState: 'DL',
      courtName: 'Delhi High Court',
      caseType: 'Criminal',
      cnrNumber: 'DLHC123456789012',
    });

    expect(parsed.courtName).toBe('Delhi High Court');
    expect(parsed.cnrNumber).toBe('DLHC123456789012');
  });

  it('validates eCourts lookups and research filters', () => {
    expect(ecourtsLookupSchema.parse({ cnrNumber: 'DLHC123456789012' }).cnrNumber).toBe('DLHC123456789012');
    expect(
      legalResearchQuerySchema.parse({
        query: 'Explain limitation for cheque bounce matters',
        language: 'en',
        court: 'Delhi High Court',
      }).court
    ).toBe('Delhi High Court');
  });

  it('validates invoice line items and OTP requests', () => {
    const invoice = createInvoiceSchema.parse({
      clientName: 'Acme India Pvt Ltd',
      issueDate: '2026-04-11',
      dueDate: '2026-04-26',
      lineItems: [{ description: 'Retainer', quantity: 1, unitAmountPaise: 250000 }],
    });

    const otpRequest = otpRequestSchema.parse({
      phoneNumber: '+919876543210',
      purpose: 'login',
    });

    expect(invoice.lineItems[0].unitAmountPaise).toBe(250000);
    expect(otpRequest.purpose).toBe('login');
  });
});
