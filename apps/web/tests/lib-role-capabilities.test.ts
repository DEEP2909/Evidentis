import { describe, it, expect } from 'vitest';
import { getCaps, ROLE_CAPABILITIES, type AdvocateRole } from '@/lib/role-capabilities';

describe('lib/role-capabilities.ts', () => {
  describe('ROLE_CAPABILITIES map', () => {
    it('contains all role keys', () => {
      const expectedRoles: AdvocateRole[] = [
        'admin',
        'senior_advocate',
        'partner',
        'junior_advocate',
        'advocate',
        'paralegal',
        'client',
      ];
      
      expectedRoles.forEach(role => {
        expect(ROLE_CAPABILITIES[role]).toBeDefined();
      });
    });

    it('admin has all permissions', () => {
      const adminCaps = ROLE_CAPABILITIES['admin'];
      expect(adminCaps.canAccessAdmin).toBe(true);
      expect(adminCaps.canAccessBilling).toBe(true);
      expect(adminCaps.canCreateMatter).toBe(true);
      expect(adminCaps.dashboardKpiSet).toBe('admin');
    });

    it('paralegal has restricted permissions', () => {
      const paralegalCaps = ROLE_CAPABILITIES['paralegal'];
      expect(paralegalCaps.canAccessAdmin).toBe(false);
      expect(paralegalCaps.canCreateMatter).toBe(false);
      expect(paralegalCaps.canUploadDocuments).toBe(true);
      expect(paralegalCaps.canDeleteDocuments).toBe(false);
      expect(paralegalCaps.dashboardKpiSet).toBe('paralegal');
    });

    it('client has minimal permissions', () => {
      const clientCaps = ROLE_CAPABILITIES['client'];
      expect(clientCaps.canAccessAdmin).toBe(false);
      expect(clientCaps.canAccessAllMatters).toBe(false);
      expect(clientCaps.canUploadDocuments).toBe(false);
      expect(clientCaps.dashboardKpiSet).toBe('paralegal');
    });
  });

  describe('getCaps', () => {
    it('returns capabilities for a valid role', () => {
      const caps = getCaps('senior_advocate');
      expect(caps).toEqual(ROLE_CAPABILITIES['senior_advocate']);
    });

    it('returns junior_advocate capabilities as fallback for unknown role', () => {
      // @ts-expect-error - Testing invalid role
      const caps = getCaps('invalid_role');
      expect(caps).toEqual(ROLE_CAPABILITIES['junior_advocate']);
    });
  });
});
