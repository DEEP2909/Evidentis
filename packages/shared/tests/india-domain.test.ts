import { describe, expect, it } from 'vitest';

import {
  CORE_INDIAN_ACTS,
  COURT_HIERARCHY,
  EXTENDED_LANGUAGE_CODES,
  INDIA_PLAN_CATALOG,
  INDIAN_HIGH_COURTS,
  INDIAN_STATE_CODES,
  LANGUAGE_LABELS,
  LEGAL_TEMPLATE_LIBRARY,
  PRIMARY_LANGUAGE_CODES,
  RTL_LANGUAGES,
  SECONDARY_LANGUAGE_CODES,
  SUPPORTED_LANGUAGE_CODES,
} from '../src/index';

describe('India shared domain', () => {
  it('covers all supported Indian languages', () => {
    expect(SUPPORTED_LANGUAGE_CODES).toHaveLength(23);
    expect(PRIMARY_LANGUAGE_CODES).toHaveLength(9);
    expect(SECONDARY_LANGUAGE_CODES).toHaveLength(4);
    expect(EXTENDED_LANGUAGE_CODES).toHaveLength(10);
    expect(RTL_LANGUAGES).toEqual(['ur', 'ks', 'sd']);
    expect(LANGUAGE_LABELS.hi).toBe('हिन्दी');
    expect(LANGUAGE_LABELS.sat).toBe('ᱥᱟᱱᱛᱟᱲᱤ');
  });

  it('covers all states and union territories', () => {
    expect(INDIAN_STATE_CODES).toHaveLength(36);
    expect(INDIAN_HIGH_COURTS.DL).toBe('Delhi High Court');
    expect(INDIAN_HIGH_COURTS.MH).toBe('Bombay High Court');
  });

  it('captures court hierarchy and India plan pricing', () => {
    expect(COURT_HIERARCHY[0]).toBe('supreme_court');
    expect(COURT_HIERARCHY).toContain('tribunal');
    expect(INDIA_PLAN_CATALOG.starter.priceInPaise).toBe(499900);
    expect(INDIA_PLAN_CATALOG.enterprise.gstRatePercent).toBe(18);
  });

  it('includes core legal acts and template catalog entries', () => {
    expect(CORE_INDIAN_ACTS.some((act) => act.shortTitle === 'BNS')).toBe(true);
    expect(CORE_INDIAN_ACTS.some((act) => act.shortTitle === 'RERA')).toBe(true);
    expect(LEGAL_TEMPLATE_LIBRARY.some((template) => template.id === 'vakalatnama')).toBe(true);
    expect(LEGAL_TEMPLATE_LIBRARY.some((template) => template.id === 'employment-agreement')).toBe(true);
  });
});
