# PR15 – Referral Attribution System
**Implementation Plan**

---

## 📋 Overview

**Goal:** Smart links with cross-device tracking, install-deferred attribution, HMAC signing  
**Owner:** Engineer A (Backend)  
**Effort:** 3-5 days (Medium)  
**Dependencies:** None (foundation PR)  
**Kill-Switch:** `growth.referralAttribution.enabled`

---

## ✅ Acceptance Criteria

- [ ] Attribution accuracy ≥95% (click → install → signup chain)
- [ ] Link generation P95 <100ms
- [ ] HMAC signing prevents tampering
- [ ] Cross-device tracking works (Android Install Referrer, iOS Universal Links)
- [ ] Zero PII in referral links (hashed IDs only)
- [ ] Admin can debug attribution chains
- [ ] Graceful fallback on Dynamic Links failure

---

## 🗂️ Files to Create/Modify

### **Backend (Functions)**
```
functions/src/
├── growth/
│   ├── referralHandler.ts         [NEW] - Attribution logic, admin endpoints
│   └── referralTypes.ts           [NEW] - Backend-specific types
├── utils/
│   ├── links.ts                   [NEW] - Link generation with HMAC
│   └── crypto.ts                  [NEW] - HMAC signing/verification
└── index.ts                       [MODIFY] - Export growth functions
```

### **Frontend (App)**
```
app/src/
├── types/
│   └── growthTypes.ts             [NEW] - Growth system types
├── services/growth/
│   └── referralService.ts         [NEW] - Client-side attribution
├── config/
│   └── featureFlags.ts            [MODIFY] - Add growth flags
└── app/_layout.tsx                [MODIFY] - First-launch attribution hook
```

### **Infrastructure**
```
firestore.rules                    [MODIFY] - Add /referrals rules
firestore.indexes.json             [MODIFY] - Add referral indexes
.env                               [MODIFY] - Add Dynamic Links config
```

### **Tests**
```
functions/__tests__/
└── referralHandler.test.ts        [NEW] - Unit + integration tests
```

---

## 📐 Step-by-Step Implementation

### **Step 1: Types & Schema (30 min)**

#### 1.1 Create `app/src/types/growthTypes.ts`
```typescript
import { Timestamp } from "firebase/firestore";

// Referral tracking
export interface Referral {
  referralId: string;          // UUID
  referrerId: string;          // User who shared
  referrerType: 'tutor' | 'parent' | 'student';
  targetType: 'tutor' | 'parent' | 'student' | 'any';
  loopType: 'tutor_card' | 'progress_reel' | 'study_buddy' | 'parent_pod' | 'tutor_peer' | 'results';
  status: 'pending' | 'clicked' | 'installed' | 'signed_up' | 'completed_fvm' | 'expired';
  
  // Attribution chain
  clickedAt?: Timestamp;
  installedAt?: Timestamp;
  signedUpAt?: Timestamp;
  completedFvmAt?: Timestamp;
  
  // Device hints (for fraud detection)
  deviceHints?: {
    deviceId?: string;         // Hashed device ID
    userAgent?: string;
    ipHash?: string;           // Hashed IP
    platform?: 'ios' | 'android' | 'web';
  };
  
  // Metadata
  metadata?: {
    experimentId?: string;
    variantId?: string;
    channel?: string;          // 'whatsapp' | 'sms' | 'email' | 'copy'
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
  
  createdAt: Timestamp;
  expiresAt: Timestamp;        // 30 days from creation
  referredUserId?: string;     // Set on signup
}

// Feature flags
export interface GrowthFeatureFlags {
  enabled: boolean;
  referralAttribution: {
    enabled: boolean;
    provider: 'firebase' | 'branch' | 'custom';
  };
}
```

