# TutorAI Admin Dashboard - Product Requirements Document

**Version:** 1.0  
**Date:** November 5, 2025  
**Status:** Planning  
**Owner:** Engineering Team

---

## 📋 Executive Summary

Build a comprehensive web-based admin dashboard that provides real-time visibility into TutorAI's operations, growth metrics, user activity, Session Intelligence summaries, and system health. This dashboard will be the central command center for monitoring viral growth loops, K-factor performance, fraud detection, user engagement, and content quality.

---

## 🎯 Goals & Objectives

### Primary Goals
1. **Operational Visibility**: Single-pane-of-glass view of all app activities
2. **Data-Driven Decisions**: Real-time metrics for growth, retention, and engagement
3. **Proactive Monitoring**: Catch issues before they impact users
4. **Quality Control**: Review Session Intelligence summaries and user-generated content
5. **Growth Optimization**: Track viral loops, K-factor, and experiment performance

### Success Metrics
- Admin actions reduce fraud by 80%
- K-factor insights lead to 25% increase in viral coefficient
- Dashboard load time < 2 seconds
- 100% of critical metrics visible in <3 clicks
- Weekly summary review rate > 90%

---

## 👥 Users & Personas

### 1. **Admin** (Full Access)
- **Who**: Founders, Product Managers
- **Needs**: Complete system visibility, ability to take actions
- **Access**: All sections, all write operations

### 2. **Analyst** (Read-Only)
- **Who**: Data Scientists, Growth Marketers
- **Needs**: Metrics, charts, export capabilities
- **Access**: All sections, read-only

### 3. **Support** (Limited Access)
- **Who**: Customer Support Team
- **Needs**: Fraud queue, user issues, audit logs
- **Access**: Fraud queue, audit logs only

---

