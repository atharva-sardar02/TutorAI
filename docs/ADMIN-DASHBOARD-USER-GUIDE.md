# TutorAI Admin Dashboard - User Guide

**Version**: 1.0.0  
**Last Updated**: November 5, 2025

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Growth Metrics](#growth-metrics)
4. [Session Intelligence](#session-intelligence)
5. [Fraud Detection](#fraud-detection)
6. [Experiments](#experiments)
7. [System Management](#system-management)
8. [Audit Log](#audit-log)
9. [Best Practices](#best-practices)
10. [FAQ](#faq)

---

## Getting Started

### Logging In

1. Navigate to the admin dashboard URL
2. Enter your admin email and password
3. Click **Sign In**
4. If login fails, verify your account has admin privileges

### Navigation

The dashboard uses a **sidebar navigation** with the following sections:

- **Dashboard**: Overview and key metrics
- **Growth Metrics**: K-Factor, Funnel, Retention, Percentile
- **Session Intelligence**: Daily/Weekly Summaries, Analytics
- **Fraud Detection**: Review queue for suspicious activity
- **Experiments**: A/B test management
- **System & Health**: Kill switches, User management, System health
- **Audit Log**: Admin action history

---

## Dashboard Overview

The main dashboard provides at-a-glance insights:

### Key Metrics Cards
- **Total Users**: Current user count
- **Active Today**: Users active in the last 24h
- **Weekly Growth**: New signups this week
- **K-Factor**: Current viral coefficient

### Quick Stats
- **Pending Fraud**: Items requiring review
- **Active Experiments**: Running A/B tests

### Recent Activity
- Latest admin actions
- System events
- User signups

---

## Growth Metrics

### K-Factor Dashboard

**Purpose**: Track viral growth coefficient by loop type

**How to Use**:
1. Navigate to **Growth Metrics → K-Factor**
2. Select date range (7d, 30d, 90d, custom)
3. Filter by loop type (all, referral, study buddy, etc.)
4. View trend chart and loop comparison table
5. Export data to CSV if needed

**Key Insights**:
- K-Factor > 1.0 = Viral growth
- K-Factor < 1.0 = Growth requires marketing spend
- Compare loop types to identify top performers

### Conversion Funnel

**Purpose**: Analyze user journey and identify drop-off points

**Stages**:
1. Signup
2. Profile Complete
3. First Session
4. First Referral
5. Active User

**How to Use**:
1. Navigate to **Growth Metrics → Funnel**
2. View funnel chart with conversion rates
3. Identify stages with highest drop-off
4. Use insights to optimize onboarding

### Retention Analysis

**Purpose**: Monitor cohort retention over time

**How to Use**:
1. Navigate to **Growth Metrics → Retention**
2. View retention curves (Day 1, 7, 30)
3. Compare cohorts by signup date
4. Identify retention improvement opportunities

### Percentile Monitor

**Purpose**: View XP distribution by role (Tutor/Parent)

**Metrics**:
- Total users per role
- Average XP
- Median XP
- Top 10% threshold

**How to Use**:
1. Navigate to **Growth Metrics → Percentile**
2. View histogram of XP distribution
3. Compare tutor vs parent engagement
4. Use for gamification tuning

---

## Session Intelligence

### Daily Summaries

**Purpose**: View aggregated session summaries by day

**How to Use**:
1. Navigate to **Session Intel → Daily Summaries**
2. Browse summary cards
3. Expand to view full transcript excerpts
4. Filter by conversation or date range

**Features**:
- Message count
- Recording count
- Participants
- Keywords
- Sentiment analysis

### Weekly Summaries

**Purpose**: Track weekly progress and trends

**How to Use**:
1. Navigate to **Session Intel → Weekly Summaries**
2. View weekly cards
3. Check reel generation status
4. Review week-over-week progress

### SI Analytics

**Purpose**: Monitor transcription health and system errors

**Metrics**:
- Total recordings
- Total transcriptions
- Average processing time
- Error rate
- Active alerts

**How to Use**:
1. Navigate to **Session Intel → Analytics**
2. View event timeline
3. Check error rates
4. Review alerts dashboard
5. Take action on critical alerts

---

## Fraud Detection

### Fraud Queue

**Purpose**: Review and manage suspicious referrals

**How to Use**:

#### Reviewing Items
1. Navigate to **Fraud Detection**
2. View pending fraud items
3. Check anomaly score and reasons
4. Click **Approve** or **Reject** for each item

#### Batch Operations
1. Select multiple items (checkboxes)
2. Click **Approve Selected** or **Reject Selected**
3. Confirm action in dialog

#### Filters
- **Status**: Pending, Approved, Rejected
- **Loop Type**: Filter by viral loop
- **Min Score**: Set anomaly threshold

**Anomaly Reasons**:
- Rapid signup
- Device cluster
- IP cluster
- Suspicious pattern
- Clickbait behavior

**Best Practices**:
- Review high-score items (>70%) daily
- Approve legitimate referrals quickly to avoid user frustration
- Document rejection reasons for audit trail
- Monitor for false positives

---

## Experiments

### Managing A/B Tests

**Purpose**: Control active experiments and view results

**How to Use**:

#### Viewing Experiments
1. Navigate to **Experiments**
2. View list of all experiments
3. Expand row to see variant details
4. Check metrics and target audience

#### Activating/Deactivating
1. Toggle the switch for an experiment
2. Confirm action in dialog
3. Monitor metrics after activation

**Experiment Details**:
- Variants and weights
- Target audience (role, age, percentage)
- Success metrics
- Start/end dates

**Best Practices**:
- Run experiments for minimum 7 days
- Ensure adequate sample size
- Monitor for unexpected behavior
- Deactivate losing variants quickly

---

## System Management

### Kill Switches

**Purpose**: Toggle feature flags to enable/disable features

**Categories**:
- **System**: Fraud detection, critical systems
- **Loops**: Viral growth loops
- **Features**: Product features

**How to Use**:
1. Navigate to **System & Health → Kill Switches**
2. Review switch categories
3. Toggle switch on/off
4. Confirm action (especially for critical/high impact)

**Impact Levels**:
- **Critical**: May break core functionality
- **High**: Significant user impact
- **Medium**: Moderate user impact
- **Low**: Minimal impact

**Warning**: Always verify before disabling critical features!

### User Management

**Purpose**: Search, view, and manage user accounts

**How to Use**:

#### Searching Users
1. Navigate to **System & Health → User Management**
2. Enter email or name in search box
3. Filter by role (Tutor/Parent)
4. Filter by status (Active/Banned)

#### Viewing Profiles
1. Click **View** (eye icon) on user row
2. Review detailed profile:
   - Basic info (email, UID, role)
   - Stats (XP, sessions, messages, referrals)
   - Ban status and history

#### Banning Users
1. Click **Ban** (block icon) on user row
2. Enter reason for ban
3. Click **Ban User** to confirm
4. User will be unable to access app

#### Unbanning Users
1. Click **Unban** (checkmark icon) on banned user
2. Confirm action
3. User regains access immediately

#### Exporting Data
1. Apply desired filters
2. Click **Export** button
3. CSV file downloads with user data

**Best Practices**:
- Always document ban reasons
- Review ban appeals promptly
- Export data before bulk changes
- Monitor user activity after unban

### System Health

**Purpose**: Monitor system status and resource usage

**Sections**:

#### Firestore Usage (24h)
- Reads
- Writes
- Deletes
- Storage size

#### Storage & API Quotas
- Storage usage (GB)
- OpenAI quota
- Firebase quota
- Progress bars show % used

#### Cloud Functions
- Function status (healthy/degraded/down)
- Error rate
- Average duration
- Invocations (24h)

#### Scheduled Jobs
- Job schedule (cron)
- Last run
- Next run
- Status (success/failed)

**How to Use**:
1. Navigate to **System & Health**
2. Review all sections for anomalies
3. Check error rates for Cloud Functions
4. Monitor quota usage to avoid overages

**Alert Thresholds**:
- **Storage**: >80% = Warning
- **API Quota**: >80% = Warning
- **Error Rate**: >5% = Critical

---

## Audit Log

**Purpose**: Track all admin actions and system events

**How to Use**:

#### Viewing Logs
1. Navigate to **Audit Log**
2. Browse recent entries
3. View admin, action, resource, status

#### Filtering
- **Status**: Success, Failed, All
- **Search**: Filter by admin email, action, or resource

#### Exporting
1. Apply desired filters
2. Click **Export** button
3. CSV file downloads with audit data

**Logged Actions**:
- Fraud approvals/rejections
- User bans/unbans
- Kill switch toggles
- Experiment activations
- Data exports

**Use Cases**:
- Security audits
- Compliance reporting
- Investigating incidents
- Team accountability

---

## Best Practices

### Daily Tasks
- [ ] Review pending fraud items (5-10 min)
- [ ] Check system health dashboard (2 min)
- [ ] Review SI alerts (if any)

### Weekly Tasks
- [ ] Export and review audit log
- [ ] Check experiment results
- [ ] Review K-Factor trends
- [ ] Monitor retention cohorts

### Monthly Tasks
- [ ] Export user data for backup
- [ ] Review and adjust feature flags
- [ ] Analyze growth metrics trends
- [ ] Update experiment roadmap

### Security
- ✅ Use strong, unique password
- ✅ Enable 2FA if available
- ✅ Never share admin credentials
- ✅ Log out when done
- ✅ Review audit log regularly

### Performance
- ✅ Use filters to reduce data load
- ✅ Export large datasets instead of viewing in-browser
- ✅ Clear browser cache if dashboard is slow
- ✅ Use latest Chrome/Firefox for best experience

---

## FAQ

### Q: I can't log in. What should I do?
**A**: Verify your account has admin custom claims set. Contact a developer to run: `npx ts-node scripts/setAdminClaim.ts your@email.com admin`

### Q: Why do I see "Missing or insufficient permissions"?
**A**: Your account lacks admin privileges or Firestore rules haven't been deployed. Check with the development team.

### Q: How often is data refreshed?
**A**: Auto-refresh intervals vary:
- Fraud Queue: 30 seconds
- Audit Log: 30 seconds
- Experiments: 60 seconds
- System Health: 2 minutes

### Q: Can I undo a ban?
**A**: Yes, use the **Unban** button on the user's row in User Management.

### Q: What happens when I approve a fraud item?
**A**: The referral is marked as legitimate and rewards are issued (if applicable).

### Q: Can I export data?
**A**: Yes, most sections have an **Export** button that generates a CSV file.

### Q: What do I do if a kill switch won't toggle?
**A**: Check the browser console for errors. Verify your admin permissions and Firestore rules.

### Q: How do I create a new experiment?
**A**: Currently, experiments must be created via Cloud Function or script. Contact the development team.

### Q: What's the difference between Daily and Weekly summaries?
**A**: Daily summaries aggregate messages and recordings per day. Weekly summaries roll up 7 days of data and generate Progress Reels.

### Q: Why is System Health showing mock data?
**A**: The `getSystemHealth` Cloud Function uses mock data for MVP. Production implementation will query Google Cloud Monitoring API.

---

## Support

For technical issues or questions:
- Check this guide first
- Review the [Admin Dashboard README](../admin-dashboard/README.md)
- Contact the development team
- Report bugs via GitHub Issues

---

**Happy Administering! 🚀**

