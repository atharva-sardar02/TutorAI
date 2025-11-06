# Project Brief - TutorAI

**Version:** 2.0  
**Last Updated:** November 2025  
**Status:** Production-Ready AI Platform - 100% Complete

---

## Project Overview

**TutorAI** is a comprehensive AI-powered tutoring platform consisting of:
1. **Mobile Application** - React Native app for iOS/Android (tutors, students, parents)
2. **Admin Dashboard** - React web application for platform monitoring and management
3. **Backend Services** - Firebase Cloud Functions for AI, growth, fraud detection, compliance

The platform combines WhatsApp-style real-time messaging with intelligent AI features, viral growth loops, and comprehensive admin tools for operations management.

---

## Core Purpose

The platform serves as a comprehensive communication and scheduling hub for educational relationships, solving real-world pain points in tutor-student-parent interactions:

1. **Lost Meeting Details** - AI extracts scheduling information from natural chat
2. **RSVP Uncertainty** - Automated tracking of attendance confirmations
3. **Missed Urgent Messages** - Priority highlighting for time-sensitive communications
4. **Forgotten Deadlines** - Automatic deadline extraction and reminder system
5. **Manual Reminders** - Proactive AI assistant for session management
6. **Platform Operations** - Admin dashboard for monitoring, fraud detection, growth metrics

---

## Key Goals

### Primary Goals (Achieved)
- ✅ Real-time messaging with offline support
- ✅ AI-powered scheduling and calendar management
- ✅ Automated deadline tracking and reminders
- ✅ Conflict detection and resolution
- ✅ Timezone-aware event management
- ✅ Priority message highlighting
- ✅ RSVP tracking and notifications
- ✅ Viral growth loops (7 loops implemented)
- ✅ Session Intelligence (transcription, summaries, weekly reels)
- ✅ Admin dashboard for operations management

### Current Focus (TASKS.md)
- 🚧 Viral Growth System (PR15-PR32) - Complete viral growth platform with 18 PRs
  - Core viral loops (PR15-PR24): Attribution, orchestration, surfaces, fraud, student/parent/tutor loops
  - Platinum extensions (PR25-PR32): Incentives economy, async results, cohort rooms, MCP logging, ops dashboard, compliance
- ✅ Admin Dashboard (PR29) - Web-based admin tool for monitoring and management

---

## Project Scope

### In Scope
- **Mobile-first React Native application** (iOS/Android) - Primary user-facing app
- **Admin Dashboard web application** (React + Vite) - Operations and monitoring
- **Firebase backend** (Firestore, Auth, Storage, Cloud Functions)
- **AI-powered scheduling** and deadline management
- **Real-time messaging** with offline support
- **Group chat** and 1-on-1 conversations
- **Push notifications** (APNs/FCM)
- **User profiles** and friend system
- **Viral growth** and referral system
- **Session Intelligence** (transcription, summarization, weekly reels)
- **Fraud detection** and review queue
- **Compliance** (GDPR/CCPA/COPPA/FERPA)

### Out of Scope (Current)
- Web application for end users
- End-to-end encryption
- Message editing/deletion
- Voice messages
- Message search
- Video calls
- Desktop application

---

## Success Metrics

### Technical Metrics
- **Message Delivery:** < 3s P95 latency ✅
- **Scheduling Performance:** 725ms average (fast-path) ✅
- **AI Response Time:** Sub-1-second for scheduling ✅
- **Cost Efficiency:** 93% reduction in AI costs (fast-path architecture) ✅
- **Test Coverage:** 73 automated tests passing ✅
- **Dashboard Load Time:** < 2 seconds ✅

### Product Metrics (Target)
- **K-Factor:** ≥1.20 in at least 1 loop (14-day cohort)
- **Activation:** +20% lift to FVM rate for referred users
- **Referral Mix:** ≥30% of new weekly signups from referrals
- **Retention:** +10% D7 retention for referred cohort vs organic
- **Guardrails:** <0.5% spam/abuse rate, <1% opt-out rate, cost per referred user <$2
- **Tutor Utilization:** +5% referral conversion to sessions
- **Satisfaction:** ≥4.7/5 CSAT on loop prompts & rewards

---

## Constraints & Guardrails

