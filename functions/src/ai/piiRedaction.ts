/**
 * PII Redaction Utility
 * 
 * Removes personally identifiable information from strings
 * Used to sanitize agent logs and other sensitive data
 */

/**
 * Redact PII from a string
 * 
 * Removes:
 * - Email addresses
 * - Phone numbers
 * - Names (common patterns)
 * - URLs with user IDs
 * - Credit card numbers
 * - Social security numbers
 */
export function redactPII(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  let redacted = text;
  
  // Email addresses
  redacted = redacted.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    '[EMAIL]'
  );
  
  // Phone numbers (various formats)
  redacted = redacted.replace(
    /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    '[PHONE]'
  );
  
  // Credit card numbers (4 groups of 4 digits)
  redacted = redacted.replace(
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    '[CARD]'
  );
  
  // Social security numbers
  redacted = redacted.replace(
    /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
    '[SSN]'
  );
  
  // URLs with user IDs
  redacted = redacted.replace(
    /https?:\/\/[^\s]+\/users?\/[a-zA-Z0-9_-]+/g,
    '[USER_URL]'
  );
  
  // Common name patterns (e.g., "Hi John Smith", "Dear Jane Doe")
  redacted = redacted.replace(
    /\b(Hi|Hello|Dear|Name:|Student:|Tutor:|Parent:)\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?\b/g,
    '$1 [NAME]'
  );
  
  return redacted;
}

/**
 * Redact school names from text
 * PR19: Progress Reels
 * 
 * Matches patterns like: "Lincoln High School", "Oak Elementary", "St. Mary's Academy"
 */
export function redactSchoolNames(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  let redacted = text;
  
  // Pattern: [Name] + [School Type]
  // Matches: "Lincoln High School", "St. Mary's Academy", "Oak Elementary", etc.
  redacted = redacted.replace(
    /\b([A-Z][A-Za-z'\.]*\s*)+\s*(High School|Elementary|Middle School|School|Academy|Prep|Institute|College)\b/g,
    '[SCHOOL]'
  );
  
  return redacted;
}

/**
 * Enhanced PII redaction for progress reels
 * PR19: Adds school names to existing redaction
 * 
 * Use this for all progress reel content to ensure COPPA/FERPA compliance
 */
export function redactForProgressReel(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  let redacted = redactPII(text); // Existing function
  redacted = redactSchoolNames(redacted);
  return redacted;
}

/**
 * Check if text contains potential PII
 * Returns true if any PII patterns are detected
 */
export function containsPII(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  // Check for email
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text)) {
    return true;
  }
  
  // Check for phone
  if (/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)) {
    return true;
  }
  
  // Check for credit card
  if (/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(text)) {
    return true;
  }
  
  // Check for SSN
  if (/\b\d{3}[-]?\d{2}[-]?\d{4}\b/.test(text)) {
    return true;
  }
  
  return false;
}

