# TutorAI Admin Dashboard - Task List & Implementation Checklist

**Version:** 1.1  
**Date:** November 5, 2025  
**Total PRs:** 7  
**Estimated Timeline:** 5.5 weeks

---

## 📁 Project File Structure

```
admin-dashboard/
├── package.json                          # Dependencies
├── tsconfig.json                         # TypeScript config
├── vite.config.ts                        # Vite bundler config
├── firebase.json                         # Firebase hosting config
├── .firebaserc                           # Firebase project config
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── assets/
│       └── logo.png
├── src/
│   ├── App.tsx                          # Root component
│   ├── main.tsx                         # Entry point
│   ├── vite-env.d.ts                    # Vite types
│   ├── theme.ts                         # MUI theme config
│   ├── pages/
│   │   ├── Dashboard.tsx                # Overview page
│   │   ├── Growth/
│   │   │   ├── KFactorDashboard.tsx
│   │   │   ├── FunnelMetrics.tsx
│   │   │   ├── RetentionMetrics.tsx
│   │   │   └── PercentileMonitor.tsx
│   │   ├── SessionIntel/
│   │   │   ├── DailySummaries.tsx
│   │   │   ├── WeeklySummaries.tsx
│   │   │   └── SIAnalytics.tsx
│   │   ├── Fraud/
│   │   │   └── FraudQueue.tsx
│   │   ├── Experiments/
│   │   │   └── ExperimentList.tsx
│   │   ├── System/
│   │   │   ├── KillSwitches.tsx
│   │   │   ├── AuditLog.tsx
│   │   │   ├── UserManagement.tsx
│   │   │   └── SystemHealth.tsx
│   │   └── Login.tsx
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── MainLayout.tsx
│   │   ├── Charts/
│   │   │   ├── KFactorChart.tsx
│   │   │   ├── FunnelChart.tsx
│   │   │   ├── RetentionChart.tsx
│   │   │   ├── PercentileHistogram.tsx
│   │   │   └── TimeSeriesChart.tsx
│   │   ├── Cards/
│   │   │   ├── MetricCard.tsx
│   │   │   ├── SummaryCard.tsx
│   │   │   └── StatCard.tsx
│   │   ├── Tables/
│   │   │   ├── FraudQueueTable.tsx
│   │   │   ├── ExperimentTable.tsx
│   │   │   ├── AuditLogTable.tsx
│   │   │   └── UserTable.tsx
│   │   ├── Filters/
│   │   │   ├── DateRangeFilter.tsx
│   │   │   ├── LoopTypeFilter.tsx
│   │   │   └── StatusFilter.tsx
│   │   └── Common/
│   │       ├── LoadingState.tsx
│   │       ├── ErrorState.tsx
│   │       ├── EmptyState.tsx
│   │       └── ConfirmDialog.tsx
│   ├── hooks/
│   │   ├── useAuth.ts                   # Admin auth
│   │   ├── useKFactorMetrics.ts
│   │   ├── useFunnelMetrics.ts
│   │   ├── useRetentionMetrics.ts
│   │   ├── useFraudQueue.ts
│   │   ├── useKillSwitches.ts
│   │   ├── useAuditLog.ts
│   │   ├── useSISummaries.ts
│   │   ├── useSIAnalytics.ts
│   │   ├── useUserProfile.ts
│   │   └── useSystemHealth.ts
│   ├── services/
│   │   ├── api.ts                       # API client
│   │   ├── adminApi.ts                  # Admin Cloud Functions
│   │   ├── firestoreService.ts          # Firestore queries
│   │   └── exportService.ts             # CSV/PDF export
│   ├── types/
│   │   ├── metrics.ts
│   │   ├── fraud.ts
│   │   ├── experiments.ts
│   │   ├── sessionIntel.ts
│   │   ├── user.ts
│   │   └── system.ts
│   ├── utils/
│   │   ├── formatters.ts                # Date, number formatters
│   │   ├── constants.ts                 # App constants
│   │   └── validators.ts                # Input validation
│   └── lib/
│       └── firebase.ts                   # Firebase SDK init
└── README.md

functions/src/
├── admin/
│   ├── siSummariesApi.ts                # NEW: SI summaries endpoint
│   ├── systemHealthApi.ts               # NEW: System health endpoint
│   └── userProfileApi.ts                # NEW: User profile endpoint
└── index.ts                              # Export new functions
```

