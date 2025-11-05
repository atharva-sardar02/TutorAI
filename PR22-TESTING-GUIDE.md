# PR22: Fraud Detection & Review - Testing Guide

**Version:** 1.0  
**Date:** November 5, 2025  
**Status:** Ready for Testing

---

## 🎯 Testing Objectives

1. **Validate Anomaly Scoring:** Ensure fraud detection accurately identifies suspicious behavior
2. **Test Captcha Flow:** Verify captcha challenges appear and work correctly
3. **Test Auto-Block:** Confirm high-risk users are automatically blocked
4. **Test Admin Review:** Validate fraud queue management for admins
5. **Performance Testing:** Ensure scoring latency <50ms

---

## 🧪 Test Scenarios

### **Scenario 1: Normal User (No Fraud Detection)**

**Goal:** Verify legitimate users pass through without friction

**Steps:**
1. Create a new user account via normal signup
2. Complete profile (name, photo)
3. Create 1-2 referral links
4. Wait 5 minutes, create another referral

**Expected Results:**
- ✅ No captcha challenge shown
- ✅ Anomaly score <50
- ✅ User can create referrals normally
- ✅ No fraud queue entry

**Firestore Validation:**
```bash
# Check anomaly score
firebase firestore:get /anomaly_scores/{userId}

# Expected output:
{
  userId: "...",
  score: 15-40,
  signals: { velocity: 0-20, device: 0-30, ip: 0-20, behavioral: 0-40 },
  autoBlock: false
}
```

---

### **Scenario 2: Moderate Velocity (Captcha Challenge)**

**Goal:** Verify captcha challenges for moderate risk

**Steps:**
1. Create a new user account
2. Rapidly create 25 referral links within 1 hour
3. Attempt to create another referral

**Expected Results:**
- ✅ Anomaly score 51-90
- ✅ Captcha modal appears
- ✅ After completing captcha, user can proceed
- ✅ User marked as `captchaVerified` in Firestore

**Firestore Validation:**
```bash
# Check anomaly score
firebase firestore:get /anomaly_scores/{userId}

# Expected: score 60-80 (velocity signal high)

# Check captcha verification
firebase firestore:get /users/{userId}

# Expected: captchaVerified: true, captchaVerifiedAt: <timestamp>
```

**Manual Test (Frontend):**
```typescript
// In app, trigger captcha
import { CaptchaModal } from '@/components/growth/CaptchaModal';
import { verifyCaptcha } from '@/services/growth/fraudService';

const [showCaptcha, setShowCaptcha] = useState(true);

<CaptchaModal
  visible={showCaptcha}
  onVerify={async (token) => {
    await verifyCaptcha(token);
    setShowCaptcha(false);
    console.log('Captcha verified!');
  }}
  onClose={() => setShowCaptcha(false)}
/>
```

---

### **Scenario 3: High Velocity (Auto-Block)**

**Goal:** Verify auto-block for extreme referral spam

**Steps:**
1. Create a new user account
2. Rapidly create 60+ referral links within 1 hour
3. Attempt to create another referral

**Expected Results:**
- ✅ Anomaly score ≥91
- ✅ User auto-blocked (HttpsError 'permission-denied')
- ✅ Referral queued for admin review
- ✅ Fraud queue entry created

**Firestore Validation:**
```bash
# Check anomaly score
firebase firestore:get /anomaly_scores/{userId}

# Expected: score ≥91, autoBlock: true

# Check fraud queue
firebase firestore:list /fraud_queue
firebase firestore:get /fraud_queue/{queueId}

# Expected:
{
  queueId: "fraud_...",
  userId: "...",
  referralId: "...",
  anomalyScore: { score: 91-100, ... },
  status: "pending",
  createdAt: <timestamp>
}
```

**Error Response:**
```
HttpsError: permission-denied
Message: "Account flagged for review"
```

---

### **Scenario 4: Device Reuse (Multi-Accounting)**

