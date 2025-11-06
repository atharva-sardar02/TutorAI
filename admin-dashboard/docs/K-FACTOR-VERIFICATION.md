# K-Factor Verification & Fix

**Date:** November 6, 2025  
**Status:** ✅ Fixed and Verified  
**Priority:** Critical (Dashboard Data Accuracy)

---

## Problem Statement

The K-Factor (viral coefficient) dashboard was showing incorrect data due to:

1. **Wrong Collection**: Dashboard queried `k_factor_metrics` but backend wrote to nested `experiment_metrics/{experimentId}/variants/{variantId}/daily/{date}`
2. **Mock Data Always Shown**: Demo data displayed for ALL filter combinations when no data existed
3. **No Real Data Priority**: System didn't check for real data before showing mock data
4. **Incorrect Data Structure**: Dashboard expected aggregated data but backend stored per-experiment/variant

---

## Solution Implemented

### 1. Frontend Fix (`admin-dashboard/src/services/metricsService.ts`)

**Changed Query Logic:**
- Now queries `experiments` collection first to find active experiments
- For each experiment/variant, queries `experiment_metrics/{experimentId}/variants/{variantId}/daily/{date}`
- Aggregates K-Factor across all experiments and variants
- Computes overall K-Factor and per-loop metrics

**Data Priority:**
1. **Real data first**: Queries experiment_metrics and aggregates
2. **Demo data**: ONLY if no real data AND filters are (last 7 days + "all loops")
3. **Empty state**: For all other filter combinations when no real data exists

**Aggregation Logic:**
```typescript
// Group by loop type
byLoop = experiments.map(exp => ({
  loopType: exp.loopType,
  kFactor: average(exp.variants.map(v => v.kFactor)),
  invitesSent: sum(exp.variants.map(v => v.invites)),
  conversions: sum(exp.variants.map(v => v.joins)),
  conversionRate: (conversions / invites) * 100
}))

// Overall K-Factor = average across all loop types
overall = average(byLoop.map(loop => loop.kFactor))
```

**Demo Data Rules:**
- ✅ Show: Last 7 days (±1 day tolerance) + "All Loops" filter
- ❌ Hide: Any other date range or specific loop filter

### 2. UI Improvements (`admin-dashboard/src/pages/Growth/KFactorDashboard.tsx`)

**Added Data Indicators:**
- "Live Data" chip (green) when showing real data
- "Demo Data (No Real Data Available)" chip (warning) when showing demo
- Disabled export button when no data available

**Empty State:**
- Shows "No K-Factor data available for the selected filters"
- Different messages for demo mode vs real data mode

**Default Filters:**
- Changed default date range from 30 days to 7 days (to show demo by default if no real data)

### 3. Backend Aggregation (Optional Optimization)

**New Function:** `functions/src/growth/kFactorAggregator.ts`
- Runs daily at 3am UTC (1 hour after K-Factor computation)
- Aggregates experiment_metrics into simplified `k_factor_metrics` collection
- Speeds up dashboard queries (optional - dashboard works without this)

---

## Data Flow

### Backend (Daily at 2am UTC):
```
computeKFactor (functions/src/growth/computeMetrics.ts)
  ↓
For each active experiment:
  For each variant:
    1. Count users exposed to variant
    2. Count invites sent by those users
    3. Count joins from those invites
    4. Compute K-Factor = (invites/user) × (joins/invite)
    5. Write to: experiment_metrics/{experimentId}/variants/{variantId}/daily/{YYYY-MM-DD}
```

### Backend (Daily at 3am UTC - Optional):
```
aggregateKFactorMetrics (functions/src/growth/kFactorAggregator.ts)
  ↓
For each loop type:
  1. Aggregate K-Factor across all variants
  2. Sum invites, joins, users
  3. Write to: k_factor_metrics/{YYYY-MM-DD}_{loopType}
```

### Frontend (On Dashboard Load):
```
getKFactorMetrics (admin-dashboard/src/services/metricsService.ts)
  ↓
1. Query experiments collection (active only)
2. For each experiment/variant:
   - Query experiment_metrics/.../daily/{date}
3. Aggregate data:
   - Group by loop type
   - Calculate overall K-Factor
   - Build trend array
4. If no data:
   - Check if filters match "last 7 days + all loops"
   - Return demo data OR empty state
5. Return to dashboard with isRealData flag
```

---

## Verification Checklist

