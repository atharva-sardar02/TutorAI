# Admin Dashboard - Data Source Audit

**Date**: November 5, 2025  
**Purpose**: Verify all features use real data vs mock/placeholder data

---

## ✅ **Features Using REAL Data**

### 1. **Dashboard Overview** (`Dashboard.tsx`)
- ✅ **Total Users**: Real count from `/users` collection
- ✅ **Active Today**: Real count from `/presence` collection (lastSeen >= today)
- ✅ **Weekly Growth**: Real count from `/users` where `createdAt >= 7 days ago`
- ✅ **Pending Fraud**: Real count from `/fraud_queue` where `status == 'pending'`
- ✅ **Active Experiments**: Real count from `/experiments` where `status == 'active'`
- ✅ **Recent Activity**: Real-time subscription to `/audit_log` (last 10 entries)
- ⚠️ **K-Factor**: **HARDCODED to 1.2** (needs fix)

### 2. **Kill Switches** (`KillSwitches.tsx`)
- ✅ **All feature flags**: Real-time data from `/feature_flags` collection
- ✅ **Toggle actions**: Write directly to Firestore

### 3. **Audit Log** (`AuditLog.tsx`)
- ✅ **All log entries**: Real data from `/audit_log` collection
- ✅ **Filters and search**: Client-side filtering on real data

### 4. **User Management** (`UserManagement.tsx`)
- ✅ **User search**: Real queries to `/users` collection
- ✅ **User profiles**: Cloud Function `getUserProfile` aggregates real data
- ✅ **Ban/Unban actions**: Write directly to Firestore `/users`
- ✅ **User stats**: Aggregated from `/conversations`, `/messages`, `/referrals`, `/balances`

### 5. **System Health** (`SystemHealth.tsx`)
- ✅ **Firestore usage**: Real estimates from document counts
- ✅ **Storage quotas**: Real data from Firebase Storage bucket metadata
- ✅ **Function health**: Real data from `/agent_logs` collection (24h window)
- ✅ **Scheduled jobs**: Real status from `/agent_logs` with last execution times
- ⚠️ **API quotas (OpenAI, Firebase)**: **ESTIMATES** (reasonable approximations)

### 6. **Fraud Detection** (`FraudQueue.tsx`)
- ✅ **Fraud queue items**: Real data from `/fraud_queue` collection
- ✅ **Approve/Reject actions**: Write directly to Firestore
- ✅ **Filters**: Real Firestore queries with indexes

### 7. **Experiments** (`ExperimentList.tsx`)
- ✅ **Experiment list**: Real data from `/experiments` collection
- ✅ **Toggle active/inactive**: Write directly to Firestore

### 8. **Session Intelligence - Daily Summaries** (`DailySummaries.tsx`)
- ✅ **Daily summaries**: Real data from `/admin_daily_summaries` collection
- ✅ **Aggregated by**: `aggregateAdminSummaries` Cloud Function (runs every 6 hours)
- ✅ **Filters**: Conversation ID, date range

### 9. **Session Intelligence - Weekly Summaries** (`WeeklySummaries.tsx`)
- ✅ **Weekly summaries**: Real data from `/admin_weekly_summaries` collection
- ✅ **Aggregated by**: `aggregateAdminSummaries` Cloud Function (runs every 6 hours)
- ✅ **Filters**: Conversation ID

### 10. **Session Intelligence - Analytics** (`SIAnalytics.tsx`)
- ✅ **SI events**: Real data from `/si_analytics` collection
- ✅ **Alerts**: Real data from `/si_alerts` collection (client-side filtering)

---

## ⚠️ **Features Using MOCK or PARTIAL Data**

### 1. **Growth Metrics - K-Factor Dashboard** (`KFactorDashboard.tsx`)
- ⚠️ **Data Source**: `metricsService.ts` → `getKFactorMetrics()`
- **Status**: **Partially Real**
  - ✅ Queries `/k_factor_metrics` collection
  - ⚠️ Falls back to **mock data** if collection is empty
  - ✅ Backend function `computeKFactor` exists and is scheduled
  - **Issue**: May not have data if function hasn't run or no referrals exist

### 2. **Growth Metrics - Conversion Funnel** (`FunnelMetrics.tsx`)
- ❌ **Data Source**: `metricsService.ts` → `getFunnelMetrics()`
- **Status**: **100% MOCK DATA**
  - Returns hardcoded funnel stages
  - No Firestore queries
  - **Not implemented in backend**

### 3. **Growth Metrics - Retention Analysis** (`RetentionMetrics.tsx`)
- ❌ **Data Source**: `metricsService.ts` → `getRetentionMetrics()`
- **Status**: **100% MOCK DATA**
  - Returns hardcoded retention curves
  - No Firestore queries
  - **Not implemented in backend**

### 4. **Growth Metrics - Percentile Monitor** (`PercentileMonitor.tsx`)
- ⚠️ **Data Source**: `metricsService.ts` → `getPercentileStats()`
- **Status**: **Partially Real**
  - ✅ Queries `/users` collection for XP data
  - ⚠️ Uses **mock distribution** for histogram
  - ✅ Backend function `computeMonthlyPercentiles` exists and is scheduled
  - **Issue**: Distribution calculation is simplified

### 5. **Dashboard K-Factor Display**
- ❌ **Data Source**: `firestoreService.ts` → `getDashboardStats()`
- **Status**: **HARDCODED to 1.2**
  - Comment says "TODO: Calculate from actual data"
  - Should query latest K-Factor from `/k_factor_metrics`

---

## 🔧 **Required Fixes**

### **HIGH PRIORITY**

#### 1. **Fix Dashboard K-Factor** (5 minutes)
**File**: `admin-dashboard/src/services/firestoreService.ts`