---

## 🚀 PR Breakdown & Task Checklist

### **PR-ADMIN-01: Project Setup & Authentication** (Week 1, Day 1-2)

**Goal:** Initialize React app, set up Firebase, implement admin authentication

#### Backend Tasks
- [ ] **1.1** Create new backend functions for admin dashboard
  - **Files to create:**
    - `functions/src/admin/siSummariesApi.ts`
    - `functions/src/admin/systemHealthApi.ts`
    - `functions/src/admin/userProfileApi.ts`
  - **Files to modify:**
    - `functions/src/index.ts` (export new functions)

- [ ] **1.2** Deploy new admin Cloud Functions
  - **Command:** `firebase deploy --only functions:getSISummaries,functions:getSystemHealth,functions:getUserProfile`

#### Frontend Tasks
- [ ] **1.3** Initialize React app with Vite + TypeScript
  - **Command:** `npm create vite@latest admin-dashboard -- --template react-ts`
  - **Files to create:**
    - `admin-dashboard/package.json`
    - `admin-dashboard/tsconfig.json`
    - `admin-dashboard/vite.config.ts`
    - `admin-dashboard/index.html`

- [ ] **1.4** Install dependencies
  - **Command:** `npm install @mui/material @emotion/react @emotion/styled @mui/icons-material recharts react-router-dom @tanstack/react-query firebase date-fns`
  - **Dev dependencies:** `npm install -D @types/node`

- [ ] **1.5** Set up Firebase SDK
  - **Files to create:**
    - `admin-dashboard/src/lib/firebase.ts`
  - **Content:** Initialize Firebase app, auth, firestore, functions

- [ ] **1.6** Create theme configuration
  - **Files to create:**
    - `admin-dashboard/src/theme.ts`
  - **Content:** MUI theme with TutorAI colors (Spotify green primary)

- [ ] **1.7** Implement auth context and hooks
  - **Files to create:**
    - `admin-dashboard/src/hooks/useAuth.ts`
    - `admin-dashboard/src/contexts/AuthContext.tsx`
  - **Content:** Admin login, role check, logout

- [ ] **1.8** Create login page
  - **Files to create:**
    - `admin-dashboard/src/pages/Login.tsx`
  - **Content:** Email/password login form, admin claim verification

- [ ] **1.9** Create protected route wrapper
  - **Files to create:**
    - `admin-dashboard/src/components/ProtectedRoute.tsx`
  - **Content:** Check auth + admin role, redirect to login if unauthorized

- [ ] **1.10** Set up routing
  - **Files to create:**
    - `admin-dashboard/src/App.tsx`
  - **Content:** React Router with protected routes

**Files Created:** 12  
**Files Modified:** 1  
**Commit Message:** `PR-ADMIN-01: Initialize admin dashboard with auth`

---

### **PR-ADMIN-02: Core Layout & Dashboard Overview** (Week 1, Day 3-5)

**Goal:** Build sidebar navigation, top bar, and dashboard overview page

#### Layout Components
- [ ] **2.1** Create sidebar navigation
  - **Files to create:**
    - `admin-dashboard/src/components/Layout/Sidebar.tsx`
  - **Content:** Navigation links for all 7 sections, active state styling

- [ ] **2.2** Create top bar
  - **Files to create:**
    - `admin-dashboard/src/components/Layout/TopBar.tsx`
  - **Content:** Admin name, notifications icon, quick actions, logout button

- [ ] **2.3** Create main layout wrapper
  - **Files to create:**
    - `admin-dashboard/src/components/Layout/MainLayout.tsx`
  - **Content:** Combine sidebar + top bar + main content area