**Goal:** Detect multiple accounts from same device

**Steps:**
1. Create 4 user accounts from the same device
2. Each account creates 10 referrals
3. Create a 5th account on the same device

**Expected Results:**
- ✅ 5th account gets high device signal score
- ✅ Anomaly score 60-90 (device signal = 70-100)
- ✅ Captcha challenge appears (if enabled)
- ✅ If 6th account created, auto-blocked

**Firestore Validation:**
```bash
# Check device mappings
firebase firestore:query /device_mappings --where deviceHash == "hash..."

# Expected: 5 documents (5 users on same device)

# Check anomaly score for 5th user
firebase firestore:get /anomaly_scores/{user5Id}

# Expected: signals.device: 70-100
```

**Manual Test (Backend):**
```typescript
import { recordDeviceMapping, getUsersForDevice } from './fraud/deviceClustering';

// Record device mappings
await recordDeviceMapping('user1', 'device-abc-123');
await recordDeviceMapping('user2', 'device-abc-123');
await recordDeviceMapping('user3', 'device-abc-123');
await recordDeviceMapping('user4', 'device-abc-123');

// Check users for device
const users = await getUsersForDevice('device-abc-123');
console.log(`${users.length} accounts on device`); // Expected: 4
```

---

### **Scenario 5: IP Subnet Clustering**

**Goal:** Detect coordinated signups from same subnet

**Steps:**
1. Simulate 15 user signups from IP addresses in same /24 subnet within 1 hour
   - Example: 192.168.1.10, 192.168.1.11, 192.168.1.12, ...
2. Create 16th user from same subnet

**Expected Results:**
- ✅ 16th user gets high IP signal score
- ✅ Anomaly score 50-80 (IP signal = 60)
- ✅ Captcha challenge may appear
- ✅ If 21st signup, IP signal = 100

**Firestore Validation:**
```bash
# Check IP signups
firebase firestore:query /ip_signups --where subnetHash == "hash..."

# Expected: 15+ documents

# Check anomaly score for 16th user
firebase firestore:get /anomaly_scores/{user16Id}

# Expected: signals.ip: 60-100
```

**Manual Test (Backend):**
```typescript
import { recordIpSignup, isSubnetSuspicious } from './fraud/ipClustering';

// Simulate subnet activity
for (let i = 0; i < 15; i++) {
  await recordIpSignup(`user${i}`, `192.168.1.${i + 10}`);
}

// Check if subnet is suspicious
const suspicious = await isSubnetSuspicious('192.168.1.50');
console.log(`Subnet suspicious: ${suspicious}`); // Expected: true
```

---

### **Scenario 6: Behavioral Signals (Bot-Like)**

**Goal:** Detect bots with unnatural interaction patterns

**Steps:**
1. Create a new user account
2. Do NOT complete profile (leave displayName and photoURL empty)
3. Within 30 seconds of signup, create a referral link

**Expected Results:**
- ✅ High behavioral signal score
- ✅ Behavioral score: 40 (empty profile) + 60 (instant referral) = 100
- ✅ Overall anomaly score elevated (behavioral contributes 10%)
- ✅ Combined with other signals, may trigger captcha

**Firestore Validation:**
```bash
# Check user profile
firebase firestore:get /users/{userId}

# Expected: displayName: null or "", photoURL: null or ""

# Check referral creation time
firebase firestore:query /referrals --where referrerId == {userId} --orderBy createdAt

# Expected: createdAt within 1 minute of user.createdAt
```

---

### **Scenario 7: Admin Fraud Queue Review (Approve)**

**Goal:** Verify admin can approve flagged users

**Prerequisites:**
- User flagged and queued (from Scenario 3)
- Admin account with `admin: true` custom claim

**Steps:**
1. Admin logs in
2. Fetch fraud queue items:
   ```typescript
   const queueSnapshot = await db.collection('fraud_queue')
     .where('status', '==', 'pending')
     .get();
   ```
