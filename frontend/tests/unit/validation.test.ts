import { describe, it, expect } from 'vitest';
import { validateTaskTitle, validateDescription, validateDeadline } from '@/lib/validation';

describe('validateTaskTitle', () => {
  it('should accept valid titles', () => {
    expect(validateTaskTitle('Buy groceries').valid).toBe(true);
    expect(validateTaskTitle('Call mom').valid).toBe(true);
    expect(validateTaskTitle('a').valid).toBe(true); // Single character is valid
  });

  it('should reject empty titles', () => {
    expect(validateTaskTitle('').valid).toBe(false);
    expect(validateTaskTitle('   ').valid).toBe(false);
    expect(validateTaskTitle('\t\n').valid).toBe(false);
  });

  it('should reject titles exceeding 200 characters', () => {
    expect(validateTaskTitle('a'.repeat(200)).valid).toBe(true); // Exactly 200 is valid
    expect(validateTaskTitle('a'.repeat(201)).valid).toBe(false); // 201 is invalid
    expect(validateTaskTitle('a'.repeat(300)).valid).toBe(false);
  });

  it('should handle titles with leading/trailing whitespace', () => {
    expect(validateTaskTitle('  Valid title  ').valid).toBe(true);
    expect(validateTaskTitle('Valid title with exactly 200 chars' + 'x'.repeat(164)).valid).toBe(true);
  });
});

describe('validateDescription', () => {
  it('should accept undefined and empty descriptions', () => {
    expect(validateDescription(undefined).valid).toBe(true);
    expect(validateDescription('').valid).toBe(true);
  });

  it('should accept valid descriptions', () => {
    expect(validateDescription('Short description').valid).toBe(true);
    expect(validateDescription('A'.repeat(100)).valid).toBe(true);
    expect(validateDescription('A'.repeat(2000)).valid).toBe(true); // Exactly 2000 is valid
  });

  it('should reject descriptions exceeding 2000 characters', () => {
    expect(validateDescription('A'.repeat(2001)).valid).toBe(false);
    expect(validateDescription('A'.repeat(3000)).valid).toBe(false);
  });

  it('should handle multiline descriptions', () => {
    const multiline = `Line 1
Line 2
Line 3`;
    expect(validateDescription(multiline).valid).toBe(true);
  });
});

describe('validateDeadline', () => {
  it('should accept undefined deadline', () => {
    expect(validateDeadline(undefined).valid).toBe(true);
  });

  it('should accept future dates', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(validateDeadline(tomorrow).valid).toBe(true);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    expect(validateDeadline(nextWeek).valid).toBe(true);

    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    expect(validateDeadline(nextYear).valid).toBe(true);
  });

  it('should accept today as valid deadline', () => {
    const today = new Date();
    expect(validateDeadline(today).valid).toBe(true);
  });

  it('should reject past dates', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(validateDeadline(yesterday).valid).toBe(false);

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    expect(validateDeadline(lastWeek).valid).toBe(false);

    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    expect(validateDeadline(lastYear).valid).toBe(false);
  });

  it('should handle different times on same day as valid', () => {
    const morning = new Date();
    morning.setHours(8, 0, 0, 0);

    const evening = new Date();
    evening.setHours(20, 0, 0, 0);

    // Both should be valid since they're today
    expect(validateDeadline(morning).valid).toBe(true);
    expect(validateDeadline(evening).valid).toBe(true);
  });
});
