import { describe, it, expect, vi } from 'vitest';
import { getDirection, textDirectionByLanguage, i18n } from '@/lib/i18n';

describe('lib/i18n.ts', () => {
  describe('getDirection', () => {
    it('returns rtl for urdu and kashmiri', () => {
      expect(getDirection('ur')).toBe('rtl');
      expect(getDirection('ks')).toBe('rtl');
    });

    it('returns ltr for other languages', () => {
      expect(getDirection('en')).toBe('ltr');
      expect(getDirection('hi')).toBe('ltr');
      expect(getDirection('bn')).toBe('ltr');
      expect(getDirection('ta')).toBe('ltr');
    });

    it('returns ltr for unknown languages', () => {
      expect(getDirection('unknown')).toBe('ltr');
    });
  });

  describe('textDirectionByLanguage', () => {
    it('contains rtl mappings', () => {
      expect(textDirectionByLanguage.ur).toBe('rtl');
      expect(textDirectionByLanguage.ks).toBe('rtl');
      // Should not contain ltr languages
      expect(textDirectionByLanguage.en).toBeUndefined();
    });
  });

  describe('i18n instance', () => {
    it('is initialized', () => {
      expect(i18n.isInitialized).toBeDefined();
    });

    it('has English resources', () => {
      expect(i18n.getResourceBundle('en', 'translation')).toBeDefined();
      expect(i18n.getResource('en', 'translation', 'dashboard')).toBe('Dashboard');
    });

    it('has Hindi resources', () => {
      expect(i18n.getResourceBundle('hi', 'translation')).toBeDefined();
      expect(i18n.getResource('hi', 'translation', 'dashboard')).toBe('डैशबोर्ड');
    });

    it('persists language changes to localStorage', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      
      i18n.changeLanguage('hi');
      
      expect(setItemSpy).toHaveBeenCalledWith('evidentis_language', 'hi');
      expect(document.documentElement.lang).toBe('hi');
      expect(document.documentElement.dir).toBe('ltr');
      
      i18n.changeLanguage('ur');
      
      expect(setItemSpy).toHaveBeenCalledWith('evidentis_language', 'ur');
      expect(document.documentElement.lang).toBe('ur');
      expect(document.documentElement.dir).toBe('rtl');
      
      setItemSpy.mockRestore();
    });
  });
});