- [ ] **2.4** Update App.tsx to use layout
  - **Files to modify:**
    - `admin-dashboard/src/App.tsx`

#### Dashboard Overview Page
- [ ] **2.5** Create metric card component
  - **Files to create:**
    - `admin-dashboard/src/components/Cards/MetricCard.tsx`
  - **Content:** Reusable card with title, value, icon, trend indicator

- [ ] **2.6** Create stat card component
  - **Files to create:**
    - `admin-dashboard/src/components/Cards/StatCard.tsx`
  - **Content:** Smaller card for quick stats

- [ ] **2.7** Create API service
  - **Files to create:**
    - `admin-dashboard/src/services/api.ts`
    - `admin-dashboard/src/services/adminApi.ts`
  - **Content:** Wrapper for Firebase callable functions

- [ ] **2.8** Create dashboard overview page
  - **Files to create:**
    - `admin-dashboard/src/pages/Dashboard.tsx`
  - **Content:** 
    - Key metrics cards (Total Users, Active Today, Weekly Growth, K-Factor)
    - Quick stats (Pending fraud, Active experiments)
    - Recent activity feed

- [ ] **2.9** Create Firestore service for real-time data
  - **Files to create:**
    - `admin-dashboard/src/services/firestoreService.ts`
  - **Content:** Real-time listeners for users, audit log

- [ ] **2.10** Create common components
  - **Files to create:**
    - `admin-dashboard/src/components/Common/LoadingState.tsx`
    - `admin-dashboard/src/components/Common/ErrorState.tsx`
    - `admin-dashboard/src/components/Common/EmptyState.tsx`
  - **Content:** Reusable states for all pages

**Files Created:** 13  
**Files Modified:** 1  
**Commit Message:** `PR-ADMIN-02: Add core layout and dashboard overview`

---

### **PR-ADMIN-03: Growth Metrics Section** (Week 2)

**Goal:** Implement K-Factor, Funnel, Retention, and Percentile monitoring

#### K-Factor Dashboard
- [ ] **3.1** Create K-Factor hook
  - **Files to create:**
    - `admin-dashboard/src/hooks/useKFactorMetrics.ts`
  - **Content:** Call `getKFactorMetrics` Cloud Function, cache with React Query

- [ ] **3.2** Create K-Factor chart component
  - **Files to create:**
    - `admin-dashboard/src/components/Charts/KFactorChart.tsx`
  - **Content:** Line chart with date range, loop type filter

- [ ] **3.3** Create K-Factor dashboard page
  - **Files to create:**
    - `admin-dashboard/src/pages/Growth/KFactorDashboard.tsx`
  - **Content:** Chart, loop comparison table, export button

- [ ] **3.4** Create date range filter component
  - **Files to create:**
    - `admin-dashboard/src/components/Filters/DateRangeFilter.tsx`
  - **Content:** Reusable date picker with presets (7d, 30d, 90d)

- [ ] **3.5** Create loop type filter component
  - **Files to create:**
    - `admin-dashboard/src/components/Filters/LoopTypeFilter.tsx`
  - **Content:** Dropdown for loop types

#### Funnel Metrics
- [ ] **3.6** Create Funnel hook
  - **Files to create:**
    - `admin-dashboard/src/hooks/useFunnelMetrics.ts`
  - **Content:** Call `getFunnelMetrics` Cloud Function

- [ ] **3.7** Create Funnel chart component
  - **Files to create:**
    - `admin-dashboard/src/components/Charts/FunnelChart.tsx`
  - **Content:** Funnel visualization with conversion rates

- [ ] **3.8** Create Funnel page
  - **Files to create:**
    - `admin-dashboard/src/pages/Growth/FunnelMetrics.tsx`
  - **Content:** Funnel chart, filters, cohort analysis

#### Retention Metrics
- [ ] **3.9** Create Retention hook
  - **Files to create:**
    - `admin-dashboard/src/hooks/useRetentionMetrics.ts`
  - **Content:** Call `getRetentionMetrics` Cloud Function

