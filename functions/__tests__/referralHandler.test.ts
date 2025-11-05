import { generateHMAC, verifyHMAC, hashSensitive, generateSecureRandom } from '../src/utils/crypto';
import { generateReferralLink, verifyReferralLink, parseReferralLink } from '../src/utils/links';

describe('Crypto Utils', () => {
  describe('HMAC Signing', () => {
    it('generates consistent signatures for same input', () => {
      const data = 'ref_123:tutor_card';
      const sig1 = generateHMAC(data);
      const sig2 = generateHMAC(data);
      
      expect(sig1).toBe(sig2);
      expect(sig1).toHaveLength(64); // SHA-256 hex = 64 chars
    });
    
    it('generates different signatures for different inputs', () => {
      const sig1 = generateHMAC('ref_123:tutor_card');
      const sig2 = generateHMAC('ref_456:tutor_card');
      
      expect(sig1).not.toBe(sig2);
    });
    
    it('verifies valid signatures', () => {
      const data = 'ref_123:tutor_card';
      const signature = generateHMAC(data);
      
      expect(verifyHMAC(data, signature)).toBe(true);
    });
    
    it('detects tampered signatures', () => {
      const data = 'ref_123:tutor_card';
      const signature = generateHMAC(data);
      
      // Tamper with data
      const tamperedData = 'ref_456:tutor_card';
      
      expect(verifyHMAC(tamperedData, signature)).toBe(false);
    });
    
    it('detects tampered signatures (modified signature)', () => {
      const data = 'ref_123:tutor_card';
      const signature = generateHMAC(data);
      
      // Tamper with signature
      const tamperedSignature = signature.slice(0, -2) + 'XX';
      
      expect(verifyHMAC(data, tamperedSignature)).toBe(false);
    });
    
    it('handles invalid signature format gracefully', () => {
      const data = 'ref_123:tutor_card';
      
      // Invalid hex strings
      expect(verifyHMAC(data, 'not-hex')).toBe(false);
      expect(verifyHMAC(data, '')).toBe(false);
      expect(verifyHMAC(data, '123')).toBe(false);
    });
  });
  
  describe('Sensitive Data Hashing', () => {
    it('hashes data consistently', () => {
      const input = '192.168.1.1';
      const hash1 = hashSensitive(input);
      const hash2 = hashSensitive(input);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16); // First 16 chars
    });
    
    it('hashes different data differently', () => {
      const hash1 = hashSensitive('192.168.1.1');
      const hash2 = hashSensitive('192.168.1.2');
      
      expect(hash1).not.toBe(hash2);
    });
    
    it('is irreversible (one-way hash)', () => {
      const deviceId = 'ABC123-DEF456-GHI789';
      const hash = hashSensitive(deviceId);
      
      // Hash should not contain original data
      expect(hash).not.toContain('ABC');
      expect(hash).not.toContain('123');
      expect(hash).toMatch(/^[a-f0-9]{16}$/); // Hex string
    });
  });
  
  describe('Secure Random Generation', () => {
    it('generates random strings of correct length', () => {
      const random1 = generateSecureRandom(8);
      const random2 = generateSecureRandom(16);
      
      expect(random1).toHaveLength(8);
      expect(random2).toHaveLength(16);
    });
    
    it('generates unique random strings', () => {
      const random1 = generateSecureRandom(8);
      const random2 = generateSecureRandom(8);
      
      expect(random1).not.toBe(random2);
    });
    
    it('generates hex strings', () => {
      const random = generateSecureRandom(32);
      
      expect(random).toMatch(/^[a-f0-9]+$/);
    });
  });
});

