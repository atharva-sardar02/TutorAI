# PR19: Progress Reels - Deployment Checklist

## Pre-Deployment Verification

### Code Review
- [  ] All linter errors resolved
- [  ] TypeScript types consistent across frontend and backend
- [  ] PII redaction tests passing (15+ test cases)
- [  ] No hardcoded credentials or sensitive data

### Configuration Files
- [  ] `firestore.rules` - Consent and reel rules added
- [  ] `firestore.indexes.json` - Reel indexes added
- [  ] `app/src/config/featureFlags.ts` - progressReel enabled
- [  ] `functions/src/index.ts` - onConsentRevoked exported

---

## Deployment Steps

### 1. Deploy Firestore Configuration
```bash
# Deploy rules (protects consents and reels)
firebase deploy --only firestore:rules

# Deploy indexes (optimizes reel queries)
firebase deploy --only firestore:indexes
```

**Verification:**
- Check Firebase Console > Firestore > Rules
- Check Firebase Console > Firestore > Indexes
- Wait for indexes to build (may take 5-10 minutes)

### 2. Deploy Cloud Functions
```bash
cd functions

# Install dependencies (if not already)
npm install

# Run tests
npm test

# Deploy functions
firebase deploy --only functions
```

**Functions Deployed:**
- `onConsentRevoked` - Firestore trigger (users/{userId} onUpdate)

**Verification:**
```bash
# Check function logs
firebase functions:log --only onConsentRevoked

# Verify function exists
firebase functions:list | grep onConsentRevoked
```

### 3. Deploy Frontend (Expo)
```bash
cd app

# Install dependencies (if not already)
pnpm install

# Build and deploy
eas update --branch production --message "PR19: Progress Reels"
```

**Verification:**
- Check EAS dashboard for successful update
- Verify feature flag: `progressReel.enabled = true`

---

## Post-Deployment Testing

### Quick Smoke Test (5 minutes)

1. **Test Consent Flow**
   - Open app on test device
   - Navigate to consent screen (TODO: add manual trigger)
   - Grant consent
   - Verify Firestore: `users/{userId}.consents.progressSharing = true`

2. **Test Reel Generation**
   - Create mock session summary with qualityScore >= 80
   - Trigger `afterSummary` function
   - Check logs: "✅ Progress reel generated successfully"
   - Verify Firestore: `/reels/{reelId}` exists

3. **Test Reel Viewer**
   - Tap notification or manually navigate to `/progressReel?reelId={id}`
   - Verify carousel displays all slides
   - Test share button (native sheet should open)

4. **Test Consent Revocation**
   - Revoke consent: Update `users/{userId}.consents.progressSharing = false`
   - Wait 5 seconds
   - Check logs: "✅ Reels deleted after consent revocation"
   - Verify Firestore: No reels for user

### Full Testing (2-3 hours)
- Follow `PR19-TESTING-GUIDE.md`

---

## Monitoring Setup

### Cloud Functions Logs
```bash
# Monitor consent revocation
firebase functions:log --only onConsentRevoked

# Monitor action execution (includes progressReel)
firebase functions:log --only afterSummary
```

### Firestore Monitoring
- Monitor `/reels` collection size
- Monitor `/consents/{userId}/history` for audit trail
- Set up alerts for unusual consent revocation rates

### Key Metrics to Track
1. **Consent Grant Rate** - Target: >60%
2. **Reel Generation Success Rate** - Target: >95%
3. **Share Rate** - Target: >30% of generated reels
4. **Click-Through Rate** - Target: >10% on shared links
5. **Consent Revocation Rate** - Baseline: <5%

### Alerts
```bash
# Set up Firebase Performance Monitoring alerts
# - Reel generation failures > 5%
# - Consent revocation spike (>10% increase)
```

---

## Rollback Plan

If critical issues arise:

### 1. Emergency Rollback (< 5 minutes)
```bash
# Disable feature flag (fastest)
# Edit: app/src/config/featureFlags.ts
loops: {
  progressReel: { enabled: false }
}

# Deploy update
cd app
eas update --branch production --message "Rollback PR19"
```

### 2. Full Rollback (< 30 minutes)
```bash
# Delete Cloud Function
firebase functions:delete onConsentRevoked

# Revert Firestore rules
git checkout HEAD~1 -- firestore.rules
firebase deploy --only firestore:rules

# Revert Firestore indexes
git checkout HEAD~1 -- firestore.indexes.json
firebase deploy --only firestore:indexes
```

### 3. Emergency Data Cleanup
```bash
# If reels need to be deleted (EMERGENCY ONLY)
firebase firestore:delete --all-collections --recursive reels

# If consent history needs to be cleared (COMPLIANCE ISSUE ONLY)
firebase firestore:delete --all-collections --recursive consents
```

---

## Known Limitations

1. **Consent Trigger**
   - No automatic prompt yet
   - Workaround: Add to settings or trigger manually

2. **Analytics**
   - Only stub implementation (`trackReelEvent()`)
   - Full integration requires PR17 experiments

3. **Cost Monitoring**
   - No budget tracking for reel generation
   - Monitor Firestore reads/writes manually

4. **Manual Testing**
   - No automated E2E tests
   - Physical device required for push notifications

---

## Success Criteria

Before marking as "production-ready":

- [  ] All deployment steps completed
- [  ] Smoke tests pass
- [  ] No errors in Cloud Functions logs
- [  ] Monitoring dashboards set up
- [  ] At least 10 test reels generated successfully
- [  ] Consent revocation tested and working
- [  ] Share functionality tested on iOS and Android
- [  ] PII redaction verified on real data

---

## Support

### Troubleshooting

**Issue: Consent not updating**
- Check Firestore rules are deployed
- Verify user is authenticated
- Check network connectivity

**Issue: Reels not generating**
- Check feature flag: `progressReel.enabled = true`
- Verify consent granted: `users/{userId}.consents.progressSharing = true`
- Check `afterSummary` logs for errors
- Verify session qualityScore >= 80

**Issue: Notification not received**
- Check push token registered
- Verify notification queued in `/notifications`
- Check device notification settings

**Issue: Share button not working**
- Verify device Share API available
- Check referral link format
- Test on physical device (not simulator)

### Contact
- Engineer A (Backend): [Handle issues with Cloud Functions, Firestore]
- Engineer B (Frontend): [Handle issues with UI, navigation, sharing]
- QA Team: [Report bugs from testing]

---

## Post-Launch Tasks

### Week 1
- [  ] Monitor consent grant rate daily
- [  ] Review reel generation success rate
- [  ] Collect user feedback on consent flow
- [  ] Analyze share rates

### Week 2-4
- [  ] A/B test consent copy (PR17 integration)
- [  ] Optimize carousel design based on feedback
- [  ] Implement automatic consent prompt
- [  ] Add cost monitoring and alerts

### Future Enhancements
- [ ] Cloudinary video generation (optional upgrade)
- [ ] Custom reel templates per subject
- [ ] Music/audio backgrounds
- [ ] Advanced analytics (PR17 integration)
- [ ] Cohort variant (share multiple students)

---

**Deployment Date:** TBD  
**Deployed By:** TBD  
**Approved By:** TBD

✅ PR19 is ready for deployment!