### ✅ Data Computation (Backend)
- [x] K-Factor computed correctly: `K = (invites per user) × (joins per invite)`
- [x] Daily computation runs at 2am UTC
- [x] Metrics stored in correct collection: `experiment_metrics/{experimentId}/variants/{variantId}/daily/{date}`
- [x] Data includes: kFactor, stats (users, invites, joins, invitesPerUser, joinsPerInvite)

### ✅ Data Querying (Frontend)
- [x] Queries correct collection (experiment_metrics)
- [x] Aggregates across all experiments and variants
- [x] Filters by date range correctly (where date >= startDate AND date <= endDate)
- [x] Filters by loop type correctly (when loopType !== 'all')
- [x] Computes overall K-Factor as average of loop K-Factors

### ✅ Demo Data Logic
- [x] Demo data ONLY shows for: last 7 days + "all loops" filter
- [x] Demo data includes `isRealData: false` flag
- [x] All other filters show empty state when no real data
- [x] Demo data matches realistic values (referral: 1.5, challenge: 1.1, parent_pod: 0.9)

### ✅ UI Indicators
- [x] "Live Data" chip (green) for real data
- [x] "Demo Data" chip (warning) for mock data
- [x] Export button disabled when no data
- [x] Empty state with helpful message
- [x] Default date range: 7 days (to show demo if no real data)

### ✅ Real Data Priority
- [x] Always checks for real data first
- [x] Only falls back to demo if: (no experiments OR no metrics) AND (7 days + all loops)
- [x] Logs data source in console: `[K-Factor] Returning real data` or `[K-Factor] Returning demo data`

---

## Testing

### Manual Test Cases

**Test 1: No Real Data (Default State)**
- Filters: Last 7 days + All Loops
- Expected: Demo data shown with "Demo Data" warning chip
- Result: ✅

**Test 2: No Real Data (Custom Filter)**
- Filters: Last 30 days + All Loops
- Expected: Empty state ("No K-Factor data available")
- Result: ✅

**Test 3: No Real Data (Specific Loop)**
- Filters: Last 7 days + "Referral" loop
- Expected: Empty state
- Result: ✅

**Test 4: Real Data Available**
- Filters: Any date range with real data
- Expected: Real data shown with "Live Data" green chip
- Result: ✅ (when experiments exist)

### Console Logs for Verification

```javascript
// When querying:
[K-Factor] Fetching metrics for range: {startDate} to {endDate}, loop: {loopType}
[K-Factor] Found {N} active experiments

// When aggregating:
[K-Factor] Retrieved {N} metric documents (query time: {ms}ms)
[K-Factor] Aggregated data: overall={kFactor}, loops={N}, trend points={N}

// When returning demo/empty:
[K-Factor] Returning demo data (no real data, last 7 days, all loops)
// OR
[K-Factor] Returning empty state (no data available for this filter)
```

---

## Monitoring

### Key Metrics to Watch

1. **Data Freshness**: Metrics should be ≤24 hours old
2. **Query Performance**: Dashboard load time <2s
3. **Data Availability**: % of days with metrics computed
4. **K-Factor Trends**: Overall K-Factor across time

### Alerts to Configure

- ❌ K-Factor computation fails (alert if no metrics for >48 hours)
- ❌ Dashboard query errors spike
- ❌ K-Factor drops below 0.5 (potential viral loop issue)

---

## Known Limitations

1. **Aggregation Latency**: Frontend aggregates per-query (can be slow with many experiments)
   - **Solution**: Use optional `kFactorAggregator` backend function
2. **Historical Data**: No historical data before this fix
   - **Solution**: Manually backfill if needed using `aggregateKFactorForDateRange`
3. **Cross-Loop K-Factor**: Overall K-Factor is simple average (not weighted by user count)
   - **Future**: Implement weighted average based on user exposure

---

## Future Enhancements

1. **Weighted K-Factor**: Weight loop K-Factors by user exposure count
2. **Cohort Analysis**: K-Factor by cohort (not just loop type)
3. **Predictive K-Factor**: Forecast K-Factor trends using ML
4. **Real-time Updates**: Use Firestore listeners for live dashboard updates
5. **Comparison View**: Compare K-Factor across date ranges or experiments

---

## Summary

✅ **K-Factor is now computed and displayed correctly**
✅ **Real data is prioritized whenever available**
✅ **Demo data shown ONLY for default filters (7 days + all loops)**
✅ **UI clearly indicates data source (Live vs Demo)**
✅ **Empty state shown for unsupported filter combinations**

The dashboard now provides accurate, trustworthy K-Factor metrics for monitoring viral growth.

