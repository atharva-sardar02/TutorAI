# PR15 Deployment Guide

## 🔧 Environment Variables

### **Backend (Cloud Functions)**

Add to `/functions/.env`:
```bash
# Referral Attribution (PR15)
REFERRAL_SECRET_KEY=your-256-bit-secret-key-change-in-production
REFERRAL_BASE_URL=https://messageai.app/r

# Optional: Branch.io (if using)
BRANCH_KEY=your-branch-key-here
```

**Generate Secret Key:**
```bash
# Generate a secure 256-bit key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### **Frontend (Expo App)**

Add to `/app/.env`:
```bash
# No additional env vars needed for PR15
# Deep links configured in app.json
```

---

## 📱 Deep Link Configuration

### **1. Update `app.json`**

Add deep link scheme:
```json
{
  "expo": {
    "scheme": "messageai",
    "ios": {
      "bundleIdentifier": "com.yourcompany.messageai",
      "associatedDomains": ["applinks:messageai.app"]
    },
    "android": {
      "package": "com.yourcompany.messageai",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "messageai.app",
              "pathPrefix": "/r"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

### **2. iOS Universal Links (Production)**

Create `/.well-known/apple-app-site-association` on your domain:
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.yourcompany.messageai",
        "paths": ["/r/*"]
      }
    ]
  }
}
```

### **3. Android App Links (Production)**

Create `/.well-known/assetlinks.json` on your domain:
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.yourcompany.messageai",
      "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
    }
  }
]
```

---

## 🚀 Deployment Steps

### **Step 1: Deploy Firestore Rules & Indexes**

```bash
cd /Users/tahmeedrahim/Projects/MessageAI

# Deploy rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes

# Wait for indexes to build (check Firebase Console)
# Typically takes 5-10 minutes
```

### **Step 2: Set Environment Variables**

```bash
# Set secret key in Firebase Functions config
firebase functions:secrets:set REFERRAL_SECRET_KEY

# Or use .env file for local development
cd functions
echo "REFERRAL_SECRET_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" >> .env
echo "REFERRAL_BASE_URL=https://messageai.app/r" >> .env
```

### **Step 3: Deploy Cloud Functions**

```bash
cd functions

# Install dependencies (if not already)
npm install

# Build TypeScript
npm run build

# Deploy growth functions only
firebase deploy --only functions:createReferralLink,functions:trackReferralClick,functions:getReferralChain

# Or deploy all functions
firebase deploy --only functions
```

### **Step 4: Test in Staging**

```bash
# Run local emulator for testing
cd /Users/tahmeedrahim/Projects/MessageAI
firebase emulators:start

# In another terminal, run the app
cd app
npm start

# Test flow:
# 1. Create referral link in app
# 2. Open link in browser
# 3. Verify attribution in Firestore emulator
```

### **Step 5: Enable Feature Flag**

In `app/src/config/featureFlags.ts`:
```typescript
export const GROWTH_FEATURE_FLAGS = {
  enabled: true,
  referralAttribution: {
    enabled: true, // ← Set to true
    provider: 'custom',
  },
  // ...
};
```

### **Step 6: Deploy Mobile App (Gradual Rollout)**

```bash
cd app

# Build and submit to app stores
# iOS
eas build --platform ios --profile production
eas submit --platform ios

# Android
eas build --platform android --profile production
eas submit --platform android
```

---

## ✅ Post-Deployment Verification

### **1. Check Firestore Indexes**

Firebase Console → Firestore → Indexes

Verify these indexes are **enabled**:
- `referrals` → `referrerId`, `status`, `createdAt`
- `referrals` → `referredUserId`, `createdAt`
- `referrals` → `status`, `expiresAt`

### **2. Test Referral Link Generation**

```bash
# Call Cloud Function
curl -X POST https://us-central1-YOUR-PROJECT.cloudfunctions.net/createReferralLink \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "loopType": "tutor_card",
    "targetType": "parent",
    "metadata": {"channel": "test"}
  }'

# Expected response:
# {
#   "referralId": "ref_1730000000_abc123",
#   "url": "https://messageai.app/r/ref_1730000000_abc123?sig=...&loop=tutor_card",
#   "provider": "custom"
# }
```

