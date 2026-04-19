import { describe, expect, it } from 'vitest';

import {
  CENTRAL_RULES,
  DPDP_RULES,
  INDIAN_JURISDICTIONS,
  LABOUR_RULES,
  RERA_RULES,
  STAMP_DUTY_RULES,
  checkClauseCompliance,
  getApplicableRules,
  getDefaultPlaybookRules,
  getRulesForClauseType,
  getRulesForState,
} from '../src/legal-rules';

describe('India legal rules', () => {
  it('covers all states and union territories in jurisdiction metadata', () => {
    expect(INDIAN_JURISDICTIONS).toHaveLength(36);
    expect(INDIAN_JURISDICTIONS.some((jurisdiction) => jurisdiction.code === 'DL')).toBe(true);
    expect(INDIAN_JURISDICTIONS.some((jurisdiction) => jurisdiction.code === 'MH')).toBe(true);
  });

  it('publishes DPDP coverage across all jurisdictions', () => {
    expect(DPDP_RULES).toHaveLength(36);
    expect(DPDP_RULES.every((rule) => rule.clauseType === 'dpdp_privacy')).toBe(true);
  });

  it('surfaces state-specific stamp duty rules', () => {
    expect(STAMP_DUTY_RULES.some((rule) => rule.state === 'MH')).toBe(true);
    expect(STAMP_DUTY_RULES.some((rule) => rule.state === 'DL')).toBe(true);
  });

  it('surfaces state RERA and labour coverage', () => {
    expect(RERA_RULES.some((rule) => rule.state === 'KA')).toBe(true);
    expect(LABOUR_RULES.some((rule) => rule.state === 'TN')).toBe(true);
  });

  it('includes central rules for pan-India statutes', () => {
    expect(CENTRAL_RULES.some((rule) => rule.clauseType === 'non_compete')).toBe(true);
    expect(CENTRAL_RULES.some((rule) => rule.clauseType === 'gst_tax')).toBe(true);
  });

  it('returns central and state rules together for a jurisdiction', () => {
    const rules = getRulesForState('DL');
    expect(rules.some((rule) => rule.state === 'DL')).toBe(true);
    expect(rules.some((rule) => rule.state === 'CENTRAL')).toBe(true);
  });

  it('looks up rules by clause type', () => {
    const rules = getRulesForClauseType('dpdp_privacy');
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every((rule) => rule.clauseType === 'dpdp_privacy')).toBe(true);
  });

  it('builds a deduplicated applicable rule list', () => {
    const rules = getApplicableRules('MH', ['dpdp_privacy', 'stamp_duty', 'stamp_duty']);
    const keys = new Set(rules.map((rule) => `${rule.state}:${rule.clauseType}:${rule.rule}`));
    expect(keys.size).toBe(rules.length);
  });

  it('flags missing DPDP essentials as non-compliant', () => {
    const result = checkClauseCompliance('dpdp_privacy', 'The processor may use personal data for service delivery.', 'DL');
    expect(result.compliant).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes('consent'))).toBe(true);
  });

  it('flags arbitration clauses missing seat and rules', () => {
    const result = checkClauseCompliance('arbitration', 'Disputes shall be referred to arbitration.', 'MH');
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.severity).toBe('medium');
  });

  it('returns compatibility fields for older callers', () => {
    const result = checkClauseCompliance({
      clauseType: 'stamp_duty',
      text: 'The parties will execute this agreement.',
      jurisdiction: 'DL',
    });
    expect(result).toHaveProperty('isCompliant');
    expect(result).toHaveProperty('violations');
    expect(result).toHaveProperty('warnings');
  });

  it('exposes India-first playbook defaults', () => {
    const rules = getDefaultPlaybookRules();
    expect(rules.length).toBeGreaterThanOrEqual(5);
    expect(rules.some((rule) => rule.clauseType === 'dpdp_privacy')).toBe(true);
    expect(rules.some((rule) => rule.clauseType === 'rera_compliance')).toBe(true);
  });
});