## 🏗️ System Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript
- **UI Library**: Material-UI (MUI) v5
- **Charts**: Recharts
- **State Management**: React Query + Context API
- **Routing**: React Router v6
- **Auth**: Firebase Authentication
- **Backend**: Firebase Cloud Functions (already deployed)
- **Database**: Firestore (real-time listeners)
- **Hosting**: Firebase Hosting

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                     Firebase Hosting                             │
│                  (admin.tutorai.app)                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ HTTPS
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   React Admin Dashboard                          │
│  ┌────────────┬────────────┬────────────┬────────────────────┐ │
│  │ Dashboard  │  Growth    │  Session   │  System            │ │
│  │ Overview   │  Metrics   │  Intel     │  Management        │ │
│  └────────────┴────────────┴────────────┴────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
┌─────────────────┐ ┌─────────────┐ ┌──────────────────┐
│ Cloud Functions │ │  Firestore  │ │ Firebase Auth    │
│ (Admin APIs)    │ │ (Real-time) │ │ (Admin Claims)   │
└─────────────────┘ └─────────────┘ └──────────────────┘
```

---

## 📊 Feature Requirements

### 1. Dashboard Overview Page

**Purpose**: High-level snapshot of key metrics

#### 1.1 Key Metrics Cards
- **Total Users** (Tutors / Parents)
- **Active Today** (24h activity)
- **Weekly Growth Rate** (% change)
- **Current K-Factor** (latest 7-day rolling average)
- **Viral Conversion Rate** (invite → signup)
- **Session Intelligence Activity** (recordings/day, transcripts/day)

#### 1.2 Quick Stats
- Pending fraud reviews
- Active experiments
- System health status
- Last data refresh timestamp

#### 1.3 Recent Activity Feed
- Last 20 admin actions (from audit log)
- Real-time event stream (new signups, challenges, referrals)

---

### 2. Growth Metrics Section

#### 2.1 K-Factor Dashboard
**Existing Backend**: `getKFactorMetrics` ✅

**UI Components:**
- **Time-Series Chart**: K-factor over time (7d, 30d, 90d filters)
- **Loop Comparison Table**: Side-by-side K-factor by loop type
  - Tutor Card
  - Progress Reel
  - Study Buddy
  - Parent Pod
  - Tutor Peer
  - Parent-Child Challenge
- **Experiment Breakdown**: K-factor by experiment variant
- **Export**: Download CSV with raw data

**Features:**
- Date range selector
- Loop type filter
- Experiment/variant filter
- Real-time refresh (every 5 minutes)
- Drill-down to daily metrics

#### 2.2 Viral Funnel Visualization
**Existing Backend**: `getFunnelMetrics` ✅

**UI Components:**
- **Funnel Chart**: 
  1. Exposed → 2. Invite Sent → 3. Invite Opened → 4. Join Completed → 5. FVM Reached
- **Conversion Rates**: % drop-off at each stage
- **Cohort Analysis**: Funnel by date range, experiment, variant

**Features:**
- Interactive funnel (click stage to see users)
- Benchmark comparisons (current vs last period)
- Anomaly detection (highlight unusual drops)

#### 2.3 Retention Metrics
**Existing Backend**: `getRetentionMetrics` ✅

**UI Components:**
- **Cohort Retention Table**: D1, D7, D28 retention by signup date
- **Retention Curve Chart**: Visualize retention decay
- **Retention by Source**: Compare organic vs referred users

**Features:**
- Cohort date selector
- Retention day selector (D1, D3, D7, D14, D28, D90)
- Export to CSV

#### 2.4 Percentile System Monitoring
**New Feature** (just implemented)

**UI Components:**
- **Percentile Distribution Chart**: Histogram of user percentiles
- **Role Comparison**: Tutor vs Parent percentile stats
- **XP Trends**: Monthly XP by cohort
- **Challenge Participation**: Monthly challenges completed

**Data Source:** Query `users/{uid}.stats` field

---

### 3. Session Intelligence Section

#### 3.1 Daily Summaries Monitor
**New Feature**

**Data Source:** `/summaries/{conversationId}/daily/{dateStr}`

**UI Components:**
- **Summary Feed**: List of all daily summaries
  - Conversation ID
  - Date
  - Total recordings
  - Total duration (formatted)
  - Topics covered
  - Quality score
  - Expand to see full summary + highlights
- **Search & Filter**:
  - By conversation ID
  - By date range
  - By topic (keyword search)
  - By quality score (min threshold)
- **Batch Actions**:
  - Flag for review
  - Export selected summaries

**Features:**
- Real-time updates (Firestore listener)
- Pagination (50 per page)
- Full-text search in summary content
- Copy summary to clipboard
- View associated recordings

#### 3.2 Weekly Summaries Monitor
**New Feature**

**Data Source:** `/summaries/{conversationId}/weekly/{weekId}`

**UI Components:**
- **Weekly Summary Cards**:
  - Week ID (e.g., "2025-W44")
  - Date range (Nov 4-10, 2025)
  - Conversation ID
  - Total recordings this week
  - Total study time (formatted: "2h 45m")
  - Topics covered (chips)
  - Highlights (5-7 bullets)
  - Quality score
  - Reel status (pending/processing/complete/failed)
- **Week Navigator**: Calendar view to jump to specific week
- **Search & Filter**:
  - By conversation ID
  - By week ID
  - By topic
  - By reel status

**Features:**
- Expandable cards (click to see full details)
- View associated daily summaries
- Regenerate reel button (for failed reels)
- Export week summary to PDF

#### 3.3 SI Analytics
**New Feature**

**Data Source:** `/si_analytics/{eventId}`

**UI Components:**
- **Event Timeline**: Time-series of SI events
  - transcription_started
  - transcription_succeeded
  - transcription_failed
  - daily_summary_generated
  - weekly_summary_generated
  - reel_generated
- **Error Rate Chart**: Failed transcriptions vs total
- **Performance Metrics**:
  - Average transcription time
  - Average summary generation time
  - Success rate by event type
- **Alerts Dashboard**:
  - Show recent alerts (from `si_alerts` collection)
  - Alert severity (low/medium/high)
  - Alert type (quota/error/network)

---

### 4. Fraud Management Section

#### 4.1 Fraud Queue
**Existing Backend**: `getFraudQueue`, `approveFraudItem`, `rejectFraudItem` ✅

**UI Components:**
- **Fraud Queue Table**:
  - Referral ID
  - User ID (clickable → user profile)
  - Anomaly score (color-coded: red >85, yellow >70, green <70)
  - Flags (velocity, device_reuse, ip_cluster, etc.)
  - Flagged date/time
  - Status (pending/approved/rejected)
  - Actions: Approve, Reject, Ban User
- **Filters**:
  - Status filter (pending/approved/rejected/all)
  - Min anomaly score slider
  - Date range
- **Batch Operations**:
  - Select multiple items
  - Bulk approve/reject

**Features:**
- Auto-refresh every 30 seconds
- Sort by score, date, user
- Export queue to CSV
- View user history (previous referrals, activity)
- One-click ban with reason input

---

### 5. Experiments & A/B Testing Section

#### 5.1 Experiment List
**Existing Backend**: `listExperiments` (from PR17) ✅

**UI Components:**
- **Experiment Cards**:
  - Experiment ID & Name
  - Loop type
  - Status (active/paused/completed)
  - Start/end dates
  - Variants (with allocation %)
  - Current K-factor per variant
  - Winner (if determined)
- **Actions**:
  - Pause/Resume experiment
  - Adjust rollout %
  - Declare winner
  - Archive experiment

**Features:**
- Filter by status, loop type
- Sort by K-factor, start date
- View detailed metrics per variant

---

### 6. Kill-Switches & Feature Flags Section

#### 6.1 Kill-Switch Panel
**Existing Backend**: `listKillSwitches`, `toggleKillSwitch` ✅

**UI Components:**
- **Feature Flag Grid**:
  - Feature name (orchestrator, incentives, tutor_card, progress_reel, etc.)
  - Status toggle (enabled/disabled)
  - Last modified date/time
  - Last modified by (admin email)
  - Fallback status indicator (✓ verified)
- **Bulk Actions**:
  - Enable/disable all features
  - Emergency kill-switch (disable all growth features)

**Features:**
- Real-time status updates
- Confirmation modal for critical features
- Audit log integration
- Health check on disable (verify fallback works)

---

### 7. System Management Section

#### 7.1 Audit Log
**Existing Backend**: `/admin_audit_log` collection ✅

**UI Components:**
- **Audit Log Table**:
  - Timestamp
  - Admin name/email
  - Action (pause_experiment, approve_fraud, disable_killswitch, etc.)
  - Target (experiment ID, referral ID, feature name)
  - Metadata (additional context)
- **Filters**:
  - Admin user
  - Action type
  - Date range
  - Target type

**Features:**
- Export to CSV
- Search by target ID
- Real-time updates

#### 7.2 User Management
**New Feature**

**UI Components:**
- **User Search**: Search by email, UID, display name
- **User Profile View**:
  - Basic info (name, email, role, created date)
  - Stats (monthly XP, percentile, challenges)
  - Activity (last seen, total messages, sessions)
  - Referrals (sent/received)
  - Fraud score (if any)
- **Actions**:
  - Set admin role
  - Ban user
  - Reset password
  - Export user data (DSR)
  - Delete user (DSR)

#### 7.3 System Health
**New Feature**

**UI Components:**
- **Cloud Functions Status**:
  - List all functions with execution count, errors, avg duration
  - Alert if error rate > 5%
- **Firestore Usage**:
  - Document reads/writes per day
  - Storage size
  - Cost estimate
- **API Quotas**:
  - OpenAI API usage (transcription, summarization)
  - Firebase quota (auth, functions, storage)
- **Scheduled Jobs Status**:
  - Last run time for each scheduled function
  - Next scheduled run
  - Success/failure status

---

## 🎨 UI/UX Design Guidelines

### Design System
- **Color Palette**:
  - Primary: #1DB954 (Spotify green - matches percentile cards)
  - Secondary: #007AFF (Blue - matches app)
  - Error: #FF3B30
  - Warning: #FF9F0A
  - Success: #34C759
  - Background: #F0F2F5 (light), #1C1C1E (dark)

### Layout
- **Sidebar Navigation**: Sticky left sidebar with sections
- **Top Bar**: Admin name, notifications, quick actions, logout
- **Main Content**: Responsive grid (1-3 columns depending on screen size)
- **Mobile**: Responsive (but admin dashboard is desktop-first)

### Components
- **Material-UI** components for consistency
- **Custom Chart Components** using Recharts
- **Loading States**: Skeleton loaders (not spinners)
- **Error States**: Friendly error messages with retry buttons
- **Empty States**: Helpful illustrations and CTAs

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- High contrast mode

---

## 🔐 Security & Access Control

### Authentication
- Firebase Authentication (email/password)
- Admin accounts require custom claims: `{ admin: true }`
- Session timeout: 8 hours

### Authorization (Role-Based)
- **Admin**: Full access
- **Analyst**: Read-only (no write operations)
- **Support**: Fraud queue + audit log only

### Firestore Rules
```javascript
// Admin collections require admin claim
match /admin_audit_log/{logId} {
  allow read: if request.auth.token.admin == true;
  allow write: if false; // Only Cloud Functions write
}

