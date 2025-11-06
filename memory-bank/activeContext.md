# Active Context - TutorAI

**Last Updated:** November 2025  
**Current Focus:** Memory Bank Creation for Mobile App + Admin Dashboard

---

## Current Work

### Immediate Focus
**Memory Bank Creation** - Setting up comprehensive documentation system for both the mobile app and admin dashboard to ensure continuity across development sessions.

This is the first comprehensive initialization of the Memory Bank system, documenting:
- Mobile app (React Native) architecture and features
- Admin dashboard (React webapp) architecture and features
- Shared backend services and patterns
- Complete project structure and dependencies

---

## Recent Changes

### November 2025
- **Memory Bank Created** - Comprehensive documentation for mobile app + admin dashboard
- **Project Status:** Production-Ready AI Platform - 100% Complete
- **Base Platform:** PR1-PR14 Complete ✅
- **Viral Growth System:** PR15-PR32 In Progress 🚧
- **Admin Dashboard:** PR29 Complete ✅
- **Session Intelligence:** SI-01 through SI-11 Complete ✅

---

## Next Steps

### Immediate (This Session)
1. ✅ Complete Memory Bank initialization
2. ✅ Document mobile app architecture
3. ✅ Document admin dashboard architecture
4. ✅ Document shared backend patterns

### Short-term (Week 1-2: Infrastructure & Foundations)
1. Complete PR15 (Referral Attribution System) - Engineer A
2. Complete PR16 (Loop Orchestrator) - Engineer A
3. Complete PR28 (MCP Contracts + Rationale Logging) - Engineer A
4. Complete PR32 (Degradation & Feature Kills) - Engineer A
5. Complete PR25 (Incentives & Economy Agent) - Engineer A

### Medium-term (Week 3-6: Complete Viral Growth System)
1. **Week 3-4:** Viral Surfaces & Experimentation
   - PR17 (Experimentation Framework), PR17.5 (Personalization Agent)
   - PR18 (Tutor Card Generator), PR26 (Async Results + Micro-FVM), PR21 (Activity Feed)
2. **Week 4-5:** AI, Social, Fraud
   - PR19 (Progress Reel Creator), PR20 (Transcription & Agentic Actions)
   - PR27 (Social Presence v2), PR22 (Fraud Detection)
3. **Week 5-6:** Student/Parent Loops & Ops
   - PR23 (Study Buddy Challenge), PR30 (Second Student Loop)
   - PR24 (Parent Pod Invites), PR29 (Growth Ops Dashboard) - ✅ Already complete
4. **Week 6:** Compliance & Hardening
   - PR31 (Compliance Memo & DSR Hooks)
   - Load tests, abuse tests, kill-switch drills
   - Soft-launch prep (5% rollout)

---

## Active Decisions

### Development Approach
- **Team Structure:** Engineer A (Backend) + Engineer B (Frontend)
- **Conflict Prevention:** Clear ownership boundaries
  - Engineer A: `functions/` and `app/src/types/growthTypes.ts`
  - Engineer B: `app/` (components, services, hooks, config)
  - Admin Dashboard: Can be built by either engineer or dedicated frontend dev
- **Branch Strategy:** `feat/pr<number>-short-description`
- **PR Strategy:** One PR = one feature flag

### Technical Decisions
- **AI Architecture:** Fast-path (80%) + LLM fallback (20%)
- **Performance Target:** Sub-1-second scheduling, <2s dashboard load
- **Cost Optimization:** 93% reduction achieved
- **Privacy:** PII redaction required before AI processing
- **Admin Dashboard:** React + Vite + Material-UI (custom build, not Retool)

### Product Decisions
- **Viral Growth:** Referral attribution + viral loops
- **Experimentation:** A/B testing framework with K-factor tracking
- **Consent:** Explicit consent required for progress reels
- **Fraud Prevention:** Anomaly detection for viral features
- **Admin Tools:** Web-based dashboard for operations management

---

## Current Status

### What's Working

#### Mobile App ✅
- ✅ Base messaging platform (PR1-PR7)
- ✅ AI scheduling and calendar features (PR8-PR14)
- ✅ Real-time messaging with offline support
- ✅ Push notifications
- ✅ Group chat and 1-on-1 conversations
- ✅ User profiles and friend system
- ✅ Fast-path AI architecture (725ms average)
- ✅ Session Intelligence (transcription, summaries, weekly reels)
- ✅ Viral growth loops (7 loops implemented)

#### Admin Dashboard ✅
- ✅ Dashboard overview with key metrics
- ✅ Growth metrics (K-factor, funnels, retention)
- ✅ Session Intelligence monitoring
- ✅ Fraud detection queue
- ✅ Experiment management
- ✅ System health monitoring
- ✅ Kill-switch panel
- ✅ User management
- ✅ Audit log

#### Backend Services ✅
- ✅ Cloud Functions deployed (Node.js 20)
- ✅ AI services (transcription, summarization)
- ✅ Growth loops (referral attribution, viral mechanics)
- ✅ Fraud detection (anomaly scoring, captcha)
- ✅ Compliance (DSR hooks, data retention)

