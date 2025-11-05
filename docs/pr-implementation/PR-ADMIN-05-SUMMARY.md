# PR-ADMIN-05: Fraud & Experiments Sections

**Date:** November 5, 2025  
**Status:** ✅ Complete  
**Deployed:** ✅ Firestore Rules Updated

---

## Overview

Implemented fraud detection queue and A/B experiment monitoring sections for the TutorAI admin dashboard. Admins can now review suspicious referrals, approve/reject fraud items, and manage active experiments.

---

## Features Implemented

### 1. Fraud Queue Management
- **Real-time fraud queue** with 30-second auto-refresh
- **Batch operations** for approving/rejecting multiple items
- **Individual actions** for single item review
- **Filters**:
  - Status (pending/approved/rejected)
  - Loop type (referral/study-buddy/parent-pod/tutor-peer)
  - Minimum anomaly score
  - Date range
- **Detailed item view**:
  - Anomaly score with color coding
  - Fraud reasons (clickbait, rapid-signup, device-cluster, etc.)
  - Metadata (device ID, IP address, signup time)
  - Review status and timestamp

### 2. Experiment Management
- **Experiment list** with active/inactive status
- **Toggle switches** to activate/deactivate experiments
- **Expandable details**:
  - Variant breakdown (name, description, weight, config)
  - Target audience (roles, age, percentage)
  - Metrics (conversion, engagement, retention, revenue)
- **Filters**:
  - Status (all/active/inactive)
  - Target role (all/tutor/parent)
  - Date range

### 3. Reusable Components
- `ConfirmDialog`: Modal for confirming destructive actions
- `StatusFilter`: Dropdown filter for status/role selection
- `FraudQueueTable`: Table with checkboxes, actions, and sorting
- `ExperimentTable`: Collapsible table with nested variant details

---

## Files Created

### Types
- `admin-dashboard/src/types/fraud.ts` - FraudItem, AnomalyScore, FraudQueueFilters, FraudAction interfaces
- `admin-dashboard/src/types/experiments.ts` - Experiment, Variant, ExperimentMetrics, ExperimentFilters interfaces

### Hooks
- `admin-dashboard/src/hooks/useFraudQueue.ts` - React Query hook for fraud queue with mutations
- `admin-dashboard/src/hooks/useExperiments.ts` - React Query hook for experiments with toggle mutation

### Components
- `admin-dashboard/src/components/Common/ConfirmDialog.tsx` - Reusable confirmation modal
- `admin-dashboard/src/components/Filters/StatusFilter.tsx` - Generic status/dropdown filter
- `admin-dashboard/src/components/Tables/FraudQueueTable.tsx` - Fraud queue table with batch actions
- `admin-dashboard/src/components/Tables/ExperimentTable.tsx` - Collapsible experiment table

### Pages
- `admin-dashboard/src/pages/Fraud/FraudQueue.tsx` - Main fraud queue page
- `admin-dashboard/src/pages/Experiments/ExperimentList.tsx` - Main experiments page

---

## Files Modified

### Frontend
- `admin-dashboard/src/App.tsx`
  - Added imports for `FraudQueue` and `ExperimentList`
  - Updated routes for `/fraud` and `/experiments`

### Backend
- `firestore.rules`
  - Updated `fraud_queue` rules to allow admin updates (approve/reject)
  - Standardized `experiments` rules to use `isAdmin()` helper
  - Separated create/update/delete permissions for granular control

---

## Technical Implementation

### Fraud Queue Flow
1. **Data Fetch**: Query `/fraud_queue` collection with filters (status, loop type, score threshold)
2. **Real-time Updates**: Auto-refresh every 30 seconds via React Query
3. **Action Processing**:
   - Admin selects item(s) → Opens confirm dialog
   - On confirm → `updateDoc()` sets `status`, `reviewedBy`, `reviewedAt`
   - React Query invalidates cache → Refetches data
4. **Snackbar Feedback**: Success/error messages for user feedback

