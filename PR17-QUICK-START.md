# PR17 Quick Start – Create Your First Experiment

---

## 🚀 5-Minute Setup

### **Step 1: Set Admin Custom Claim**

First, give yourself admin access:

```bash
# In Firebase Console or via script
firebase functions:shell

# Then in shell:
admin.auth().setCustomUserClaims('YOUR_USER_UID', { admin: true })
```

**Verify:** Log out and log back in to refresh your token.

---

### **Step 2: Create First Experiment**

Add this to your app's test button or run via Firebase Console:

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

const createFirstExperiment = async () => {
  try {
    const createExperimentFn = httpsCallable(functions, 'createExperiment');
    const result = await createExperimentFn({
      name: 'Tutor Card Copy Test',
      description: 'Test original vs enthusiastic copy',
      loopType: 'tutor_card',
      variants: [
        {
          variantId: 'control',
          name: 'Original Copy',
          allocationPct: 50,
        },
        {
          variantId: 'variant_a',
          name: 'Enthusiastic Copy',
          allocationPct: 50,
        },
      ],
      guardrails: {
        maxSpamRate: 0.005,    // 0.5%
        maxOptOutRate: 0.01,   // 1%
        maxCostMultiplier: 1.2, // 120%
      },
    });
    
    console.log('✅ Experiment created:', result.data);
    return result.data.experimentId;
  } catch (error) {
    console.error('❌ Error:', error);
  }
};
```

---

### **Step 3: Activate Experiment**

```typescript
const activateExperiment = async (experimentId: string) => {
  try {
    const updateExperimentFn = httpsCallable(functions, 'updateExperiment');
    await updateExperimentFn({
      experimentId,
      status: 'active',
    });
    
    console.log('✅ Experiment activated');
  } catch (error) {
    console.error('❌ Error:', error);
  }
};
```

---

### **Step 4: Test Variant Allocation**

Click "Test PR16 Orchestrator" in your app. Check the response:

```typescript
{
  shouldShow: true,
  loopType: "tutor_card",
  experimentId: "exp_...",    // ← Your experiment ID
  variantId: "control",        // ← Your assigned variant
  rationale: "Eligible: tutor_card, variant: control"
}
```

**Verify:**
- Same user always gets same variant (click 3x)
- Different users get different variants (test with 2-3 accounts)

---

### **Step 5: Check Event Logging**

Go to Firestore → `/experiment_events` → Find your userId

**Expected:**
```
{
  eventType: "loop_exposed",
  userId: "YOUR_USER_ID",
  loopType: "tutor_card",
  experimentId: "exp_...",
  variantId: "control",
  timestamp: <recent>
}
```

---

### **Step 6: List Experiments (Verify)**

```typescript
const listExperiments = async () => {
  try {
    const listExperimentsFn = httpsCallable(functions, 'listExperiments');
    const result = await listExperimentsFn();
    
    console.log('📊 Experiments:', result.data.experiments);
  } catch (error) {
    console.error('❌ Error:', error);
  }
};
```

---

## ⏰ Scheduled Jobs

### **K-Factor Computation**
- **Schedule:** Daily at 2am UTC
- **Manual trigger:** Cloud Console → Cloud Scheduler → `computeKFactor` → Force Run
- **Check results:** Firestore → `/experiment_metrics/{experimentId}/variants/{variantId}/daily/{date}`

### **Guardrails Check**
- **Schedule:** Every hour
- **Manual trigger:** Cloud Console → Cloud Scheduler → `checkGuardrails` → Force Run
- **Check results:** Cloud Functions logs

---

## 📊 Next Steps

1. **Add more events:** When users send invites, log `invite_sent` event
2. **Track joins:** When new users sign up, log `join_completed` event
3. **Wait 24h:** K-factor will be computed automatically
4. **Review metrics:** Check `/experiment_metrics` for K-factor data
5. **Iterate:** Create new experiments with different copy/design

---

## 🎯 Common Use Cases

### **Test Copy Variants**
```typescript
variants: [
  { variantId: 'short_copy', name: 'Short CTA', allocationPct: 33 },
  { variantId: 'long_copy', name: 'Long CTA', allocationPct: 33 },
  { variantId: 'emoji_copy', name: 'Emoji CTA', allocationPct: 34 },
]
```

### **Test Incentive Amounts**
```typescript
variants: [
  {
    variantId: 'low_reward',
    name: '50 XP',
    allocationPct: 50,
    metadata: { xpAmount: 50 },
  },
  {
    variantId: 'high_reward',
    name: '100 XP',
    allocationPct: 50,
    metadata: { xpAmount: 100 },
  },
]
```

---

## 🚨 Troubleshooting

### **Error: "permission-denied"**
- Check that you have `admin: true` custom claim
- Log out and log back in to refresh token

### **Error: "Allocation percentages must sum to 100"**
- Verify variant allocations add up to exactly 100

### **No events logged**
- Check orchestrator is returning `experimentId` and `variantId`
- Verify Firestore rules allow function writes

### **K-factor always 0**
- Normal if no actual invites/joins yet
- Wait for real user activity

---

**Done!** You now have a working A/B testing system. 🎉

**Next:** Build viral surfaces (PR18, PR19) and test different variants!