### Technical Constraints
- **Platform:** React Native + Expo (mobile), React + Vite (admin dashboard)
- **Backend:** Firebase ecosystem (Firestore, Cloud Functions)
- **Node.js:** Version 20 for Cloud Functions
- **TypeScript:** Strict mode required for all projects

### Business Constraints
- **Privacy:** PII redaction required for AI processing
- **Consent:** Explicit consent required for progress reels and sharing
- **Cost Control:** AI costs must be tracked and optimized
- **Fraud Prevention:** Anomaly detection required for viral features
- **Compliance:** GDPR/CCPA/COPPA/FERPA compliance required

### Development Constraints
- Feature flags required for gradual rollouts
- Backward compatibility with existing data
- No breaking changes to core messaging
- All new features must be testable
- Admin dashboard requires role-based access control

---

## Stakeholders

### Primary Users
1. **Tutors** - Session management, student communication, schedule coordination
2. **Students** - Homework tracking, session reminders, tutor communication
3. **Parents** - Progress visibility, scheduling coordination, tutor discovery
4. **Admins** - Platform monitoring, fraud review, growth optimization (via admin dashboard)

### Development Team
- **Engineer A** - Backend/Infrastructure (Firebase Functions, AI, Data)
- **Engineer B** - Mobile/Frontend (React Native, UX, Integrations)
- **Admin Dashboard** - Separate React webapp (can be built by either engineer or dedicated frontend dev)

---

## Project Phases

### Phase 1: Base Platform (Complete ✅)
- PR1-PR7: Authentication, messaging, presence, notifications
- Foundation for all future features

### Phase 2: Tutorly AI Transformation (Complete ✅)
- PR8-PR14: AI scheduling, RSVP, deadlines, conflicts, timezones
- Production-ready AI platform

### Phase 3: Viral Growth System (In Progress 🚧)
- **Core Viral Loops (PR15-PR24):** Referrals, experiments, viral loops, fraud detection
- **Platinum Extensions (PR25-PR32):** Incentives economy, async results, cohort rooms, MCP logging, ops dashboard, compliance
- **Total Scope:** 18 PRs, 6 weeks, 2-person squad
- Growth infrastructure and engagement features

### Phase 4: Admin Dashboard (Complete ✅)
- PR29: Growth Ops Dashboard (Web Admin)
- Real-time metrics, fraud queue, kill-switches, system health

---

## Documentation Standards

- All architectural decisions documented in `docs/ARCHITECTURE_OVERVIEW.md`
- Task tracking in `TASKS.md`
- Implementation summaries in `docs/` directory
- Memory Bank maintained for continuity across sessions
- Admin dashboard docs in `docs/ADMIN-DASHBOARD-*.md`

---

## Next Steps

### Week 1-2: Infrastructure & Foundations
1. Complete PR15 (Referral Attribution System)
2. Complete PR16 (Loop Orchestrator)
3. Complete PR28 (MCP Contracts + Rationale Logging)
4. Complete PR32 (Degradation & Feature Kills)
5. Complete PR25 (Incentives & Economy Agent)

### Week 3-4: Viral Surfaces & Experimentation
1. Complete PR17 (Experimentation Framework)
2. Complete PR17.5 (Personalization Agent)
3. Complete PR18 (Tutor Card Generator)
4. Complete PR26 (Async Results Surfaces + Micro-FVM)
5. Complete PR21 (Activity Feed)

### Week 4-5: AI, Social, Fraud
1. Complete PR19 (Progress Reel Creator & Consent)
2. Complete PR20 (Transcription & Agentic Actions)
3. Complete PR27 (Social Presence v2 - Cohort Rooms + Leaderboards)
4. Complete PR22 (Fraud Detection & Review)

### Week 5-6: Student/Parent Loops & Ops
1. Complete PR23 (Study Buddy Challenge)
2. Complete PR30 (Second Student Loop)
3. Complete PR24 (Parent Pod Invites & Tutor→Tutor Referrals)
4. Complete PR29 (Growth Ops Dashboard) - ✅ Already complete

### Week 6: Compliance & Hardening
1. Complete PR31 (Compliance Memo & DSR Hooks)
2. Load tests, abuse tests, kill-switch drills
3. Soft-launch prep: Feature flags at 5%, rollback plan

---

**This document serves as the foundation for all other Memory Bank files.**