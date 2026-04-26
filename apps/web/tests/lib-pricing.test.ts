import { describe, it, expect } from 'vitest';
import { EVIDENTIS_PLANS } from '@/lib/pricing';

describe('lib/pricing.ts', () => {
  it('exports correct number of plans', () => {
    expect(EVIDENTIS_PLANS.length).toBe(4);
  });

  it('exports plans with correct keys', () => {
    const keys = EVIDENTIS_PLANS.map(p => p.key);
    expect(keys).toEqual(['starter', 'growth', 'professional', 'enterprise']);
  });

  it('each plan has required properties', () => {
    EVIDENTIS_PLANS.forEach(plan => {
      expect(plan).toHaveProperty('key');
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('price');
      expect(plan).toHaveProperty('billingSuffix');
      expect(plan).toHaveProperty('description');
      expect(plan).toHaveProperty('notes');
      expect(plan).toHaveProperty('seatLimit');
      expect(plan).toHaveProperty('documentLimit');
      expect(plan).toHaveProperty('researchLimit');
      expect(plan).toHaveProperty('highlights');
      expect(Array.isArray(plan.highlights)).toBe(true);
      expect(plan.highlights.length).toBeGreaterThan(0);
    });
  });

  it('starter plan has correct caps', () => {
    const starter = EVIDENTIS_PLANS.find(p => p.key === 'starter');
    expect(starter).toBeDefined();
    expect(starter?.seatCap).toBe(3);
    expect(starter?.documentCap).toBe(100);
    expect(starter?.researchCap).toBe(200);
  });

  it('enterprise plan has null caps for custom limits', () => {
    const enterprise = EVIDENTIS_PLANS.find(p => p.key === 'enterprise');
    expect(enterprise).toBeDefined();
    expect(enterprise?.documentCap).toBeNull();
    expect(enterprise?.researchCap).toBeNull();
  });
});