### Experiment Toggle Flow
1. **Data Fetch**: Query `/experiments` collection with filters (status, role)
2. **Toggle Action**:
   - Admin clicks switch → Calls `updateDoc()` with new `active` status
   - Updates `updatedAt` and `updatedBy` fields
   - React Query invalidates cache → Refetches data
3. **Expandable Details**: Click row → Collapse/expand to show variants and metrics

### Firestore Security Rules
```firestore
// Fraud Queue
match /fraud_queue/{referralId} {
  allow read: if isAdmin();
  allow create: if false; // Only Cloud Functions
  allow update: if isAdmin(); // Admins can approve/reject
  allow delete: if false;
}

// Experiments
match /experiments/{experimentId} {
  allow read: if request.auth != null;
  allow write: if isAdmin();
}
```

---

## UI/UX Highlights

### Fraud Queue
- **Color-coded anomaly scores**:
  - Red (≥70%): Critical risk
  - Orange (50-69%): Medium risk
  - Green (<50%): Low risk
- **Batch actions** for efficient review
- **Pending alert** shows count of items requiring review
- **Disabled checkboxes** for already-reviewed items

### Experiments
- **Collapsible rows** to hide/show variant details
- **Chip badges** for status, roles, metrics
- **Inline toggle switches** for quick activation
- **Monospace font** for variant config JSON

---

## Data Sources

### Current State
- **Fraud Queue**: Real Firestore data from `/fraud_queue` collection
- **Experiments**: Real Firestore data from `/experiments` collection
- **Experiment Metrics**: Hook available (`useExperimentMetrics`) but not displayed yet (reserved for future PR)

### Missing Integrations
- Cloud Functions to populate fraud queue (already implemented in PR22)
- Experiment metrics aggregation (already implemented in PR17)

---

## Testing Checklist

### Fraud Queue
- [x] Navigate to `/fraud` route
- [x] Verify fraud items load from Firestore
- [x] Test status filter (pending/approved/rejected)
- [x] Test loop type filter
- [x] Test single item approve/reject
- [x] Test batch approve/reject
- [x] Test confirm dialog (cancel vs confirm)
- [x] Test snackbar messages
- [x] Test auto-refresh (wait 30 seconds)

### Experiments
- [x] Navigate to `/experiments` route
- [x] Verify experiments load from Firestore
- [x] Test status filter (all/active/inactive)
- [x] Test role filter (all/tutor/parent)
- [x] Test expand/collapse variant details
- [x] Test toggle switch (activate/deactivate)
- [x] Test snackbar messages

### Permissions
- [x] Verify only admins can access `/fraud` and `/experiments`
- [x] Verify admin can update fraud_queue items
- [x] Verify admin can update experiments
- [x] Verify Cloud Functions can still create fraud items

---

## Deployment Steps

1. **Commit Code**
   ```bash
   git add -A
   git commit -m "PR-ADMIN-05: Add fraud queue and experiments sections"
   git push origin main
   ```

2. **Deploy Firestore Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Test in Dashboard**
   - Login as admin
   - Navigate to `/fraud` and `/experiments`
   - Verify data loads and actions work

---

## Next Steps (PR-ADMIN-06)

- [ ] Implement kill-switches for feature flags
- [ ] Implement audit log viewer
- [ ] Implement user management (search, ban, set admin)
- [ ] Implement system health monitoring
- [ ] Add responsive design (mobile/tablet)
- [ ] Deploy to Firebase Hosting

---

## Screenshots (Manual Testing)

### Fraud Queue
- Pending items alert
- Filters bar
- Batch action buttons
- Fraud queue table with anomaly scores
- Confirm dialog

### Experiments
- Active experiments alert
- Filters bar
- Experiment table with toggle switches
- Expanded variant details

---

## Notes

- **No backend changes required** for this PR (Cloud Functions already exist)
- **Firestore rules updated** to allow admin write access
- **React Query** handles caching and invalidation
- **Real-time updates** via `refetchInterval` (30s for fraud, 60s for experiments)
- **ConfirmDialog** can be reused in future PRs (system management, user actions)
- **StatusFilter** is generic and can filter any enum-like values

---

**Status:** ✅ PR-ADMIN-05 Complete - Ready for PR-ADMIN-06

