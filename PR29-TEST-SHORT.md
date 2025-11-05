# PR29 – Quick Test (5 min)

## 🧪 Test: Admin APIs Deployed

### **Step 1: Check Functions Deployed**
Go to Firebase Console → Functions:
https://console.firebase.google.com/project/messageai-88921/functions

**Expected Functions (8 new):**
- ✅ `getKFactorMetrics`
- ✅ `getFunnelMetrics`
- ✅ `getRetentionMetrics`
- ✅ `getFraudQueue`
- ✅ `approveFraudItem`
- ✅ `rejectFraudItem`
- ✅ `listKillSwitches`
- ✅ `toggleKillSwitch`

---

### **Step 2: Test Kill-Switch API (easiest test)**

Add this to your app or run in Firebase Console:

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const testKillSwitch = async () => {
  try {
    const listFn = httpsCallable(functions, 'listKillSwitches');
    const result = await listFn();
    console.log('✅ Kill-switches:', result.data);
  } catch (error) {
    console.error('❌ Error:', error);
  }
};
```

**Expected Response:**
```json
{
  "success": true,
  "flags": [
    { "name": "orchestrator", "enabled": true },
    { "name": "incentives", "enabled": true },
    { "name": "experiments", "enabled": true }
  ],
  "count": 3
}
```

---

### **Step 3: Test K-Factor Metrics (optional)**

```typescript
const testMetrics = async () => {
  try {
    const metricsFn = httpsCallable(functions, 'getKFactorMetrics');
    const result = await metricsFn({});
    console.log('✅ K-factor:', result.data);
  } catch (error) {
    console.error('❌ Error:', error);
  }
};
```

**Expected:** Empty array (no experiments with metrics yet)

---

## ✅ All Pass = PR29 Working!

**Note:** You need `admin: true` custom claim to test. If you get "permission-denied":

```bash
# Set admin claim (in Firebase Console or shell)
firebase functions:shell
admin.auth().setCustomUserClaims('YOUR_UID', { admin: true })
```

Then log out and back in.

---

## 🎯 Full Dashboard (Later)

When ready to build UI:
1. **Option A:** Use Retool (fastest) - see PR29-IMPLEMENTATION-PLAN.md
2. **Option B:** Build custom React admin panel

For now, APIs are ready to use! 🎉