- [ ] **3.10** Create Retention chart component
  - **Files to create:**
    - `admin-dashboard/src/components/Charts/RetentionChart.tsx`
  - **Content:** Line chart with retention curves

- [ ] **3.11** Create Retention page
  - **Files to create:**
    - `admin-dashboard/src/pages/Growth/RetentionMetrics.tsx`
  - **Content:** Cohort table, retention chart, export

#### Percentile Monitor
- [ ] **3.12** Create Percentile hook
  - **Files to create:**
    - `admin-dashboard/src/hooks/usePercentileStats.ts`
  - **Content:** Query `users/{uid}.stats` field, aggregate

- [ ] **3.13** Create Percentile histogram component
  - **Files to create:**
    - `admin-dashboard/src/components/Charts/PercentileHistogram.tsx`
  - **Content:** Histogram of percentile distribution

- [ ] **3.14** Create Percentile monitor page
  - **Files to create:**
    - `admin-dashboard/src/pages/Growth/PercentileMonitor.tsx`
  - **Content:** Distribution chart, role comparison, XP trends

#### Types & Utils
- [ ] **3.15** Create metrics types
  - **Files to create:**
    - `admin-dashboard/src/types/metrics.ts`
  - **Content:** TypeScript interfaces for all metrics

- [ ] **3.16** Create formatters utility
  - **Files to create:**
    - `admin-dashboard/src/utils/formatters.ts`
  - **Content:** Format dates, numbers, percentages, durations

- [ ] **3.17** Create export service
  - **Files to create:**
    - `admin-dashboard/src/services/exportService.ts`
  - **Content:** Export data to CSV

**Files Created:** 17  
**Files Modified:** 0  
**Commit Message:** `PR-ADMIN-03: Add growth metrics section (K-factor, funnel, retention, percentile)`

---

### **PR-ADMIN-04: Session Intelligence Section** (Week 3)

**Goal:** Monitor daily/weekly summaries and SI analytics

#### Backend Functions
- [ ] **4.1** Implement `getSISummaries` Cloud Function
  - **Files to modify:**
    - `functions/src/admin/siSummariesApi.ts` (created in PR-ADMIN-01)
  - **Content:** Query `/summaries/{cid}/daily/{date}` and `/weekly/{week}`

- [ ] **4.2** Deploy SI summaries function
  - **Command:** `firebase deploy --only functions:getSISummaries`

#### Daily Summaries
- [ ] **4.3** Create SI summaries hook
  - **Files to create:**
    - `admin-dashboard/src/hooks/useSISummaries.ts`
  - **Content:** Call `getSISummaries`, Firestore listener for real-time

- [ ] **4.4** Create summary card component
  - **Files to create:**
    - `admin-dashboard/src/components/Cards/SummaryCard.tsx`
  - **Content:** Expandable card for daily summary

- [ ] **4.5** Create Daily Summaries page
  - **Files to create:**
    - `admin-dashboard/src/pages/SessionIntel/DailySummaries.tsx`
  - **Content:** Summary feed, search, filters, pagination

#### Weekly Summaries
- [ ] **4.6** Create Weekly Summaries page
  - **Files to create:**
    - `admin-dashboard/src/pages/SessionIntel/WeeklySummaries.tsx`
  - **Content:** Weekly cards, week navigator, reel status

#### SI Analytics
- [ ] **4.7** Create SI analytics hook
  - **Files to create:**
    - `admin-dashboard/src/hooks/useSIAnalytics.ts`
  - **Content:** Query `/si_analytics` and `/si_alerts`

- [ ] **4.8** Create time-series chart component
  - **Files to create:**
    - `admin-dashboard/src/components/Charts/TimeSeriesChart.tsx`
  - **Content:** Generic time-series chart for events

- [ ] **4.9** Create SI Analytics page
  - **Files to create:**
    - `admin-dashboard/src/pages/SessionIntel/SIAnalytics.tsx`
  - **Content:** Event timeline, error rates, alerts dashboard