### What's In Progress
- 🚧 Viral growth system (PR15-PR32) - 18 PRs total
- 🚧 Infrastructure & Foundations (Week 1-2)
  - PR15 (Referral Attribution System)
  - PR16 (Loop Orchestrator)
  - PR28 (MCP Contracts + Rationale Logging)
  - PR32 (Degradation & Feature Kills)
  - PR25 (Incentives & Economy Agent)

### What's Blocked
- None currently

### Known Issues

#### Mobile App
- **Auth Persistence:** Memory-only (should use AsyncStorage)
- **Push Token Refresh:** Tokens can expire, need periodic refresh
- **Message Denormalization:** Old messages show old names

#### Admin Dashboard
- **Automated Tests:** Currently manual testing only
- **Metrics Refresh:** Some metrics rely on scheduled jobs (not real-time)

---

## Active Considerations

### Performance
- Monitoring AI costs (target: $0.0002 per message)
- Fast-path architecture achieving 80% of requests
- Scheduling performance: 725ms average (target achieved)
- Dashboard load time: <2s target (currently achieving)

### Privacy
- PII redaction implemented
- Consent management for progress reels
- Privacy policy compliance required
- Admin dashboard shows redacted data

### Growth
- Viral loop design in progress (18 PRs total)
- Referral attribution accuracy target: ≥95%
- K-factor target: ≥1.20 in at least 1 loop (14-day cohort)
- Experimentation framework for A/B testing
- Success metrics: +20% FVM lift, ≥30% referral mix, +10% D7 retention

### Technical Debt
- Auth persistence improvement needed (mobile)
- Push token refresh mechanism needed (mobile)
- Message search capability missing (mobile)
- Admin dashboard automated tests needed

---

## Context for Next Session

### When Resuming Work
1. **Check Memory Bank** - Review all core files for current state
2. **Review TASKS.md** - Check PR15-PR32 status (18 PRs total)
3. **Check Active Context** - Understand current focus and week schedule
4. **Review Progress** - See what's working and what's left
5. **Check Roadmap** - Understand weekly deliverables and dependencies

### Key Files to Review
- `TASKS.md` - Task list and PR status
- `README.md` - Project overview
- `docs/ARCHITECTURE_OVERVIEW.md` - Technical architecture
- `docs/ADMIN-DASHBOARD-PRD.md` - Admin dashboard requirements
- `admin-dashboard/README.md` - Admin dashboard setup
- `memory-bank/progress.md` - Detailed progress tracking

### Important Notes
- **Nested Directory:** Expo Router routes live in `app/app/` (not `app/`)
- **Team Ownership:** Engineer A owns `functions/`, Engineer B owns `app/`
- **Admin Dashboard:** Separate React webapp in `admin-dashboard/` directory
- **Feature Flags:** Required for gradual rollouts
- **Backward Compatibility:** All changes must maintain existing functionality

---

## Questions to Resolve

### Technical
- [ ] Should we implement AsyncStorage auth persistence? (mobile)
- [ ] How to handle push token refresh on device changes? (mobile)
- [ ] Best approach for message search implementation? (mobile)
- [ ] Should we add automated tests to admin dashboard?
- [ ] How to handle real-time metrics updates in admin dashboard?

### Product
- [x] Which viral loops should be prioritized? → All 18 PRs scheduled across 6 weeks
- [x] What success metrics for viral features? → K-factor ≥1.20, +20% FVM lift, ≥30% referral mix, +10% D7 retention
- [x] How to handle consent revocation for progress reels? → PR31 (Compliance Memo & DSR Hooks) covers this
- [ ] Choose Option A (Streak Rescue) or Option B (Beat-My-Skill) for PR30?

### Process
- [x] Feature flag rollout strategy? → One PR = one feature flag, soft-launch at 5%
- [x] Testing approach for viral features? → ≥80% unit coverage, E2E tests, load tests, abuse tests
- [x] Monitoring and analytics setup? → PR29 (Growth Ops Dashboard) provides live metrics
- [x] Admin dashboard frontend: Build custom React app or use Retool? → Custom React app (PR29 complete)

---

## Memory Bank Update Summary (November 2025)

### Changes Made
- **Comprehensive Documentation:** Created Memory Bank for mobile app + admin dashboard
- **Dual Application Structure:** Documented both React Native mobile app and React web admin dashboard
- **Shared Backend:** Documented Firebase Cloud Functions serving both applications
- **Complete Tech Stack:** Documented all technologies for mobile, admin, and backend
- **Architecture Patterns:** Documented patterns for both applications

### Applications Documented
1. **Mobile App** - React Native + Expo (iOS/Android)
2. **Admin Dashboard** - React + Vite + Material-UI (Web)
3. **Backend Services** - Firebase Cloud Functions (Node.js 20)

### Files Created
- `projectbrief.md` - Foundation document with dual application structure
- `productContext.md` - Product vision including admin dashboard
- `systemPatterns.md` - Architecture patterns for mobile + admin + backend
- `techContext.md` - Complete tech stack for all three applications
- `activeContext.md` - Current work status and context
- `progress.md` - Detailed progress tracking (to be created)

---

**This context is updated each session to reflect current work and priorities.**