#### 1.2 Update Firestore Indexes (`firestore.indexes.json`)
```json
{
  "indexes": [
    {
      "collectionGroup": "referrals",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "referrerId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "referrals",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "referredUserId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "referrals",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "expiresAt", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

#### 1.3 Update Firestore Rules (`firestore.rules`)
Add after existing rules (before closing brace):
```javascript
// --- REFERRALS COLLECTION (PR15) ---
// Only Cloud Functions can write (server-side only)
// Users can read their own referrals for debugging
match /referrals/{referralId} {
  // Users can read referrals they created or received
  allow read: if request.auth != null && (
    request.auth.uid == resource.data.referrerId ||
    request.auth.uid == resource.data.referredUserId
  );
  
  // Only Cloud Functions can write (via admin SDK)
  allow write: if false;
}
```

---

### **Step 2: Crypto & Link Generation (1 hour)**

#### 2.1 Create `functions/src/utils/crypto.ts`
```typescript
import * as crypto from 'crypto';

// Secret key (store in Firebase Config or Secret Manager)
// For now, use environment variable
const SECRET_KEY = process.env.REFERRAL_SECRET_KEY || 'dev-secret-key-change-in-prod';

/**
 * Generate HMAC signature for referral link
 */
export function generateHMAC(data: string): string {
  return crypto
    .createHmac('sha256', SECRET_KEY)
    .update(data)
    .digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifyHMAC(data: string, signature: string): boolean {
  const expected = generateHMAC(data);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

/**
 * Hash sensitive data (device ID, IP) for privacy
 */
export function hashSensitive(value: string): string {
  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex')
    .substring(0, 16); // First 16 chars for storage efficiency
}
```

#### 2.2 Create `functions/src/utils/links.ts`
```typescript
import { generateHMAC } from './crypto';
import * as logger from 'firebase-functions/logger';

export interface ReferralLinkParams {
  referralId: string;
  referrerId: string;
  loopType: string;
  experimentId?: string;
  variantId?: string;
  channel?: string;
}

/**
 * Generate signed referral link
 * Provider priority: Firebase Dynamic Links → Branch.io → Custom short domain
 */
export async function generateReferralLink(
  params: ReferralLinkParams
): Promise<{ url: string; provider: string }> {
  const startTime = Date.now();
  
  try {
    // Try Firebase Dynamic Links first
    const dynamicLink = await generateFirebaseDynamicLink(params);
    if (dynamicLink) {
      logger.info('✅ Generated Firebase Dynamic Link', {
        latency: Date.now() - startTime,
      });
      return { url: dynamicLink, provider: 'firebase' };
    }
  } catch (error: any) {
    logger.warn('⚠️ Firebase Dynamic Links failed, trying fallback', {
      error: error.message,
    });
  }
  
  // Fallback: Custom short link
  const customLink = generateCustomShortLink(params);
  logger.info('✅ Generated custom short link', {
    latency: Date.now() - startTime,
  });
  
  return { url: customLink, provider: 'custom' };
}

/**
 * Generate Firebase Dynamic Link
 */
async function generateFirebaseDynamicLink(
  params: ReferralLinkParams
): Promise<string | null> {
  // TODO: Implement Firebase Dynamic Links API
  // For now, return null to use fallback
  // Requires: firebase-dynamic-links API setup
  
  return null; // Fallback to custom for MVP
}

/**
 * Generate custom short link with HMAC signature
 * Format: https://msg.ai/r/{referralId}?sig={hmac}&loop={loopType}&exp={experimentId}
 */
function generateCustomShortLink(params: ReferralLinkParams): string {
  const { referralId, loopType, experimentId, variantId, channel } = params;
  
  // Generate HMAC signature (sign referralId + loopType)
  const dataToSign = `${referralId}:${loopType}`;
  const signature = generateHMAC(dataToSign);
  
  // Build URL with query params
  const baseUrl = process.env.REFERRAL_BASE_URL || 'https://messageai.app/r';
  const url = new URL(`${baseUrl}/${referralId}`);
  
  url.searchParams.set('sig', signature);
  url.searchParams.set('loop', loopType);
  
  if (experimentId) url.searchParams.set('exp', experimentId);
  if (variantId) url.searchParams.set('var', variantId);
  if (channel) url.searchParams.set('ch', channel);
  
  return url.toString();
}

/**
 * Verify referral link signature
 */
export function verifyReferralLink(
  referralId: string,
  loopType: string,
  signature: string
): boolean {
  const dataToSign = `${referralId}:${loopType}`;
  const expectedSignature = generateHMAC(dataToSign);
  
  return signature === expectedSignature;
}
```

---

### **Step 3: Backend Attribution Handler (2 hours)**

#### 3.1 Create `functions/src/growth/referralHandler.ts`
```typescript
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { https } from 'firebase-functions/v2';
import { generateReferralLink, verifyReferralLink } from '../utils/links';
import { hashSensitive } from '../utils/crypto';

const db = admin.firestore();

/**
 * Cloud Function: Create referral link
 * Called by: Mobile app when user initiates share
 */
export const createReferralLink = https.onCall(async (request) => {
  const { auth, data } = request;
  
  if (!auth) {
    throw new https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { loopType, targetType, metadata } = data;
  
  if (!loopType) {
    throw new https.HttpsError('invalid-argument', 'loopType is required');
  }
  
  try {
    // Get user role
    const userDoc = await db.doc(`users/${auth.uid}`).get();
    const userData = userDoc.data();
    const referrerType = userData?.role || 'parent';
    
    // Generate referral ID
    const referralId = generateReferralId();
    
    // Create referral document
    const referral = {
      referralId,
      referrerId: auth.uid,
      referrerType,
      targetType: targetType || 'any',
      loopType,
      status: 'pending',
      metadata: {
        ...metadata,
        experimentId: metadata?.experimentId || 'default',
        variantId: metadata?.variantId || 'control',
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      ),
    };
    
    await db.collection('referrals').doc(referralId).set(referral);
    
    // Generate signed link
    const { url, provider } = await generateReferralLink({
      referralId,
      referrerId: auth.uid,
      loopType,
      experimentId: metadata?.experimentId,
      variantId: metadata?.variantId,
      channel: metadata?.channel,
    });
    
    logger.info('✅ Referral created', {
      referralId: referralId.substring(0, 8),
      loopType,
      provider,
    });
    
    return { referralId, url, provider };
  } catch (error: any) {
    logger.error('❌ Referral creation failed', { error: error.message });
    throw new https.HttpsError('internal', 'Failed to create referral');
  }
});

/**
 * Cloud Function: Track referral click (first touch)
 * Called by: Landing page or deep link handler
 */
export const trackReferralClick = https.onCall(async (request) => {
  const { data } = request;
  const { referralId, loopType, signature, deviceHints } = data;
  
  if (!referralId || !signature) {
    throw new https.HttpsError('invalid-argument', 'Missing required fields');
  }
  
  try {
    // Verify HMAC signature
    if (!verifyReferralLink(referralId, loopType, signature)) {
      logger.warn('⚠️ Invalid signature', { referralId });
      throw new https.HttpsError('permission-denied', 'Invalid signature');
    }
    
    // Get referral doc
    const referralRef = db.collection('referrals').doc(referralId);
    const referralDoc = await referralRef.get();
    
    if (!referralDoc.exists) {
      throw new https.HttpsError('not-found', 'Referral not found');
    }
    
    const referral = referralDoc.data();
    
    // Check expiration
    if (referral?.expiresAt.toDate() < new Date()) {
      await referralRef.update({ status: 'expired' });
      throw new https.HttpsError('failed-precondition', 'Referral expired');
    }
    
    // Update referral (idempotent - only if not already clicked)
    if (referral?.status === 'pending') {
      await referralRef.update({
        status: 'clicked',
        clickedAt: admin.firestore.FieldValue.serverTimestamp(),
        deviceHints: {
          deviceId: deviceHints?.deviceId ? hashSensitive(deviceHints.deviceId) : null,
          userAgent: deviceHints?.userAgent || null,
          ipHash: deviceHints?.ip ? hashSensitive(deviceHints.ip) : null,
          platform: deviceHints?.platform || null,
        },
      });
      
      logger.info('✅ Referral click tracked', {
        referralId: referralId.substring(0, 8),
        loopType,
      });
    }
    
    return { success: true, referralId };
  } catch (error: any) {
    logger.error('❌ Click tracking failed', { error: error.message });
    
    // Log to attribution failures for manual review
    await db.collection('attribution_failures').add({
      referralId,
      errorType: 'click_tracking_failed',
      error: error.message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    throw error;
  }
});

/**
 * Cloud Function: Associate referral with user on signup
 * Called by: Auth signup flow
 */
export const associateReferralOnSignup = async (
  userId: string,
  referralId?: string
) => {
  if (!referralId) return;
  
  try {
    const referralRef = db.collection('referrals').doc(referralId);
    const referralDoc = await referralRef.get();
    
    if (!referralDoc.exists) {
      logger.warn('⚠️ Referral not found on signup', { referralId });
      return;
    }
    
    const referral = referralDoc.data();
    
    // Update referral with user ID
    await referralRef.update({
      referredUserId: userId,
      status: 'signed_up',
      signedUpAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Update user document with referral metadata
    await db.doc(`users/${userId}`).update({
      referralId,
      referredBy: referral?.referrerId,
      referralLoopType: referral?.loopType,
    });
    
    logger.info('✅ Referral associated on signup', {
      userId: userId.substring(0, 8),
      referralId: referralId.substring(0, 8),
    });
  } catch (error: any) {
    logger.error('❌ Referral association failed', { error: error.message });
    
    // Log failure but don't block signup
    await db.collection('attribution_failures').add({
      userId,
      referralId,
      errorType: 'signup_association_failed',
      error: error.message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
};

/**
 * Admin endpoint: Query referrals for debugging
 */
export const getReferralChain = https.onCall(async (request) => {
  const { auth, data } = request;
  
  if (!auth) {
    throw new https.HttpsError('unauthenticated', 'Admin auth required');
  }
  
  // TODO: Add admin role check
  // if (!auth.token.admin) { throw ... }
  
  const { referrerId, status, limit = 50 } = data;
  
  try {
    let query = db.collection('referrals') as any;
    
    if (referrerId) {
      query = query.where('referrerId', '==', referrerId);
    }
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    query = query.orderBy('createdAt', 'desc').limit(limit);
    
    const snapshot = await query.get();
    const referrals = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    return { referrals, count: referrals.length };
  } catch (error: any) {
    logger.error('❌ Admin query failed', { error: error.message });
    throw new https.HttpsError('internal', 'Query failed');
  }
});

/**
 * Helper: Generate unique referral ID
 */
function generateReferralId(): string {
  return `ref_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}
```

---

### **Step 4: Frontend Client Integration (1.5 hours)**

#### 4.1 Create `app/src/services/growth/referralService.ts`
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as Device from 'expo-device';

const functions = getFunctions();
const REFERRAL_STORAGE_KEY = '@messageai_referral_context';

interface ReferralContext {
  referralId: string;
  loopType: string;
  signature: string;
  clickedAt: number;
}

/**
 * Create referral link (called when user shares)
 */
export async function createReferralLink(params: {
  loopType: string;
  targetType?: string;
  metadata?: any;
}): Promise<{ url: string; referralId: string }> {
  const createFn = httpsCallable(functions, 'createReferralLink');
  
  const result = await createFn(params);
  const data = result.data as any;
  
  return {
    url: data.url,
    referralId: data.referralId,
  };
}

/**
 * Handle incoming deep link (first app open)
 */
export async function handleDeepLink(url: string): Promise<void> {
  const parsed = Linking.parse(url);
  
  // Extract referral params from URL
  // Format: messageai://r/{referralId}?sig={signature}&loop={loopType}
  if (parsed.path?.startsWith('r/')) {
    const referralId = parsed.path.replace('r/', '');
    const signature = parsed.queryParams?.sig as string;
    const loopType = parsed.queryParams?.loop as string;
    
    if (referralId && signature && loopType) {
      // Store referral context for later (install-deferred)
      const context: ReferralContext = {
        referralId,
        loopType,
        signature,
        clickedAt: Date.now(),
      };
      
      await AsyncStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(context));
      
      // Track click
      await trackReferralClick(context);
    }
  }
}

/**
 * Track referral click
 */
async function trackReferralClick(context: ReferralContext): Promise<void> {
  const trackFn = httpsCallable(functions, 'trackReferralClick');
  
  const deviceHints = {
    deviceId: Device.osBuildId || Device.modelId,
    userAgent: Device.osName,
    platform: Device.osName === 'iOS' ? 'ios' : 'android',
  };
  
  await trackFn({
    referralId: context.referralId,
    loopType: context.loopType,
    signature: context.signature,
    deviceHints,
  });
}

/**
 * Get stored referral context (for signup attribution)
 */
export async function getReferralContext(): Promise<ReferralContext | null> {
  const stored = await AsyncStorage.getItem(REFERRAL_STORAGE_KEY);
  if (!stored) return null;
  
  const context = JSON.parse(stored) as ReferralContext;
  
  // Check if context is still valid (within 30 days)
  const age = Date.now() - context.clickedAt;
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  
  if (age > maxAge) {
    await AsyncStorage.removeItem(REFERRAL_STORAGE_KEY);
    return null;
  }
  
  return context;
}

/**
 * Clear referral context (after signup)
 */
export async function clearReferralContext(): Promise<void> {
  await AsyncStorage.removeItem(REFERRAL_STORAGE_KEY);
}
```

#### 4.2 Update `app/app/_layout.tsx` (First Launch Hook)
Add deep link listener:
```typescript
// Add to RootLayout component
useEffect(() => {
  // Listen for deep links (first app open)
  const subscription = Linking.addEventListener('url', async ({ url }) => {
    console.log('Deep link received:', url);
    await handleDeepLink(url);
  });
  
  // Check initial URL (cold start)
  Linking.getInitialURL().then(async (url) => {
    if (url) {
      console.log('Initial URL:', url);
      await handleDeepLink(url);
    }
  });
  
  return () => subscription.remove();
}, []);
```

#### 4.3 Update Signup Flow (Associate Referral)
In `app/app/(auth)/signup.tsx`:
```typescript
import { getReferralContext, clearReferralContext } from '@/services/growth/referralService';

// After successful signup
const context = await getReferralContext();
if (context) {
  // Backend will associate via associateReferralOnSignup
  // Clear local storage
  await clearReferralContext();
}
```

---

### **Step 5: Feature Flags (15 min)**

#### 5.1 Update `app/src/config/featureFlags.ts`
```typescript
export const GROWTH_FEATURE_FLAGS = {
  enabled: true, // Master kill-switch
  referralAttribution: {
    enabled: true,
    provider: 'custom' as 'firebase' | 'branch' | 'custom',
  },
};
```

---

### **Step 6: Export Functions (15 min)**

#### 6.1 Update `functions/src/index.ts`
Add exports:
```typescript
// Growth functions (PR15)
export {
  createReferralLink,
  trackReferralClick,
  getReferralChain,
} from './growth/referralHandler';
```

---

### **Step 7: Environment Setup (15 min)**

#### 7.1 Update `.env`
```
REFERRAL_SECRET_KEY=your-256-bit-secret-key-here
REFERRAL_BASE_URL=https://messageai.app/r
```

#### 7.2 Deploy Firestore Indexes
```bash
cd /Users/tahmeedrahim/Projects/MessageAI
firebase deploy --only firestore:indexes
```

#### 7.3 Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

---

### **Step 8: Testing (2 hours)**

#### 8.1 Create `functions/__tests__/referralHandler.test.ts`
```typescript
import { createReferralLink, verifyReferralLink } from '../src/utils/links';
import { generateHMAC } from '../src/utils/crypto';

describe('Referral Attribution', () => {
  describe('HMAC Signing', () => {
    it('generates consistent signatures', () => {
      const data = 'ref_123:tutor_card';
      const sig1 = generateHMAC(data);
      const sig2 = generateHMAC(data);
      expect(sig1).toBe(sig2);
    });
    
    it('detects tampering', () => {
      const data = 'ref_123:tutor_card';
      const sig = generateHMAC(data);
      
      // Tamper with data
      const tamperedData = 'ref_456:tutor_card';
      const isValid = verifyReferralLink('ref_456', 'tutor_card', sig);
      
      expect(isValid).toBe(false);
    });
  });
  
  describe('Link Generation', () => {
    it('generates valid links', async () => {
      const link = await createReferralLink({
        referralId: 'ref_test_123',
        referrerId: 'user_abc',
        loopType: 'tutor_card',
      });
      
      expect(link.url).toContain('ref_test_123');
      expect(link.url).toContain('sig=');
      expect(link.url).toContain('loop=tutor_card');
    });
  });
});
```

#### 8.2 Manual Testing Checklist
```
iOS Testing:
□ Click referral link → app opens
□ Install app → link context preserved
□ Complete signup → referral associated
□ Check Firestore: referral status = 'signed_up'

Android Testing:
□ Click referral link → app opens
□ Install app → link context preserved (Install Referrer)
□ Complete signup → referral associated
□ Check Firestore: referral status = 'signed_up'

Admin Testing:
□ Call getReferralChain → see all referrals
□ Query by referrerId → filtered results
□ Check attribution_failures collection → empty

Edge Cases:
□ Expired link (30+ days) → status = 'expired'
□ Invalid signature → error returned
□ No referral context on signup → no error
```

---

## 🚀 Deployment Steps

1. **Deploy Functions**
```bash
cd functions
npm run build
firebase deploy --only functions
```

2. **Deploy Firestore Rules & Indexes**
```bash
firebase deploy --only firestore
```

3. **Test in Staging**
- Enable feature flag: `GROWTH_FEATURE_FLAGS.referralAttribution.enabled = true`
- Generate test link
- Test attribution flow

4. **Enable in Production (5% rollout)**
- Set flag to 5% users
- Monitor error logs
- Check attribution accuracy

---

## 🔍 Monitoring & Metrics

**Key Metrics:**
- Link generation latency (P95 <100ms)
- Attribution accuracy (≥95%)
- Error rate (<1%)
- Deep link success rate (≥90%)

**Logs to Watch:**
- `attribution_failures` collection → manual review
- Cloud Functions logs → error rate
- Firestore writes → referral creation rate

**Alerts:**
- Attribution accuracy drops below 90%
- Error rate exceeds 5%
- Link generation P95 exceeds 200ms

---

## 📝 Rollback Plan

1. **Disable Feature Flag**
```typescript
GROWTH_FEATURE_FLAGS.referralAttribution.enabled = false;
```

2. **Revert Functions (if needed)**
```bash
firebase functions:delete createReferralLink
firebase functions:delete trackReferralClick
```

3. **Verify No Breaking Changes**
- App works without referral system
- Signup flow unaffected
- No errors in production

---

## ✅ Definition of Done

- [ ] All files created/modified
- [ ] Firestore rules & indexes deployed
- [ ] Functions deployed to Firebase
- [ ] Unit tests pass (≥80% coverage)
- [ ] Manual testing complete (iOS + Android)
- [ ] Attribution accuracy ≥95% in staging
- [ ] Feature flag tested (ON/OFF)
- [ ] Documentation updated
- [ ] Code reviewed & merged
- [ ] Deployed to production (5% rollout)

---

**Estimated Time:** 8-10 hours (1-2 days)  
**Next PR:** PR16 (Loop Orchestrator) - depends on referral types from PR15