#### Types
- [ ] **4.10** Create Session Intel types
  - **Files to create:**
    - `admin-dashboard/src/types/sessionIntel.ts`
  - **Content:** DailySummary, WeeklySummary, SIEvent, SIAlert interfaces

**Files Created:** 9  
**Files Modified:** 1  
**Commit Message:** `PR-ADMIN-04: Add Session Intelligence monitoring`

---

### **PR-ADMIN-05: Fraud & Experiments Sections** (Week 4, Day 1-3)

**Goal:** Fraud queue management and experiment monitoring

#### Fraud Queue
- [ ] **5.1** Create fraud queue hook
  - **Files to create:**
    - `admin-dashboard/src/hooks/useFraudQueue.ts`
  - **Content:** Call `getFraudQueue`, real-time updates

- [ ] **5.2** Create fraud queue table component
  - **Files to create:**
    - `admin-dashboard/src/components/Tables/FraudQueueTable.tsx`
  - **Content:** Table with approve/reject buttons, batch actions

- [ ] **5.3** Create Fraud Queue page
  - **Files to create:**
    - `admin-dashboard/src/pages/Fraud/FraudQueue.tsx`
  - **Content:** Table, filters, auto-refresh

- [ ] **5.4** Create confirm dialog component
  - **Files to create:**
    - `admin-dashboard/src/components/Common/ConfirmDialog.tsx`
  - **Content:** Reusable confirmation modal

- [ ] **5.5** Create fraud types
  - **Files to create:**
    - `admin-dashboard/src/types/fraud.ts`
  - **Content:** FraudItem, AnomalyScore interfaces

#### Experiments
- [ ] **5.6** Create experiments hook
  - **Files to create:**
    - `admin-dashboard/src/hooks/useExperiments.ts`
  - **Content:** Query `/experiments` collection

- [ ] **5.7** Create experiment table component
  - **Files to create:**
    - `admin-dashboard/src/components/Tables/ExperimentTable.tsx`
  - **Content:** Table with toggle switches, variant details

- [ ] **5.8** Create Experiment List page
  - **Files to create:**
    - `admin-dashboard/src/pages/Experiments/ExperimentList.tsx`
  - **Content:** Experiment cards, filters, actions

- [ ] **5.9** Create experiments types
  - **Files to create:**
    - `admin-dashboard/src/types/experiments.ts`
  - **Content:** Experiment, Variant interfaces

**Files Created:** 9  
**Files Modified:** 0  
**Commit Message:** `PR-ADMIN-05: Add fraud queue and experiments sections`

---

### **PR-ADMIN-06: System Management & Polish** (Week 4-5)

**Goal:** Kill-switches, audit log, user management, system health, deployment

#### Kill-Switches
- [ ] **6.1** Create kill-switches hook
  - **Files to create:**
    - `admin-dashboard/src/hooks/useKillSwitches.ts`
  - **Content:** Call `listKillSwitches`, `toggleKillSwitch`

- [ ] **6.2** Create Kill-Switches page
  - **Files to create:**
    - `admin-dashboard/src/pages/System/KillSwitches.tsx`
  - **Content:** Grid of toggle switches, bulk actions, confirm modal

#### Audit Log
- [ ] **6.3** Create audit log hook
  - **Files to create:**
    - `admin-dashboard/src/hooks/useAuditLog.ts`
  - **Content:** Query `/admin_audit_log`, real-time listener

- [ ] **6.4** Create audit log table component
  - **Files to create:**
    - `admin-dashboard/src/components/Tables/AuditLogTable.tsx`
  - **Content:** Sortable table with filters

- [ ] **6.5** Create Audit Log page
  - **Files to create:**
    - `admin-dashboard/src/pages/System/AuditLog.tsx`
  - **Content:** Table, filters, export, search

#### User Management
- [ ] **6.6** Implement `getUserProfile` Cloud Function
  - **Files to modify:**
    - `functions/src/admin/userProfileApi.ts` (created in PR-ADMIN-01)
  - **Content:** Query user doc, stats, activity, referrals