describe('Link Generation', () => {
  describe('Custom Short Links', () => {
    it('generates valid referral links', async () => {
      const params = {
        referralId: 'ref_test_123',
        referrerId: 'user_abc',
        loopType: 'tutor_card',
      };
      
      const result = await generateReferralLink(params);
      
      expect(result.url).toContain('ref_test_123');
      expect(result.url).toContain('sig=');
      expect(result.url).toContain('loop=tutor_card');
      expect(result.provider).toBe('custom');
    });
    
    it('includes optional metadata in URL', async () => {
      const params = {
        referralId: 'ref_test_123',
        referrerId: 'user_abc',
        loopType: 'tutor_card',
        experimentId: 'exp_001',
        variantId: 'variant_A',
        channel: 'whatsapp',
      };
      
      const result = await generateReferralLink(params);
      
      expect(result.url).toContain('exp=exp_001');
      expect(result.url).toContain('var=variant_A');
      expect(result.url).toContain('ch=whatsapp');
    });
    
    it('generates valid HMAC signature', async () => {
      const params = {
        referralId: 'ref_test_123',
        referrerId: 'user_abc',
        loopType: 'tutor_card',
      };
      
      const result = await generateReferralLink(params);
      const parsed = parseReferralLink(result.url);
      
      expect(parsed).not.toBeNull();
      expect(verifyReferralLink(parsed!.referralId, parsed!.loopType, parsed!.signature)).toBe(true);
    });
  });
  
  describe('Link Verification', () => {
    it('verifies valid referral links', () => {
      const referralId = 'ref_123';
      const loopType = 'tutor_card';
      const signature = generateHMAC(`${referralId}:${loopType}`);
      
      expect(verifyReferralLink(referralId, loopType, signature)).toBe(true);
    });
    
    it('rejects tampered referralId', () => {
      const referralId = 'ref_123';
      const loopType = 'tutor_card';
      const signature = generateHMAC(`${referralId}:${loopType}`);
      
      // Attacker changes referralId
      const tamperedId = 'ref_456';
      
      expect(verifyReferralLink(tamperedId, loopType, signature)).toBe(false);
    });
    
    it('rejects tampered loopType', () => {
      const referralId = 'ref_123';
      const loopType = 'tutor_card';
      const signature = generateHMAC(`${referralId}:${loopType}`);
      
      // Attacker changes loopType
      const tamperedLoop = 'progress_reel';
      
      expect(verifyReferralLink(referralId, tamperedLoop, signature)).toBe(false);
    });
    
    it('rejects invalid signatures', () => {
      const referralId = 'ref_123';
      const loopType = 'tutor_card';
      const invalidSignature = 'abc123';
      
      expect(verifyReferralLink(referralId, loopType, invalidSignature)).toBe(false);
    });
  });
  
  describe('Link Parsing', () => {
    it('parses valid referral URLs', () => {
      const url = 'https://messageai.app/r/ref_123?sig=abc&loop=tutor_card&exp=exp1&var=A&ch=sms';
      const parsed = parseReferralLink(url);
      
      expect(parsed).toEqual({
        referralId: 'ref_123',
        signature: 'abc',
        loopType: 'tutor_card',
        experimentId: 'exp1',
        variantId: 'A',
        channel: 'sms',
      });
    });
    
    it('handles URLs without optional params', () => {
      const url = 'https://messageai.app/r/ref_123?sig=abc&loop=tutor_card';
      const parsed = parseReferralLink(url);
      
      expect(parsed).toEqual({
        referralId: 'ref_123',
        signature: 'abc',
        loopType: 'tutor_card',
        experimentId: undefined,
        variantId: undefined,
        channel: undefined,
      });
    });
    
    it('returns null for invalid URLs', () => {
      expect(parseReferralLink('https://example.com')).toBeNull();
      expect(parseReferralLink('not-a-url')).toBeNull();
      expect(parseReferralLink('https://messageai.app/r/')).toBeNull();
    });
    
    it('handles deep link scheme URLs', () => {
      const url = 'messageai://r/ref_123?sig=abc&loop=tutor_card';
      const parsed = parseReferralLink(url);
      
      expect(parsed?.referralId).toBe('ref_123');
      expect(parsed?.loopType).toBe('tutor_card');
    });
  });
});

describe('Integration: End-to-End Link Flow', () => {
  it('generates, verifies, and parses a complete referral link', async () => {
    // Step 1: Generate link
    const params = {
      referralId: 'ref_integration_test',
      referrerId: 'user_123',
      loopType: 'tutor_card',
      experimentId: 'exp_001',
      variantId: 'control',
    };
    
    const generated = await generateReferralLink(params);
    
    // Step 2: Parse link
    const parsed = parseReferralLink(generated.url);
    expect(parsed).not.toBeNull();
    
    // Step 3: Verify signature
    const isValid = verifyReferralLink(
      parsed!.referralId,
      parsed!.loopType,
      parsed!.signature
    );
    expect(isValid).toBe(true);
    
    // Step 4: Verify metadata preserved
    expect(parsed!.referralId).toBe('ref_integration_test');
    expect(parsed!.loopType).toBe('tutor_card');
    expect(parsed!.experimentId).toBe('exp_001');
    expect(parsed!.variantId).toBe('control');
  });
  
  it('rejects tampered links in end-to-end flow', async () => {
    // Step 1: Generate link
    const params = {
      referralId: 'ref_secure_123',
      referrerId: 'user_abc',
      loopType: 'tutor_card',
    };
    
    const generated = await generateReferralLink(params);
    
    // Step 2: Attacker tampers with URL (changes referralId)
    const tamperedUrl = generated.url.replace('ref_secure_123', 'ref_hacked_456');
    const parsed = parseReferralLink(tamperedUrl);
    
    // Step 3: Verification fails
    const isValid = verifyReferralLink(
      parsed!.referralId,
      parsed!.loopType,
      parsed!.signature
    );
    expect(isValid).toBe(false);
  });
});

/**
 * NOTE: Cloud Function tests (createReferralLink, trackReferralClick, etc.)
 * should be tested using Firebase Emulator in integration tests.
 * 
 * Run with:
 * firebase emulators:start
 * npm run test:integration
 */

