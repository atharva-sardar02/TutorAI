# Product Context - TutorAI

**Last Updated:** November 2025

---

## Why This Product Exists

TutorAI addresses critical friction points in educational communication and coordination. Traditional messaging apps weren't designed for the specific needs of tutor-student-parent relationships, leading to:

- **Lost Scheduling Information** - Meeting details buried in chat history
- **RSVP Confusion** - Unclear attendance confirmations
- **Missed Urgent Messages** - Critical cancellations lost in group chats
- **Homework Tracking Gaps** - Deadlines forgotten or unclear
- **Manual Reminder Burden** - Tutors manually tracking and reminding about sessions
- **Platform Operations Blindness** - No visibility into growth metrics, fraud, or system health

---

## Problems Solved

### 1. Smart Calendar Extraction
**Problem:** "Meeting details get lost in chat"  
**Solution:** AI extracts scheduling information from natural language  
**Impact:** Sub-1-second scheduling from "lesson Monday 3pm" → event created in 725ms  
**User Experience:** No manual transcription; one tap to view/edit

### 2. RSVP Tracking
**Problem:** "Uncertainty over who's attending"  
**Solution:** Auto-detection of RSVP responses ("yes that works" → auto-accept)  
**Impact:** Real-time status updates, visual indicators, automatic decline notifications  
**User Experience:** See confirmations at a glance; no follow-up texts needed

### 3. Priority Highlighting
**Problem:** "Miss urgent cancellations in group chats"  
**Solution:** High-precision detection (≥90% accuracy) with keyword-first triggers  
**Impact:** Instant push notifications for high-confidence urgent messages  
**User Experience:** Can't miss time-sensitive changes

### 4. Deadline Tracking
**Problem:** "Student homework deadlines forgotten"  
**Solution:** Auto-extraction creates deadline tasks with 24h reminders  
**Impact:** Automated notification system like schools have  
**User Experience:** Auto-reminder system prevents missed deadlines

### 5. Availability Suggestions
**Problem:** "When are we free?"  
**Solution:** AI-powered mutual availability across participants  
**Impact:** Intelligent scheduling assistance without assumptions  
**User Experience:** Suggests 2-3 times, user picks, THEN creates event

### 6. Proactive Assistant
**Problem:** "Manual reminder texts every week"  
**Solution:** Daily nudge job at 9am checks unconfirmed events  
**Impact:** Automated reminders reduce no-shows 20-40%  
**User Experience:** Hands-off session management

### 7. Platform Operations Visibility
**Problem:** "No visibility into growth metrics, fraud, or system health"  
**Solution:** Admin dashboard with real-time metrics, fraud queue, kill-switches  
**Impact:** Data-driven decisions, proactive monitoring, fraud reduction  
**User Experience:** Admins can monitor and optimize platform operations

---

## How It Should Work

### User Personas

#### Tutor Persona
- Manages multiple students and sessions
- Needs to coordinate schedules efficiently
- Wants to highlight urgent changes
- Requires automated reminder system
- Benefits from student progress visibility
- Uses mobile app for daily operations

#### Student Persona
- Needs homework deadline reminders
- Wants clear session confirmations
- Requires easy access to schedule
- Benefits from AI-powered study assistance
- Uses mobile app for communication and learning

#### Parent Persona
- Wants visibility into student progress
- Needs coordination with tutors
- Requires session scheduling assistance
- Benefits from automated updates
- Uses mobile app to track student progress

#### Admin Persona
- Needs platform-wide visibility
- Requires fraud detection and review tools
- Wants growth metrics and K-factor tracking
- Needs system health monitoring
- Uses admin dashboard (web app) for operations

---

## User Experience Goals

### Core Principles
1. **Speed First** - Sub-1-second scheduling, <3s message delivery, <2s dashboard load
2. **Context Awareness** - AI understands educational relationships
3. **Proactive Assistance** - Automated reminders and nudges
4. **Privacy Compliance** - PII redaction, explicit consent
5. **Offline Resilience** - Mobile app works without internet connection
6. **Operational Excellence** - Admin dashboard provides real-time insights