- [ ] **6.7** Deploy user profile function
  - **Command:** `firebase deploy --only functions:getUserProfile`

- [ ] **6.8** Create user profile hook
  - **Files to create:**
    - `admin-dashboard/src/hooks/useUserProfile.ts`
  - **Content:** Call `getUserProfile` function

- [ ] **6.9** Create user table component
  - **Files to create:**
    - `admin-dashboard/src/components/Tables/UserTable.tsx`
  - **Content:** Search, user list, profile modal

- [ ] **6.10** Create User Management page
  - **Files to create:**
    - `admin-dashboard/src/pages/System/UserManagement.tsx`
  - **Content:** Search, user table, actions (ban, set admin, export data)

- [ ] **6.11** Create user types
  - **Files to create:**
    - `admin-dashboard/src/types/user.ts`
  - **Content:** AdminUser, UserProfile interfaces

#### System Health
- [ ] **6.12** Implement `getSystemHealth` Cloud Function
  - **Files to modify:**
    - `functions/src/admin/systemHealthApi.ts` (created in PR-ADMIN-01)
  - **Content:** Query Cloud Functions stats, Firestore usage, API quotas

- [ ] **6.13** Deploy system health function
  - **Command:** `firebase deploy --only functions:getSystemHealth`

- [ ] **6.14** Create system health hook
  - **Files to create:**
    - `admin-dashboard/src/hooks/useSystemHealth.ts`
  - **Content:** Call `getSystemHealth` function

- [ ] **6.15** Create System Health page
  - **Files to create:**
    - `admin-dashboard/src/pages/System/SystemHealth.tsx`
  - **Content:** Functions status, Firestore usage, API quotas, scheduled jobs

- [ ] **6.16** Create system types
  - **Files to create:**
    - `admin-dashboard/src/types/system.ts`
  - **Content:** SystemHealth, FunctionStatus interfaces

#### Polish & Deployment
- [ ] **6.17** Add loading states to all pages
  - **Files to modify:** All page components
  - **Content:** Use LoadingState component

- [ ] **6.18** Add error states to all pages
  - **Files to modify:** All page components
  - **Content:** Use ErrorState component

- [ ] **6.19** Add empty states to all pages
  - **Files to modify:** All page components
  - **Content:** Use EmptyState component

- [ ] **6.20** Implement responsive design (mobile/tablet)
  - **Files to modify:**
    - `admin-dashboard/src/components/Layout/Sidebar.tsx` (drawer for mobile)
    - `admin-dashboard/src/components/Layout/TopBar.tsx` (hamburger menu)
    - All page components (responsive grid)

- [ ] **6.21** Add constants file
  - **Files to create:**
    - `admin-dashboard/src/utils/constants.ts`
  - **Content:** App constants (loop types, status options, etc.)

- [ ] **6.22** Set up Firebase Hosting
  - **Files to create:**
    - `admin-dashboard/firebase.json`
    - `admin-dashboard/.firebaserc`
  - **Content:** Hosting config for admin.tutorai.app

- [ ] **6.23** Build production bundle
  - **Command:** `npm run build`
  - **Output:** `admin-dashboard/dist/`

- [ ] **6.24** Deploy to Firebase Hosting
  - **Command:** `firebase deploy --only hosting:admin`

- [ ] **6.25** Set admin custom claims for team
  - **Script:** Create script to set admin claims
  - **Files to create:**
    - `functions/scripts/setAdminClaim.ts`
  - **Command:** `ts-node functions/scripts/setAdminClaim.ts <email>`

- [ ] **6.26** Write documentation
  - **Files to create:**
    - `admin-dashboard/README.md` (dev guide)
    - `docs/ADMIN-DASHBOARD-USER-GUIDE.md` (user manual)

**Files Created:** 15  
**Files Modified:** 10+  
**Commit Message:** `PR-ADMIN-06: Add system management, polish UI, and deploy`

---

### **PR-ADMIN-07: SI Summary Aggregator for Admin Dashboard** (Week 5, Day 3-4)