3. Call `approveFraudItem`:
   ```typescript
   import { httpsCallable } from 'firebase/functions';
   
   const approve = httpsCallable(functions, 'approveFraudItem');
   await approve({
     queueId: 'fraud_...',
     notes: 'Legitimate user, false positive'
   });
   ```

**Expected Results:**
- ✅ Queue item status updated to 'approved'
- ✅ Reviewed by admin ID recorded
- ✅ Timestamp recorded
- ✅ Notes saved

**Firestore Validation:**
```bash
# Check queue item
firebase firestore:get /fraud_queue/{queueId}

# Expected:
{
  status: "approved",
  reviewedBy: "{adminUserId}",
  reviewedAt: <timestamp>,
  reviewNotes: "Legitimate user, false positive"
}
```

---

### **Scenario 8: Admin Fraud Queue Review (Reject + Ban)**

**Goal:** Verify admin can reject and ban fraudulent users

**Steps:**
1. Admin logs in
2. Call `rejectFraudItem` with `banUser: true`:
   ```typescript
   const reject = httpsCallable(functions, 'rejectFraudItem');
   await reject({
     queueId: 'fraud_...',
     banUser: true,
     notes: 'Confirmed fraud, multi-accounting'
   });
   ```

**Expected Results:**
- ✅ Queue item status updated to 'banned'
- ✅ User added to `/banned_users` collection
- ✅ Ban reason and admin ID recorded

**Firestore Validation:**
```bash
# Check queue item
firebase firestore:get /fraud_queue/{queueId}

# Expected: status: "banned"

# Check banned users
firebase firestore:get /banned_users/{userId}

# Expected:
{
  bannedAt: <timestamp>,
  bannedBy: "{adminUserId}",
  reason: "Confirmed fraud, multi-accounting",
  referralId: "..."
}
```

---

### **Scenario 9: Performance Test (Scoring Latency)**

**Goal:** Ensure anomaly scoring completes in <50ms

**Test Script:**
```typescript
import { computeAnomalyScore } from './fraud/anomalyDetector';

const iterations = 100;
const latencies: number[] = [];

for (let i = 0; i < iterations; i++) {
  const start = Date.now();
  
  await computeAnomalyScore('test-user-id', {
    deviceId: 'test-device',
    ipAddress: '192.168.1.100',
    userAgent: 'test-agent',
    action: 'signup',
  });
  
  const latency = Date.now() - start;
  latencies.push(latency);
}

// Calculate P50, P95, P99
latencies.sort((a, b) => a - b);
const p50 = latencies[Math.floor(iterations * 0.5)];
const p95 = latencies[Math.floor(iterations * 0.95)];
const p99 = latencies[Math.floor(iterations * 0.99)];

console.log(`P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms`);
```

**Expected Results:**
- ✅ P50 <30ms
- ✅ P95 <50ms
- ✅ P99 <100ms

---

## 🔧 Manual Testing Tools

### Test User Creation Script

```bash
# Create test users with controlled anomaly signals
cd /Users/tahmeedrahim/Projects/MessageAI/functions

node -e "
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function createTestUsers() {
  // Normal user
  await db.collection('users').doc('test-normal-user').set({
    displayName: 'Normal User',
    photoURL: 'https://example.com/photo.jpg',
    createdAt: admin.firestore.Timestamp.now(),
  });
  
  // Bot-like user (empty profile)
  await db.collection('users').doc('test-bot-user').set({
    displayName: '',
    photoURL: '',
    createdAt: admin.firestore.Timestamp.now(),
  });
  
  console.log('Test users created!');
}

createTestUsers();
"
```

### Fraud Queue Viewer Script

```bash
# View fraud queue items
firebase firestore:query /fraud_queue --where status == "pending" --limit 10
```

### Clear Test Data Script

