# PR22: Fraud Detection - Deployment Guide

**Date:** November 5, 2025  
**Status:** Ready for Deployment

---

## 🚀 Quick Deployment Steps

### 1. Deploy Firestore Configuration

```bash
cd /Users/tahmeedrahim/Projects/MessageAI

# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Wait for indexes to build (check Firebase Console)
```

**Verification:**
```bash
# Check rules deployed
firebase firestore:rules

# Check indexes status
firebase firestore:indexes
```

---

### 2. Set Environment Variables

```bash
# Set hCaptcha secret for Cloud Functions
firebase functions:secrets:set HCAPTCHA_SECRET

# When prompted, enter your hCaptcha secret key
# Get this from https://dashboard.hcaptcha.com/
```

**For local development:**
```bash
cd /Users/tahmeedrahim/Projects/MessageAI/functions

# Create .env file
echo "HCAPTCHA_SECRET=your-secret-key-here" >> .env
```

---

### 3. Deploy Cloud Functions

```bash
cd /Users/tahmeedrahim/Projects/MessageAI/functions

# Build TypeScript
npm run build

# Deploy fraud detection functions
firebase deploy --only functions:verifyCaptcha,functions:approveFraudItem,functions:rejectFraudItem

# Wait for deployment to complete (~2-3 minutes)
```

**Verification:**
```bash
# Check function deployment status
firebase functions:list | grep -E "(verifyCaptcha|approveFraudItem|rejectFraudItem)"

# Expected output:
# verifyCaptcha (gen2, https)
# approveFraudItem (gen2, https)
# rejectFraudItem (gen2, https)
```

---

### 4. Configure React Native App

```bash
cd /Users/tahmeedrahim/Projects/MessageAI/app

# Set hCaptcha site key (if not already in .env)
echo "EXPO_PUBLIC_HCAPTCHA_SITE_KEY=your-site-key-here" >> .env

# No rebuild needed - feature flags control rollout
```

**Get hCaptcha Site Key:**
- Sign up at https://dashboard.hcaptcha.com/
- Create a new site
- Copy the Site Key

---

## ✅ Post-Deployment Verification

### 1. Test Cloud Functions

```bash
# Test verifyCaptcha function (will fail without valid token, but should return proper error)
curl -X POST https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/verifyCaptcha \
  -H "Content-Type: application/json" \
  -d '{"token": "test"}'

# Expected: 401 Unauthenticated error (function is deployed)
```

### 2. Check Firestore Rules

```bash
# Try to read anomaly_scores without auth (should fail)
firebase firestore:get /anomaly_scores/test-user

# Expected: Permission denied error (rules working)
```

### 3. Verify Feature Flags

```typescript
// In React Native app
import { GROWTH_FEATURE_FLAGS } from '@/config/featureFlags';

console.log('Fraud detection enabled:', GROWTH_FEATURE_FLAGS.fraud.detectionEnabled);
// Expected: true
```

---

## 🔧 Rollback Plan

If issues arise, rollback in reverse order:

### 1. Disable Feature Flags (Fastest)

```typescript
// app/src/config/featureFlags.ts
fraud: {
  detectionEnabled: false, // Disable fraud detection
  captchaEnabled: false,
  // ...
}
```

### 2. Rollback Cloud Functions

```bash
cd /Users/tahmeedrahim/Projects/MessageAI/functions

# List function versions
firebase functions:log --only verifyCaptcha

# Rollback to previous version (if needed)
# Note: Manual rollback via Firebase Console is recommended
```

### 3. Rollback Firestore Rules (If Needed)

```bash
# Restore previous rules from git
git checkout HEAD~1 -- firestore.rules

# Deploy restored rules
firebase deploy --only firestore:rules
```

---

## 📊 Monitoring After Deployment

### Key Metrics to Watch (First 24 Hours)

1. **Cloud Function Errors**
   ```bash
   firebase functions:log --only verifyCaptcha --limit 50
   firebase functions:log --only approveFraudItem --limit 50
   firebase functions:log --only rejectFraudItem --limit 50
   ```

2. **Firestore Write Errors**
   - Check Firebase Console → Firestore → Usage tab
   - Look for permission denied errors

3. **Fraud Detection Rate**
   ```bash
   # Check anomaly scores created
   firebase firestore:query /anomaly_scores --orderBy timestamp desc --limit 10
   
   # Check fraud queue items
   firebase firestore:query /fraud_queue --where status == "pending"
   ```

### Alert Thresholds

- **Function Error Rate:** >5% errors
- **Fraud Rate:** >10% of signups flagged (may indicate false positives)
- **Queue Backlog:** >50 pending items

---

## 🐛 Troubleshooting

### Issue: "HCAPTCHA_SECRET not set" Error

**Solution:**
```bash
# Verify secret is set
firebase functions:secrets:access HCAPTCHA_SECRET

# If not set, add it
firebase functions:secrets:set HCAPTCHA_SECRET
```

### Issue: Firestore Index Not Found

**Symptom:** Query errors like "The query requires an index"

**Solution:**
```bash
# Redeploy indexes
firebase deploy --only firestore:indexes

# Check index build status in Firebase Console
# Wait for "Enabled" status (can take 5-15 minutes)
```

### Issue: Permission Denied Errors

**Symptom:** Users can't read their own anomaly scores

**Solution:**
```bash
# Verify rules deployed correctly
firebase firestore:rules

# Check rule for /anomaly_scores/{userId}
# Should allow read if request.auth.uid == userId
```

### Issue: Captcha Modal Not Showing

**Symptom:** High anomaly score but no captcha challenge

**Solution:**
1. Check feature flag: `GROWTH_FEATURE_FLAGS.fraud.captchaEnabled = true`
2. Verify `EXPO_PUBLIC_HCAPTCHA_SITE_KEY` set in app `.env`
3. Check frontend integration (CaptchaModal import)

---

## 📋 Deployment Checklist

### Pre-Deployment
- [x] Code review completed
- [x] Linter errors resolved
- [x] TypeScript compilation successful
- [ ] Manual testing completed (see PR22-TESTING-GUIDE.md)

### Deployment
- [ ] Firestore rules deployed
- [ ] Firestore indexes deployed (and built)
- [ ] Environment variables set (HCAPTCHA_SECRET)
- [ ] Cloud Functions deployed (verifyCaptcha, approveFraudItem, rejectFraudItem)
- [ ] React Native app configured (EXPO_PUBLIC_HCAPTCHA_SITE_KEY)

### Post-Deployment
- [ ] Smoke tests passed (function invocations)
- [ ] Firestore rules verified (permission tests)
- [ ] Feature flags enabled
- [ ] Monitoring dashboards configured
- [ ] Team notified of deployment

---

## 🔗 Related Documentation

- `PR22-SUMMARY.md` - Implementation details
- `PR22-TESTING-GUIDE.md` - Test scenarios
- `VIRAL-GROWTH-ROADMAP.md` - Overall roadmap

---

## 📞 Support

If you encounter issues during deployment:

1. Check Firebase Console logs
2. Review this troubleshooting guide
3. Check git history for recent changes
4. Escalate to team lead if unresolved

---

**Deployment Guide Version:** 1.0  
**Last Updated:** November 5, 2025  
**Status:** ✅ Ready for Production Deployment