**Goal:** Create backend aggregator to make daily/weekly summaries queryable at top-level for admin dashboard

**Problem:** Currently, daily/weekly summaries are stored in nested collections (`/summaries/{cid}/daily/{date}` and `/summaries/{cid}/weekly/{week}`). The admin dashboard needs to query ALL summaries across ALL conversations, but this requires inefficient collection group queries or manual iteration.

**Solution:** Create a scheduled Cloud Function that copies summaries to flat top-level collections (`/admin_daily_summaries/` and `/admin_weekly_summaries/`) for efficient admin queries.

#### Backend Tasks
- [ ] **7.1** Create admin summary aggregator function
  - **Files to create:**
    - `functions/src/si/adminSummaryAggregator.ts`
  - **Content:** 
    - Scheduled function (runs every 6 hours)
    - Query all `/summaries/{cid}/daily/{date}` via collection group
    - Copy to `/admin_daily_summaries/{cid}_{date}` with metadata
    - Query all `/summaries/{cid}/weekly/{week}` via collection group
    - Copy to `/admin_weekly_summaries/{cid}_{week}` with metadata
    - Add aggregation timestamp and conversation count

- [ ] **7.2** Export aggregator function
  - **Files to modify:**
    - `functions/src/index.ts`
  - **Content:** Export `aggregateAdminSummaries` scheduled function

- [ ] **7.3** Update Firestore security rules
  - **Files to modify:**
    - `firestore.rules`
  - **Content:** 
    - Allow admin read access to `/admin_daily_summaries/` and `/admin_weekly_summaries/`
    - Deny all write access (only Cloud Functions can write)

- [ ] **7.4** Add Firestore indexes for admin summaries
  - **Files to modify:**
    - `firestore.indexes.json`
  - **Content:** 
    - Composite index: `admin_daily_summaries` (date desc, conversationId asc)
    - Composite index: `admin_weekly_summaries` (startDate desc, conversationId asc)

- [ ] **7.5** Deploy aggregator function and indexes
  - **Commands:** 
    - `firebase deploy --only functions:aggregateAdminSummaries`
    - `firebase deploy --only firestore:indexes`

#### Frontend Tasks (Update PR-ADMIN-04)
- [ ] **7.6** Update sessionIntelService to use new collections
  - **Files to modify:**
    - `admin-dashboard/src/services/sessionIntelService.ts`
  - **Content:** 
    - Replace mock data in `getDailySummaries()` with real Firestore queries to `/admin_daily_summaries/`
    - Replace mock data in `getWeeklySummaries()` with real Firestore queries to `/admin_weekly_summaries/`
    - Add filters for date range, conversationId, keywords

- [ ] **7.7** Update SI summaries hook for real-time updates
  - **Files to modify:**
    - `admin-dashboard/src/hooks/useSISummaries.ts`
  - **Content:** 
    - Add Firestore real-time listener for new summaries
    - Add auto-refresh on aggregation timestamp change

- [ ] **7.8** Test admin dashboard with real data
  - **Manual Testing:**
    - Verify daily summaries display correctly
    - Verify weekly summaries display correctly
    - Test filters (date range, conversation ID)
    - Test pagination and search
    - Verify real-time updates when new summaries are aggregated

#### Documentation
- [ ] **7.9** Document aggregator architecture
  - **Files to create:**
    - `docs/SI/ADMIN-SUMMARY-AGGREGATOR.md`
  - **Content:** 
    - Architecture diagram (nested → flat collections)
    - Aggregation schedule (every 6 hours)
    - Data retention policy (keep summaries indefinitely)
    - Query patterns for admin dashboard
    - Troubleshooting guide

**Files Created:** 2  
**Files Modified:** 5  
**Commit Message:** `PR-ADMIN-07: Add SI summary aggregator for admin dashboard`

---

## 📊 Summary Statistics