### Interaction Patterns
- **Natural Language** - "lesson Monday 3pm" just works
- **Visual Confirmation** - Event cards appear in chat immediately
- **One-Tap Actions** - RSVP, view details, reschedule
- **Smart Notifications** - Suppressed when viewing conversation
- **Graceful Degradation** - Falls back when AI unavailable
- **Dashboard Insights** - Metrics visible in <3 clicks

---

## Feature Priorities

### Tier 1: Core Messaging (Complete ✅)
- Real-time messaging
- Group chat
- Offline support
- Push notifications
- Image sharing

### Tier 2: AI Scheduling (Complete ✅)
- Calendar extraction
- RSVP tracking
- Conflict detection
- Timezone support
- Deadline management

### Tier 3: Growth Features (In Progress 🚧)
- Referral attribution
- Viral loops (Tutor Cards, Progress Reels)
- Experimentation framework
- Activity feeds
- Fraud detection
- Incentives & economy (rewards, XP, leaderboards)
- Async results sharing & micro-FVM
- Cohort rooms & social presence v2
- Growth ops dashboard ✅
- Compliance & DSR hooks

### Tier 4: Advanced AI (In Progress 🚧)
- Session transcription
- Progress summarization
- Agentic actions (TutorCard, ProgressReel, StudyBuddy, PrepPack)
- Prep pack generation
- Study buddy challenges
- MCP contracts & rationale logging
- Degradation & feature kill-switches

### Tier 5: Admin Tools (Complete ✅)
- Dashboard overview with key metrics
- Growth metrics (K-factor, funnels, retention)
- Session Intelligence monitoring
- Fraud detection queue
- Experiment management
- System health monitoring
- Kill-switch panel
- User management
- Audit log

---

## Success Criteria

### User Satisfaction
- Tutors save 5+ hours/week on scheduling coordination
- Students never miss deadlines (automated reminders)
- Parents have clear visibility into progress
- 90%+ scheduling accuracy from natural language
- Admins can resolve fraud cases in <2 minutes

### Engagement Metrics
- Daily active users (DAU)
- Session booking completion rate
- AI feature adoption rate
- Referral conversion rate (K-factor)
- Admin dashboard usage (daily active admins)

### Technical Metrics
- < 3s message delivery (P95)
- 725ms scheduling (fast-path)
- 93% cost reduction in AI operations
- ≥95% referral attribution accuracy
- <2s dashboard load time
- 100% of critical metrics visible in <3 clicks

---

## Competitive Differentiation

### vs. WhatsApp/Telegram
- **AI-powered scheduling** - Extracts events from chat
- **Educational context** - Built for tutor-student-parent relationships
- **Proactive reminders** - Automated deadline and session management
- **Priority highlighting** - Never miss urgent messages
- **Admin dashboard** - Platform operations visibility

### vs. Calendly
- **Integrated communication** - Scheduling within chat context
- **Group coordination** - Multi-participant scheduling
- **Natural language** - No form filling required
- **Mobile-first** - Native app experience
- **Admin tools** - Growth and operations management

### vs. Generic Task Managers
- **Chat-native** - Tasks created from conversation
- **AI extraction** - Automatic deadline detection
- **Educational focus** - Built for learning workflows
- **Real-time sync** - Instant updates across participants
- **Viral growth** - Built-in referral and sharing mechanisms

---

## Future Vision

### Short-term (Next 3 Months)
- Complete viral growth system
- Roll out experiments with feature flags
- Expand AI features (transcription, summarization)
- Optimize viral loops based on metrics
- Enhance admin dashboard with more analytics

### Medium-term (6 Months)
- Multi-language support (EN/ES/FR)
- Enhanced personalization
- Advanced analytics dashboard
- Parent pod features
- Web application for end users

### Long-term (12 Months)
- Platform expansion (web, desktop)
- Third-party integrations
- Enterprise features
- API for educational tools
- Advanced admin reporting and automation

---

**This context drives all product decisions and feature development priorities.**