import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cn,
  formatFileSize,
  formatDate,
  formatIndianDate,
  formatDateTime,
  formatRelativeTime,
  truncate,
  getRiskColor,
  getRiskBadgeClass,
} from '@/lib/utils';

describe('lib/utils.ts', () => {
  describe('cn', () => {
    it('merges tailwind classes correctly', () => {
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
      expect(cn('px-2 py-1', { 'opacity-50': true, 'hidden': false })).toBe('px-2 py-1 opacity-50');
    });
  });

  describe('formatFileSize', () => {
    it('formats 0 bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('formats KB correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1500)).toBe('1.46 KB');
    });

    it('formats MB correctly', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1500000)).toBe('1.43 MB');
    });

    it('formats GB correctly', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });
  });

  describe('Date formatters', () => {
    const testDate = new Date('2026-04-26T12:00:00Z');

    it('formatDate formats date correctly', () => {
      const result = formatDate(testDate);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('formatIndianDate formats date correctly', () => {
      const result = formatIndianDate(testDate);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('formatDateTime formats date and time correctly', () => {
      const result = formatDateTime(testDate);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-26T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "just now" for times < 60s', () => {
      expect(formatRelativeTime(new Date('2026-04-26T11:59:30Z'))).toBe('just now');
    });

    it('returns minutes for times < 60m', () => {
      expect(formatRelativeTime(new Date('2026-04-26T11:55:00Z'))).toBe('5m ago');
    });

    it('returns hours for times < 24h', () => {
      expect(formatRelativeTime(new Date('2026-04-26T09:00:00Z'))).toBe('3h ago');
    });

    it('returns days for times < 7d', () => {
      expect(formatRelativeTime(new Date('2026-04-23T12:00:00Z'))).toBe('3d ago');
    });

    it('falls back to formatDate for > 7d', () => {
      expect(typeof formatRelativeTime(new Date('2026-04-01T12:00:00Z'))).toBe('string');
    });
  });

  describe('truncate', () => {
    it('does not truncate text shorter than maxLength', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('truncates text longer than maxLength and appends ellipsis', () => {
      expect(truncate('Hello World!', 10)).toBe('Hello W...');
    });
  });

  describe('getRiskColor', () => {
    it('returns correct colors for risk levels', () => {
      expect(getRiskColor('critical')).toBe('#DC2626');
      expect(getRiskColor('high')).toBe('#EA580C');
      expect(getRiskColor('medium')).toBe('#D97706');
      expect(getRiskColor('low')).toBe('#16A34A');
      expect(getRiskColor('unknown')).toBe('#6B7280');
    });
  });

  describe('getRiskBadgeClass', () => {
    it('returns correct CSS classes for risk levels', () => {
      expect(getRiskBadgeClass('critical')).toBe('risk-critical');
      expect(getRiskBadgeClass('high')).toBe('risk-high');
      expect(getRiskBadgeClass('medium')).toBe('risk-medium');
      expect(getRiskBadgeClass('low')).toBe('risk-low');
      expect(getRiskBadgeClass('unknown')).toBe('bg-gray-100 text-gray-800');
    });
  });
});