match /feature_flags/{flagId} {
  allow read: if request.auth.token.admin == true;
  allow write: if false; // Only via Cloud Functions
}
```

### Audit Trail
- All admin actions logged to `/admin_audit_log`
- Includes: timestamp, admin email, action, target, IP address

---

## 📊 Data Schema

### Backend APIs (Already Deployed)
1. `getKFactorMetrics(loopType?, experimentId?, variantId?, startDate, endDate)`
2. `getFunnelMetrics(loopType?, experimentId?, variantId?, startDate, endDate)`
3. `getRetentionMetrics(cohortDate, retentionDays[])`
4. `getFraudQueue(status?, minScore?, limit?)`
5. `approveFraudItem(referralId)`
6. `rejectFraudItem(referralId, reason)`
7. `listKillSwitches()`
8. `toggleKillSwitch(target, enabled)`

### New Backend APIs Needed
1. `getSessionIntelligenceSummaries(conversationId?, dateRange?, limit?)`
   - Returns daily/weekly summaries
2. `getSystemHealthMetrics()`
   - Returns Cloud Functions stats, quotas, scheduled job status
3. `getUserProfile(userId)`
   - Returns full user profile with stats
4. `getSIAnalytics(eventType?, startDate, endDate)`
   - Returns SI event metrics and alerts

---

## 🚀 Implementation Plan

### Phase 1: Setup & Core Dashboard (Week 1)
- [ ] Create React app with TypeScript + Material-UI
- [ ] Set up Firebase SDK (auth, Firestore, functions)
- [ ] Implement auth flow (login, role check, logout)
- [ ] Build sidebar navigation
- [ ] Create Dashboard Overview page with metric cards
- [ ] Integrate existing admin APIs (K-factor, funnel, retention)

### Phase 2: Growth & Fraud Sections (Week 2)
- [ ] Build K-Factor Dashboard with charts
- [ ] Build Viral Funnel visualization
- [ ] Build Retention metrics page
- [ ] Build Percentile System monitoring page
- [ ] Build Fraud Queue with approve/reject actions
- [ ] Implement batch operations for fraud queue

### Phase 3: Session Intelligence Section (Week 3)
- [ ] Create backend API: `getSessionIntelligenceSummaries`
- [ ] Build Daily Summaries Monitor
- [ ] Build Weekly Summaries Monitor
- [ ] Create SI Analytics dashboard
- [ ] Implement search & filter for summaries

### Phase 4: System Management (Week 4)
- [ ] Build Experiment List page
- [ ] Build Kill-Switch Panel
- [ ] Build Audit Log viewer
- [ ] Create backend API: `getUserProfile`
- [ ] Build User Management page
- [ ] Create backend API: `getSystemHealthMetrics`
- [ ] Build System Health dashboard

### Phase 5: Polish & Deploy (Week 5)
- [ ] Add loading states, error states, empty states
- [ ] Implement real-time updates (Firestore listeners)
- [ ] Add export functionality (CSV, PDF)
- [ ] Mobile responsiveness
- [ ] Performance optimization (lazy loading, caching)
- [ ] Deploy to Firebase Hosting
- [ ] Set up admin custom claims for team
- [ ] Write documentation

---

## 📈 Success Metrics

### Product Metrics
- [ ] Dashboard load time < 2 seconds
- [ ] All critical metrics visible in < 3 clicks
- [ ] Zero unauthorized access attempts
- [ ] 100% of admin actions logged

### Business Metrics
- [ ] Fraud approval/rejection time < 5 minutes
- [ ] K-factor insights lead to 25% viral improvement
- [ ] Session Intelligence review rate > 90%
- [ ] System health issues detected < 1 hour

---

## 🧪 Testing Strategy

### Unit Tests
- React component tests (Jest + React Testing Library)
- API hook tests
- Chart rendering tests

### Integration Tests
- Auth flow (login, logout, role check)
- API calls to Cloud Functions
- Firestore listeners

### E2E Tests
- Admin login → View K-factor chart → Export data
- Admin login → Approve fraud item → Verify audit log
- Admin login → Toggle kill-switch → Verify feature disabled

### Manual Testing
- Test all user roles (Admin, Analyst, Support)
- Test on multiple browsers (Chrome, Firefox, Safari)
- Test mobile responsiveness
- Test with real data (staging environment)

---

## 📋 Definition of Done

- [ ] All 7 sections implemented and functional
- [ ] All existing backend APIs integrated
- [ ] New backend APIs deployed (SI summaries, system health, user profile)
- [ ] Role-based access working (Admin, Analyst, Support)
- [ ] Real-time updates working (Firestore listeners)
- [ ] Export functionality working (CSV, PDF)
- [ ] Loading, error, and empty states for all pages
- [ ] Mobile responsive (tablet and phone)
- [ ] Audit trail logs all admin actions
- [ ] Deployed to Firebase Hosting (admin.tutorai.app)
- [ ] Documentation complete (user guide + developer guide)
- [ ] Performance benchmarks met (< 2s load time)

---

## 🔗 Dependencies

### External Services
- Firebase Authentication
- Firebase Firestore
- Firebase Cloud Functions
- Firebase Hosting
- OpenAI API (indirect, via backend)

### Internal Dependencies
- PR17 (Experiments) - for experiment list
- PR22 (Fraud Detection) - for fraud queue
- PR28 (Agent Logs) - for audit trail
- PR19/PR27 (Progress Reels) - for reel monitoring
- SI System (PR SI-01 to SI-11) - for summaries
- Percentile System - for user stats

---

## 🎯 Future Enhancements (Post-MVP)

1. **Advanced Analytics**
   - Predictive K-factor modeling
   - Churn risk scoring
   - LTV prediction by cohort

2. **Alerts & Notifications**
   - Email/Slack alerts for critical metrics
   - Anomaly detection (sudden K-factor drop)
   - Daily digest emails

3. **A/B Test Automation**
   - Auto-pause low-performing variants
   - Auto-declare winners based on statistical significance

4. **Content Moderation**
   - Review user-uploaded recordings
   - Flag inappropriate content
   - AI-powered moderation queue

5. **Custom Reports**
   - Drag-and-drop report builder
   - Scheduled report generation
   - White-label PDF exports

---

## ✅ Sign-off

**Stakeholders:**
- [ ] Product Manager - Approved design and scope
- [ ] Engineering Lead - Approved technical approach
- [ ] Security Team - Approved auth and access control
- [ ] Operations Team - Approved monitoring capabilities

**Next Steps:**
1. Create GitHub project with all tasks
2. Set up React app repository
3. Begin Phase 1 implementation
4. Schedule weekly check-ins

---

**Document Version History:**
- v1.0 (Nov 5, 2025) - Initial PRD

