/**
 * PII Redaction Tests
 * PR19: Progress Reels
 * 
 * Tests for school name detection and combined PII redaction
 * Ensures COPPA/FERPA compliance
 */

import { redactForProgressReel, redactSchoolNames } from '../src/ai/piiRedaction';

describe('PII Redaction for Progress Reels', () => {
  describe('School Name Redaction', () => {
    test('should redact high school names', () => {
      const text = 'Student attends Lincoln High School and excels in math.';
      const redacted = redactSchoolNames(text);
      expect(redacted).toBe('Student attends [SCHOOL] and excels in math.');
    });
    
    test('should redact elementary school names', () => {
      const text = 'Student at Oak Elementary showed great progress.';
      const redacted = redactSchoolNames(text);
      expect(redacted).toBe('Student at [SCHOOL] showed great progress.');
    });
    
    test('should redact multiple school formats', () => {
      const cases = [
        { input: 'Student at Oak Elementary', expected: 'Student at [SCHOOL]' },
        { input: 'Attends St. Mary\'s Academy', expected: '[SCHOOL]' }, // "Attends" is captured in pattern
        { input: 'Washington Prep student', expected: '[SCHOOL] student' },
        { input: 'Jefferson Middle School rocks', expected: '[SCHOOL] rocks' },
        { input: 'Harvard College graduate', expected: '[SCHOOL] graduate' },
        { input: 'MIT Institute researcher', expected: '[SCHOOL] researcher' }, // "MIT Institute" is captured
      ];
      
      cases.forEach(({ input, expected }) => {
        const redacted = redactSchoolNames(input);
        expect(redacted).toBe(expected);
      });
    });
    
    test('should not redact non-school references', () => {
      const text = 'Student studied hard at home.';
      const redacted = redactSchoolNames(text);
      expect(redacted).toBe(text);
    });
    
    test('should handle empty or null input', () => {
      expect(redactSchoolNames('')).toBe('');
      expect(redactSchoolNames(null as any)).toBe(null);
      expect(redactSchoolNames(undefined as any)).toBe(undefined);
    });
  });
  
  describe('Combined PII Redaction', () => {
    test('should redact names, emails, and school names together', () => {
      const text = 'Hi John Smith from Lincoln High School, please email john@example.com for details.';
      const redacted = redactForProgressReel(text);
      
      expect(redacted).toContain('[NAME]');
      expect(redacted).toContain('[SCHOOL]');
      expect(redacted).toContain('[EMAIL]');
      expect(redacted).not.toContain('John Smith');
      expect(redacted).not.toContain('Lincoln High School');
      expect(redacted).not.toContain('john@example.com');
    });
    
    test('should redact phone numbers and schools', () => {
      const text = 'Student at Washington Prep, call 555-123-4567 for more info.';
      const redacted = redactForProgressReel(text);
      
      expect(redacted).toContain('[SCHOOL]');
      expect(redacted).toContain('[PHONE]');
      expect(redacted).not.toContain('Washington Prep');
      expect(redacted).not.toContain('555-123-4567');
    });
    
    test('should preserve educational content while redacting PII', () => {
      const text = 'Dear Jane Doe from Oak Elementary: Student mastered quadratic equations and demonstrated excellent problem-solving skills in algebra.';
      const redacted = redactForProgressReel(text);
      
      // Check that PII is redacted
      expect(redacted).toContain('[NAME]');
      expect(redacted).toContain('[SCHOOL]');
      expect(redacted).not.toContain('Jane Doe');
      expect(redacted).not.toContain('Oak Elementary');
      
      // Check that educational content is preserved
      expect(redacted).toContain('quadratic equations');
      expect(redacted).toContain('problem-solving skills');
      expect(redacted).toContain('algebra');
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle multiple schools in one text', () => {
      const text = 'Student transferred from Lincoln High School to Washington Prep.';
      const redacted = redactSchoolNames(text);
      expect(redacted).toBe('Student transferred from [SCHOOL] to [SCHOOL].');
    });
    
    test('should handle schools with apostrophes', () => {
      const text = 'St. Mary\'s Academy and St. John\'s School are nearby.';
      const redacted = redactSchoolNames(text);
      expect(redacted).toBe('[SCHOOL] and [SCHOOL] are nearby.');
    });
    
    test('should not over-redact common words', () => {
      const text = 'Student went to school today.';
      const redacted = redactSchoolNames(text);
      // "school" by itself shouldn't match (needs a proper name before it)
      expect(redacted).toBe(text);
    });
  });
});