| PR | Focus Area | Files Created | Files Modified | Estimated Time |
|----|-----------|---------------|----------------|----------------|
| PR-ADMIN-01 | Setup & Auth | 12 | 1 | 2 days |
| PR-ADMIN-02 | Layout & Dashboard | 13 | 1 | 3 days |
| PR-ADMIN-03 | Growth Metrics | 17 | 0 | 5 days |
| PR-ADMIN-04 | Session Intel | 9 | 1 | 5 days |
| PR-ADMIN-05 | Fraud & Experiments | 9 | 0 | 3 days |
| PR-ADMIN-06 | System & Deploy | 15 | 10+ | 7 days |
| PR-ADMIN-07 | SI Summary Aggregator | 2 | 5 | 2 days |
| **TOTAL** | **7 PRs** | **77** | **18+** | **27 days** |

---

## 🎯 Dependency Chain

```
PR-ADMIN-01 (Setup & Auth)
    ↓
PR-ADMIN-02 (Layout & Dashboard) ← Independent
    ↓
    ├─→ PR-ADMIN-03 (Growth Metrics) ← Independent
    ├─→ PR-ADMIN-04 (Session Intel) ← Independent (shows mock data)
    ├─→ PR-ADMIN-05 (Fraud & Experiments) ← Independent
    └─→ PR-ADMIN-06 (System & Deploy) ← Requires all above
         ↓
         PR-ADMIN-07 (SI Summary Aggregator) ← Replaces mock data in PR-ADMIN-04
```

**Parallelization:**
- PR-ADMIN-03, PR-ADMIN-04, PR-ADMIN-05 can be worked on in parallel after PR-ADMIN-02
- PR-ADMIN-07 can be done anytime after PR-ADMIN-04 is deployed (optional for MVP)

---

## 🔗 Integration Points

### Existing Systems
- **PR29 Backend APIs**: Already deployed, no changes needed
- **Firestore Collections**: `/users`, `/experiments`, `/experiment_events`, `/fraud_queue`, `/admin_audit_log`, `/feature_flags`, `/summaries`, `/si_analytics`
- **Firebase Auth**: Custom claims for admin role

### New Backend Functions Required
1. `getSISummaries(conversationId?, dateRange?, limit?)`
2. `getSystemHealth()`
3. `getUserProfile(userId)`

---

## ✅ Pre-Deployment Checklist

### Before Each PR
- [ ] Run TypeScript type check: `npm run type-check`
- [ ] Run linter: `npm run lint`
- [ ] Run tests (if any): `npm test`
- [ ] Build production: `npm run build`
- [ ] Manual testing in browser
- [ ] Git commit with descriptive message
- [ ] Git push to GitHub

### Before Final Deployment (PR-ADMIN-06)
- [ ] All backend functions deployed
- [ ] All Firestore indexes created
- [ ] Admin custom claims set for team
- [ ] Firebase Hosting configured
- [ ] SSL certificate verified
- [ ] User documentation complete
- [ ] Developer documentation complete
- [ ] Performance benchmarks met (< 2s load time)
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Security audit passed (no exposed admin endpoints)

---

## 📝 Git Commit Message Format

```
PR-ADMIN-XX: <Brief description>

<Detailed description of changes>

Files created:
- path/to/file1.tsx
- path/to/file2.ts

Files modified:
- path/to/modified1.tsx
- path/to/modified2.ts

Features:
- Feature 1
- Feature 2

Testing:
- Test scenario 1
- Test scenario 2
```

---

## 🚀 Getting Started

1. **Clone repository**
   ```bash
   cd /Users/tahmeedrahim/Projects/MessageAI
   ```

2. **Create admin-dashboard directory**
   ```bash
   mkdir admin-dashboard
   cd admin-dashboard
   ```

3. **Start with PR-ADMIN-01**
   - Follow task checklist
   - Create files as specified
   - Test each component
   - Commit and push

4. **Track progress**
   - Check off completed tasks in this document
   - Update PR status in GitHub
   - Review with team before moving to next PR

---

**Ready to start implementation?** Begin with PR-ADMIN-01! 🚀