### **3. Test Attribution Chain**

1. **Generate link** → Check Firestore: `/referrals/{id}` status = `pending`
2. **Click link** → Check Firestore: status = `clicked`, `clickedAt` timestamp
3. **Sign up** → Check Firestore: status = `signed_up`, `referredUserId` populated
4. **User profile** → Check `/users/{uid}` has `referralId`, `referredBy`

### **4. Monitor Logs**

```bash
# View Cloud Functions logs
firebase functions:log --only createReferralLink,trackReferralClick

# Check for errors
firebase functions:log | grep ERROR

# Check attribution failures
firebase firestore:get /attribution_failures --limit 10
```

---

## 🔄 Rollback Plan

### **Option 1: Disable Feature Flag**

```typescript
// app/src/config/featureFlags.ts
export const GROWTH_FEATURE_FLAGS = {
  enabled: false, // ← Disable all growth features
  // ...
};
```

Redeploy app: `eas update` (OTA update)

### **Option 2: Revert Cloud Functions**

```bash
# List function versions
firebase functions:list

# Delete growth functions
firebase functions:delete createReferralLink --force
firebase functions:delete trackReferralClick --force
firebase functions:delete getReferralChain --force
```

### **Option 3: Revert Firestore Rules**

```bash
# Backup current rules
firebase firestore:rules get > firestore.rules.backup

# Restore previous version from git
git checkout HEAD~1 -- firestore.rules

# Deploy
firebase deploy --only firestore:rules
```

---

## 📊 Monitoring Dashboard

### **Key Metrics to Watch**

1. **Link Generation Rate**
   - Query: `/referrals` count per day
   - Target: >0 (baseline for MVP)

2. **Attribution Accuracy**
   - Formula: `signed_up` / `clicked` × 100%
   - Target: ≥95%

3. **Error Rate**
   - Query: `/attribution_failures` count per day
   - Target: <1%

4. **Latency**
   - Cloud Functions logs → P95 latency
   - Target: <100ms for link generation

### **Firestore Queries**

```javascript
// Count referrals by status
db.collection('referrals')
  .where('status', '==', 'signed_up')
  .where('createdAt', '>=', /* 7 days ago */)
  .count()
  .get()

// Attribution failures (last 24h)
db.collection('attribution_failures')
  .where('timestamp', '>=', /* 24h ago */)
  .orderBy('timestamp', 'desc')
  .limit(50)
  .get()

// Admin query (specific user)
db.collection('referrals')
  .where('referrerId', '==', 'USER_ID')
  .orderBy('createdAt', 'desc')
  .limit(20)
  .get()
```

---

## 🚨 Troubleshooting

### **Issue: Deep links not working on iOS**

**Solution:**
1. Verify `associatedDomains` in `app.json`
2. Check `.well-known/apple-app-site-association` is accessible
3. Rebuild app after changing scheme

### **Issue: "Invalid signature" errors**

**Solution:**
1. Verify `REFERRAL_SECRET_KEY` is set correctly
2. Check Cloud Functions environment: `firebase functions:config:get`
3. Regenerate links after changing key

### **Issue: Firestore permission denied**

**Solution:**
1. Check Firestore rules are deployed: `firebase deploy --only firestore:rules`
2. Verify user is authenticated
3. Check indexes are enabled (Firebase Console)

### **Issue: Attribution not working on signup**

**Solution:**
1. Check `associateReferralOnSignup` is called in signup flow
2. Verify referral context stored in AsyncStorage
3. Check `/attribution_failures` collection for errors

---

## 📝 Next Steps (After PR15)

- [ ] **PR16**: Implement Loop Orchestrator (depends on referral types)
- [ ] **PR17**: Add A/B experimentation framework
- [ ] **PR18**: Build first viral loop (Tutor Cards)
- [ ] **PR22**: Add fraud detection (depends on device hints)
- [ ] **PR29**: Build admin dashboard for debugging

---

**Status:** PR15 Ready for Deployment ✅  
**Estimated Deployment Time:** 30-45 minutes  
**Rollback Time:** <5 minutes (feature flag toggle)