**Current**:
```typescript
// K-Factor (mock for now - will be implemented in PR-ADMIN-03)
const kFactor = 1.2; // TODO: Calculate from actual data
```

**Fix**:
```typescript
// Get latest K-Factor from metrics
let kFactor = 1.0; // Default
try {
  const kFactorQuery = query(
    collection(db, 'k_factor_metrics'),
    orderBy('timestamp', 'desc'),
    firestoreLimit(1)
  );
  const kFactorSnapshot = await getDocs(kFactorQuery);
  if (!kFactorSnapshot.empty) {
    kFactor = kFactorSnapshot.docs[0].data().kFactor || 1.0;
  }
} catch (error) {
  console.warn('Could not fetch K-Factor, using default:', error);
}
```

---

### **MEDIUM PRIORITY**

#### 2. **Implement Real Funnel Metrics** (1-2 hours)

**Option A: Use Existing Data (Recommended)**
- Query `/users` for signup funnel
- Check user fields: `profileComplete`, `firstSessionAt`, `active`
- Calculate conversion rates from user data

**Option B: Add Analytics Events (More Accurate)**
- Create `/funnel_events` collection
- Track events: `landing_view`, `signup_start`, `profile_complete`, `first_session`, `active_user`
- Aggregate in `metricsService.ts`

**File to Update**: `admin-dashboard/src/services/metricsService.ts`

---

#### 3. **Implement Real Retention Metrics** (1-2 hours)

**Approach**:
- Query `/users` with `createdAt` for cohort grouping
- Query `/presence` or `/conversations` for activity tracking
- Calculate D1, D7, D30 retention per cohort
- Store results in `/retention_metrics` collection (optional)

**File to Update**: `admin-dashboard/src/services/metricsService.ts`

---

#### 4. **Improve Percentile Distribution** (30 minutes)

**Current Issue**: Mock distribution histogram

**Fix**:
- Use real XP data already fetched
- Calculate percentile buckets (0-10, 10-20, ..., 90-100)
- Count users in each bucket
- Return real distribution

**File to Update**: `admin-dashboard/src/services/metricsService.ts`

---

## 📊 **Summary**

### Data Quality Status

| Feature | Real Data | Mock Data | Status |
|---------|-----------|-----------|--------|
| Dashboard Overview | 90% | 10% | ⚠️ K-Factor hardcoded |
| Kill Switches | 100% | 0% | ✅ Complete |
| Audit Log | 100% | 0% | ✅ Complete |
| User Management | 100% | 0% | ✅ Complete |
| System Health | 85% | 15% | ⚠️ API quotas estimated |
| Fraud Detection | 100% | 0% | ✅ Complete |
| Experiments | 100% | 0% | ✅ Complete |
| SI Daily Summaries | 100% | 0% | ✅ Complete |
| SI Weekly Summaries | 100% | 0% | ✅ Complete |
| SI Analytics | 100% | 0% | ✅ Complete |
| K-Factor Dashboard | 50% | 50% | ⚠️ Fallback to mock |
| Conversion Funnel | 0% | 100% | ❌ Not implemented |
| Retention Analysis | 0% | 100% | ❌ Not implemented |
| Percentile Monitor | 70% | 30% | ⚠️ Mock distribution |

### Overall Score: **75% Real Data**

---

## 🎯 **Recommendations**

### **Immediate Actions** (Before Production)
1. ✅ **Fix Dashboard K-Factor** (5 min) - Query `/k_factor_metrics`
2. ⚠️ **Accept K-Factor fallback** - Show message "Waiting for data..." if empty
3. ⚠️ **Accept Funnel/Retention mock data** - Label as "Demo Data" or hide until implemented

### **Post-MVP Enhancements**
1. **Implement Real Funnel Metrics** - Track user journey events
2. **Implement Real Retention Metrics** - Cohort analysis from user activity
3. **Improve Percentile Distribution** - Use real XP bucketing
4. **Add Cloud Monitoring Integration** - Replace API quota estimates with real metrics

### **Documentation**
- Add "Data Sources" section to User Guide
- Note which metrics are estimates vs real-time
- Provide expected data availability timeline

---

## ✅ **Verification Checklist**

Before deploying to production:
- [ ] Fix Dashboard K-Factor to query real data
- [ ] Ensure `computeKFactor` function has run at least once
- [ ] Verify `/k_factor_metrics` collection has data
- [ ] Add "No data available" states for empty collections
- [ ] Test dashboard with empty/minimal data
- [ ] Label mock data sections (Funnel, Retention) as "Demo Data"

---

## 🔍 **Data Flow Diagram**

```
Backend (Cloud Functions)                 Frontend (Admin Dashboard)
========================                  ==========================

computeKFactor                     →      K-Factor Dashboard
  ↓ writes to                               (queries k_factor_metrics)
  k_factor_metrics

aggregateAdminSummaries            →      SI Daily/Weekly Summaries
  ↓ writes to                               (queries admin_*_summaries)
  admin_daily_summaries
  admin_weekly_summaries

getUserProfile                     →      User Management
  ↓ aggregates from                        (calls Cloud Function)
  users, balances, conversations

getSystemHealth                    →      System Health
  ↓ aggregates from                        (calls Cloud Function)
  agent_logs, storage, firestore

(Direct Firestore reads)           →      Dashboard, Fraud, Experiments
  ↓ queries                                 Audit Log, Kill Switches
  users, fraud_queue, experiments
  audit_log, feature_flags
```

---

**Status**: 75% real data, 25% mock/estimated  
**Priority Fixes**: 1 critical (Dashboard K-Factor)  
**Recommended Timeline**: Fix critical items before production, enhance others post-MVP

