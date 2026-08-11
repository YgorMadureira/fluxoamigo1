import { describe, it, expect } from 'vitest';
import { formatDateBR, formatDateTimeBR, todayBR, nowInBR } from './dateBR';

describe('formatDateBR', () => {
  it('formats a plain date-only value (as stored in `date` columns) without any timezone conversion', () => {
    expect(formatDateBR('2026-06-24')).toBe('24/06/2026');
  });

  it('returns an em dash for null/undefined', () => {
    expect(formatDateBR(null)).toBe('—');
    expect(formatDateBR(undefined)).toBe('—');
  });

  it('falls back to the Brasília-converted date part for a full timestamp', () => {
    // 02:30 UTC is still 23:30 the previous day in Brasília (UTC-3).
    expect(formatDateBR('2026-06-24T02:30:00Z')).toBe('23/06/2026');
  });
});

describe('formatDateTimeBR', () => {
  it('converts a UTC instant to Brasília wall-clock time, including a day rollback near midnight', () => {
    expect(formatDateTimeBR('2026-06-24T02:30:00Z')).toBe('23/06/2026 23:30');
  });

  it('returns an em dash for null/undefined', () => {
    expect(formatDateTimeBR(null)).toBe('—');
  });
});

describe('todayBR / nowInBR', () => {
  it('todayBR returns a yyyy-MM-dd string consistent with nowInBR', () => {
    expect(todayBR()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const d = nowInBR();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(todayBR()).toBe(expected);
  });
});