```bash
# Clean up test anomaly scores
firebase firestore:delete-collection /anomaly_scores --batch-size 100

# Clean up test fraud queue
firebase firestore:delete-collection /fraud_queue --batch-size 100

# Clean up test device mappings
firebase firestore:delete-collection /device_mappings --batch-size 100

# Clean up test IP signups
firebase firestore:delete-collection /ip_signups --batch-size 100
```

---

## 📊 Test Coverage Matrix

| Component | Unit Tests | Integration Tests | Manual Tests |
|-----------|------------|-------------------|--------------|
| Anomaly Detector | ⏳ Pending | ⏳ Pending | ✅ Ready |
| Device Clustering | ⏳ Pending | ⏳ Pending | ✅ Ready |
| IP Clustering | ⏳ Pending | ⏳ Pending | ✅ Ready |
| Captcha Handler | ⏳ Pending | ⏳ Pending | ✅ Ready |
| Fraud Queue | ⏳ Pending | ⏳ Pending | ✅ Ready |
| CaptchaModal (UI) | ⏳ Pending | N/A | ✅ Ready |
| Fraud Service | ⏳ Pending | ⏳ Pending | ✅ Ready |

---

## ✅ Acceptance Criteria

### Functional
- [ ] Normal users (score <50) pass through without friction
- [ ] Moderate risk users (score 71-90) receive captcha challenge
- [ ] High risk users (score ≥91) are auto-blocked
- [ ] Fraudulent users queued for admin review
- [ ] Admin can approve/reject/ban users
- [ ] Banned users cannot create referrals

### Performance
- [ ] Anomaly scoring latency <50ms (P95)
- [ ] Captcha verification latency <2s
- [ ] False positive rate <1%

### Security
- [ ] Device IDs hashed before storage
- [ ] IP addresses hashed before storage
- [ ] Admin-only access to fraud queue
- [ ] Audit logs for all admin actions

---

## 🐛 Known Issues & Limitations

### Current Limitations
1. **No Admin UI:** Fraud queue review requires manual Firebase Console access or custom scripts
2. **No Emulator Detection:** Only basic device reuse detection (no root/jailbreak checks)
3. **No VPN Detection:** IP clustering doesn't distinguish VPNs from abuse
4. **No Machine Learning:** Static thresholds (not adaptive based on patterns)

### Future Enhancements (Not in PR22)
- Admin Dashboard UI (PR29)
- Advanced device fingerprinting
- VPN/proxy detection
- Adaptive thresholds via ML
- Real-time fraud alerts

---

## 📝 Test Execution Checklist

### Pre-Deployment Tests
- [ ] Deploy Firestore rules and indexes
- [ ] Deploy Cloud Functions (verifyCaptcha, approveFraudItem, rejectFraudItem)
- [ ] Set HCAPTCHA_SECRET environment variable
- [ ] Verify feature flags enabled

### Manual Testing
- [ ] Scenario 1: Normal User (No Fraud)
- [ ] Scenario 2: Moderate Velocity (Captcha)
- [ ] Scenario 3: High Velocity (Auto-Block)
- [ ] Scenario 4: Device Reuse (Multi-Accounting)
- [ ] Scenario 5: IP Subnet Clustering
- [ ] Scenario 6: Behavioral Signals (Bot-Like)
- [ ] Scenario 7: Admin Approve
- [ ] Scenario 8: Admin Reject + Ban
- [ ] Scenario 9: Performance Test

### Integration Testing (Pending)
- [ ] Referral handler integration
- [ ] Metrics computation integration
- [ ] End-to-end signup → fraud detection → captcha → approval

---

## 🔗 Related Documentation

- `PR22-SUMMARY.md` - Implementation details
- `PR15-SUMMARY.md` - Referral attribution system
- `PR29-SUMMARY.md` - Growth Ops Dashboard (fraud queue UI)

---

**Testing Guide Version:** 1.0  
**Last Updated:** November 5, 2025  
**Status:** ✅ Ready for Manual Testing

