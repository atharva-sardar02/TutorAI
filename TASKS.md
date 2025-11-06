# MessageAI Viral Growth System — TASKS.md (Platinum-Complete)
**Version 2.0 — November 2025 | Production-Ready + Platinum Extensions**

---

## 📋 Document Overview

This task list covers **all viral growth features** (PR15–PR32) for MessageAI, incorporating:
- **Core viral loops** (PR15–24): Attribution, orchestration, surfaces, fraud, student/parent/tutor loops
- **Platinum extensions** (PR25–32): Incentives economy, async results, cohort rooms, MCP logging, ops dashboard, compliance

**Total Scope:** 18 PRs, 6 weeks, 2-person squad  
**Aligned with:** Legacy MessageAI codebase structure (no `shared/` directory)

---

## 👥 Team Setup

- **Engineer A – Backend / Infrastructure**
  - Owns: Cloud Functions, Firestore, AI integrations, fraud detection, orchestration, experiments, scheduled jobs
  - Tags: `area:agent`, `area:backend`, `area:analytics`, `area:trust`

- **Engineer B – Mobile / Frontend**
  - Owns: React Native app, UI/UX, sharing surfaces, feature flags, client-side integrations
  - Tags: `area:frontend`

**Conflict Prevention:**
- Engineer A: `functions/**` and `app/src/types/growthTypes.ts`
- Engineer B: `app/**` (components, services, hooks, config)
- Branch: `feat/pr<number>-short-description`
- Feature flags: One PR = one flag

---

## 🏷️ Task Metadata Format

Each task includes:
```
**Area:** Agent | Frontend | Backend | Analytics | Trust
**Risk:** Low | Medium | High
**Effort:** S (1-2d) | M (3-5d) | L (6-10d)
**Owner:** TBD | Engineer A | Engineer B
**Dependencies:** [List of blocking PRs, data, services]
**Kill-Switch:** Feature flag name
```

---

## 🗂️ Master Task List (PR15–PR32)

### **🔧 Infrastructure & Foundations (Week 1-2)**

---

#### **PR15 – Referral Attribution System**
**Area:** Backend | **Risk:** High | **Effort:** M | **Owner:** Engineer A

**Scope:** Smart links, install-deferred attribution, cross-device tracking, admin debugging.

**Dependencies:** None (foundation)

**Kill-Switch:** `growth.referralAttribution.enabled`

**Tasks:**
- [ ] **Firestore Schema & Rules**
  - Create `/referrals` collection with composite indexes
  - Schema: `{ referralId, referrerId, referrerType, targetType, loopType, status, metadata, timestamps, deviceHints }`
  - Lock down writes (server-only)
  - Files: `app/src/types/growthTypes.ts`, `firestore.rules`, `firestore.indexes.json`
  - Acceptance: Schema enforced, 95% write success rate

- [ ] **Referral Link Generator**
  - HMAC signing + Firebase Dynamic Links (or Branch.io fallback)
  - Include UTM params, channel metadata, experiment variant
  - Files: `functions/src/utils/links.ts`, `functions/src/utils/crypto.ts`
  - Acceptance: Links generated <100ms, valid 30 days, HMAC verified

- [ ] **First-Open Attribution Handler**
  - Capture `referralId` on app launch, associate to user on signup
  - Handle Android install referrer, iOS universal links
  - Store device hints (deviceId, userAgent, ipHash) for fraud
  - Files: `functions/src/growth/referralHandler.ts`
  - Acceptance: ≥95% attribution accuracy (click → install → open → signup)

- [ ] **Admin Read Endpoint**
  - Query `/referrals` by referrerId, status, date range
  - Files: `functions/src/growth/referralHandler.ts`
  - Acceptance: Admins can debug attribution chains

- [ ] **Client Integration**
  - Call attribution handler on first launch
  - Files: `app/src/services/growth/referralService.ts`
  - Acceptance: Zero client-side errors, 100% coverage

- [ ] **Fallback Behavior**
  - If Dynamic Links fails → use custom short domain
  - If attribution fails → log to `/attribution_failures` for manual review
  - Acceptance: Graceful degradation, no user-visible errors

- [ ] **Tests**
  - E2E: click → install → open → signup on iOS/Android
  - Unit: HMAC signing, link parsing, device fingerprinting
  - Files: `functions/__tests__/referralHandler.test.ts`
  - Acceptance: 80% test coverage, E2E passes

**Global Acceptance:**
- Attribution accuracy ≥95% (measured over 14-day cohorts)
- P95 latency <150ms for link generation
- Zero PII in referral links (use hashed IDs)

---

#### **PR16 – Loop Orchestrator**
**Area:** Agent | **Risk:** Medium | **Effort:** M | **Owner:** Engineer A

**Scope:** 150ms decision engine with eligibility, cooldowns, experiment allocation, persona detection.

**Dependencies:** PR15 (referral types)

**Kill-Switch:** `growth.orchestrator.enabled` + per-loop flags

**Tasks:**
- [ ] **Decision Engine**
  - Evaluate: user role, session context, experiment variant, past exposures, cooldowns
  - Return: `{ loopType, persona, copyKey, cooldownMs, experimentId, variantId, rationale }`
  - Files: `functions/src/growth/loopOrchestrator.ts`
  - Acceptance: Decision made in <150ms (P95), rationale logged

- [ ] **Cooldown Store**
  - Create `/cooldowns/{userId}/{loopType}` with TTL index
  - Atomic check-and-set to prevent duplicate prompts
  - Files: `functions/src/utils/firestore.ts`, `firestore.rules`
  - Acceptance: Zero duplicate prompts within cooldown period

- [ ] **Eligibility Rules**
  - Constraints: 1 prompt/24h per loop, min 5 sessions for Tutor Spotlight, rating ≥4.5
  - Files: `functions/src/growth/loopOrchestrator.ts`
  - Acceptance: Rules enforced 100%, audit log shows rejections

- [ ] **Feature Flags Integration**
  - Per-loop toggles: `growth.loops.tutorSpotlight.enabled`, rollout %
  - Files: `app/src/config/featureFlags.ts`
  - Acceptance: Kill-switch works in <1 min, rollback verified

- [ ] **Logging & Exposures**
  - Write `/loop_exposures/{userId}/{timestamp}` with decision details
  - Files: `functions/src/growth/loopOrchestrator.ts`, `app/src/types/growthTypes.ts`
  - Acceptance: 100% of decisions logged, PII redacted

- [ ] **Client Integration**
  - Mobile calls orchestrator before showing viral prompts
  - Handles "throttled" response gracefully (no UI shown)
  - Files: `app/src/services/growth/tutorCardService.ts`, `app/src/services/growth/progressReelService.ts`
  - Acceptance: Zero client errors, fallback to silent failure

- [ ] **Fallback Behavior**
  - If orchestrator times out (>500ms) → skip prompt, log incident
  - If Firestore write fails → retry 3x, then fail silently
  - Acceptance: No user-visible errors, incident alerts sent

- [ ] **Tests**
  - Unit: Eligibility logic, cooldown enforcement, experiment allocation
  - Load: 100 RPS sustained, P95 <150ms
  - Files: `functions/__tests__/loopOrchestrator.test.ts`
  - Acceptance: 80% coverage, load test passes

**Global Acceptance:**
- P95 latency <150ms @ 100 RPS
- Zero duplicate prompts within cooldown
- Rationale logged for every decision (≤240 chars)

---

#### **PR28 – MCP Contracts + Rationale Logging** ⭐ **NEW**
**Area:** Agent | **Risk:** Low | **Effort:** S | **Owner:** Engineer A

**Scope:** Define MCP JSON schemas between agents; persist decision, features_used, rationale, latency to `/agent_logs`; add replay tooling.

**Dependencies:** PR16 (orchestrator logging foundation)

**Kill-Switch:** `growth.mcp.loggingEnabled`

**Tasks:**
- [ ] **MCP Schema Definitions**
  - Define contracts for: Orchestrator, Personalization, Incentives, Fraud, Experimentation
  - Schema: `{ agentName, operation, input, output, rationale, featuresUsed, latency, timestamp }`
  - Files: `app/src/types/growthTypes.ts` (MCPMessage, AgentLog interfaces)
  - Acceptance: All 5 agents have documented schemas

- [ ] **Rationale Logging Middleware**
  - Wrap agent calls to auto-log to `/agent_logs/{userId}/{timestamp}`
  - Enforce rationale ≤240 chars, PII redaction
  - Files: `functions/src/utils/agentLogger.ts`
  - Acceptance: 100% of agent calls logged, zero PII leaks

- [ ] **Replay Tooling (Admin)**
  - Query `/agent_logs` by userId, loopType, date range
  - Visualize decision chain: loop → orchestrator → personalization → fraud
  - Files: `functions/src/growth/experimentService.ts` (admin endpoint)
  - Acceptance: Admins can trace any user's viral journey

- [ ] **PII Redaction**
  - Scrub names, emails, phones from logs automatically
  - Files: `functions/src/ai/piiRedaction.ts` (reuse existing)
  - Acceptance: 100% PII-free logs on test dataset

- [ ] **Tests**
  - Unit: Schema validation, rationale truncation, PII redaction
  - Integration: End-to-end trace for 1 user across 3 agents
  - Files: `functions/__tests__/agentLogger.test.ts`
  - Acceptance: 80% coverage, E2E trace works

**Global Acceptance:**
- Every agent call includes rationale
- Trace view links loop → decisions → outcomes
- PII redacted in all logs

---

#### **PR32 – Degradation & Feature Kills** ⭐ **NEW**
**Area:** Backend | **Risk:** High | **Effort:** M | **Owner:** Engineer A

**Scope:** Central config for per-loop/agent feature flags, dependency health checks, fallback copy/rewards, safe defaults on LLM/downstream failures.

**Dependencies:** PR16 (orchestrator), PR25 (incentives)

**Kill-Switch:** Master: `growth.enabled`, per-loop flags

**Tasks:**
- [ ] **Feature Flag Config**
  - Centralized config in Firestore: `/feature_flags/{flagName}`
  - Schema: `{ enabled, rollout%, environments, dependencies }`
  - Files: `app/src/config/featureFlags.ts`, `functions/src/utils/featureFlags.ts`
  - Acceptance: Kill-switch toggles within 60s, verified in staging

- [ ] **Dependency Health Checks**
  - Ping LLM APIs (OpenAI, Anthropic), storage (Cloudinary), third-party (Whisper)
  - Circuit breaker pattern: fail after 3 consecutive errors, auto-recover after 5 min
  - Files: `functions/src/utils/healthChecks.ts`
  - Acceptance: Unhealthy deps auto-disabled, alerts sent

- [ ] **Fallback Copy & Rewards**
  - Static templates if LLM unavailable: "Share your success!" (generic)
  - Default rewards if incentives agent down: 50 XP (safe minimum)
  - Files: `functions/src/growth/loopOrchestrator.ts` (fallback logic)
  - Acceptance: Zero user-visible errors, fallback tested

- [ ] **Safe Defaults**
  - If orchestrator fails → no prompt shown (silent failure)
  - If reel generation fails → fallback to static card
  - If fraud check fails → allow (optimistic), flag for review
  - Acceptance: All critical paths have fallbacks

- [ ] **Kill-Switch Testing**
  - Staging: Toggle each flag, verify no errors
  - Prod canary: Disable 1 loop for 5% users, verify metrics
  - Files: `functions/__tests__/featureFlags.test.ts`
  - Acceptance: All kill-switches tested, rollback <5 min

- [ ] **Tests**
  - Unit: Flag parsing, circuit breaker logic
  - Integration: End-to-end with simulated LLM failure
  - Files: `functions/__tests__/degradation.test.ts`
  - Acceptance: 80% coverage, failure modes tested

**Global Acceptance:**
- Kill-switch tested in staging + prod canary
- No user-visible errors on dependency failure
- All agents degrade gracefully

---

### **🧪 Experimentation & Analytics (Week 1-3)**

---

#### **PR17 – Experimentation Framework**
**Area:** Analytics | **Risk:** Medium | **Effort:** M | **Owner:** Engineer A

**Scope:** A/B testing with K-factor computation, guardrails, auto-pause, admin dashboard integration.

**Dependencies:** PR15 (referral events), PR16 (loop exposures)

**Kill-Switch:** `growth.experiments.enabled`

**Tasks:**
- [ ] **Experiment Schema**
  - Collection: `/experiments/{experimentId}`
  - Schema: `{ variants, allocation%, metrics, guardrails, status, startDate, endDate }`
  - Files: `app/src/types/growthTypes.ts`, `firestore.rules`
  - Acceptance: Schema enforced, experiments queryable

- [ ] **Variant Allocation**
  - Consistent hashing: userId → variant (stable across sessions)
  - Files: `functions/src/growth/experimentService.ts`
  - Acceptance: <50ms allocation, same user always gets same variant

- [ ] **Event Logging**
  - Capture: `invite_sent`, `invite_opened`, `join_completed`, `fvm_reached`
  - Include: experimentId, variantId, timestamp, userId, loopType
  - Files: `functions/src/growth/experimentService.ts`, `app/src/types/growthTypes.ts`
  - Acceptance: 100% event coverage, zero duplicates

- [ ] **K-Factor Computation**
  - Scheduled function (daily 2am UTC): K = (invites/user) × (joins/invite)
  - Group by experiment, variant, loop
  - Files: `functions/src/growth/computeMetrics.ts`
  - Acceptance: K computed daily, historical data retained

- [ ] **Guardrails**
  - Auto-pause if: spam rate >0.5%, opt-out rate >1%, cost anomaly (>120% of baseline)
  - Files: `functions/src/growth/guardrails.ts`
  - Acceptance: Guardrails trigger within 1 hour, experiments paused

- [ ] **Admin Dashboard Integration**
  - Read endpoint: K-factor by variant, funnel drop-offs, guardrail status
  - Files: `functions/src/growth/experimentService.ts`
  - Acceptance: Admins see live data (<1h lag)

- [ ] **Client Integration**
  - App includes variantId in all growth events
  - Files: `app/src/services/growth/experimentService.ts`
  - Acceptance: 100% events tagged, zero client errors

- [ ] **Fallback Behavior**
  - If allocation fails → assign to control
  - If logging fails → retry 3x, then drop (don't block user)
  - Acceptance: User never blocked by experiment infrastructure

- [ ] **Tests**
  - Unit: Allocation logic, K-factor math, guardrail triggers
  - Integration: End-to-end experiment lifecycle
  - Files: `functions/__tests__/experimentService.test.ts`
  - Acceptance: 80% coverage, integration tests pass

**Global Acceptance:**
- K-factor computed daily, visible in admin dashboard
- Guardrails auto-pause within 1 hour
- Every viral event tagged with experiment metadata

---

#### **PR29 – Growth Ops Dashboard (Web Admin)** ⭐ **NEW**
**Area:** Analytics | **Risk:** Low | **Effort:** L | **Owner:** Engineer A (backend) + TBD (frontend)

**Scope:** K-factor by loop/variant, funnels, D1/D7/D28, guardrails, fraud queue, experiment toggles, per-agent kill-switches.

**Dependencies:** PR17 (experiments), PR22 (fraud), PR28 (agent logs)

**Kill-Switch:** N/A (admin tool, always available)

**Tasks:**
- [ ] **Backend API Endpoints**
  - `/admin/metrics/k-factor` → by loop, variant, date range
  - `/admin/metrics/funnel` → invite → open → join → FVM
  - `/admin/metrics/retention` → D1, D7, D28 by cohort
  - `/admin/fraud/queue` → flagged referrals pending review
  - `/admin/experiments/list` → active experiments + toggle endpoint
  - `/admin/agents/killswitch` → disable per agent/loop
  - Files: `functions/src/growth/adminApi.ts`
  - Acceptance: All endpoints <500ms, role-based access enforced

- [ ] **Real-Time Metrics**
  - Firestore listeners for live K-factor (updated every 15 min)
  - BigQuery export for historical analytics (D1/D7/D28)
  - Files: `functions/src/growth/computeMetrics.ts`
  - Acceptance: Live data ≤15 min lag, historical ≤1 day lag

- [ ] **Fraud Review Queue**
  - List: `/admin/fraud/queue` → sorted by anomaly score
  - Actions: Approve, Reject, Flag for investigation
  - Files: `functions/src/growth/adminApi.ts`
  - Acceptance: Admins can review 100 items/min, decisions logged

- [ ] **Experiment Toggles**
  - UI: Toggle experiment on/off, adjust rollout %
  - API: `/admin/experiments/{id}/toggle` → POST {enabled, rollout}
  - Files: `functions/src/growth/experimentService.ts`
  - Acceptance: Changes propagate within 60s

- [ ] **Kill-Switch Panel**
  - UI: Per-loop and per-agent kill-switches
  - API: `/admin/killswitch/{target}` → POST {enabled}
  - Fallback verification: Auto-test fallback on disable
  - Files: `functions/src/growth/adminApi.ts`, `app/src/config/featureFlags.ts`
  - Acceptance: Switches work within 60s, fallback verified

- [ ] **Audit Trail**
  - Log all admin actions to `/admin_audit_log/{userId}/{timestamp}`
  - Schema: `{ adminId, action, target, timestamp, metadata }`
  - Files: `functions/src/growth/adminApi.ts`
  - Acceptance: 100% admin actions logged

- [ ] **Role-Based Access**
  - Roles: Admin (full access), Analyst (read-only), Support (fraud queue only)
  - Firebase custom claims or third-party auth
  - Files: `functions/src/utils/auth.ts`
  - Acceptance: Unauthorized users blocked (403)

- [ ] **Frontend Dashboard (Optional)**
  - Build React admin panel or use Retool
  - Charts: K-factor trends, funnel visualization, retention curves
  - Tables: Fraud queue, experiment list, agent logs
  - Acceptance: Dashboard loads <2s, responsive design

- [ ] **Tests**
  - Unit: API endpoint logic, role-based access
  - Integration: End-to-end admin workflow (toggle experiment, review fraud)
  - Files: `functions/__tests__/adminApi.test.ts`
  - Acceptance: 80% coverage, integration tests pass

**Global Acceptance:**
- Live K-factor and funnels (≤1h lag)
- One-click disable per loop/agent with verified fallback
- Role-based access + audit trail

---

### **💰 Incentives & Economy (Week 2-3)**

---

#### **PR25 – Incentives & Economy Agent** ⭐ **NEW**
**Area:** Agent | **Risk:** Medium | **Effort:** L | **Owner:** Engineer A

**Scope:** Reward matrix by persona/subject, budget caps, expiration, anti-abuse checks, redemption flow, unit-economics telemetry (CAC/LTV deltas).

**Dependencies:** PR16 (orchestrator), PR22 (fraud detection)

**Kill-Switch:** `growth.incentives.enabled`

**Tasks:**
- [ ] **Reward Matrix Definition**
  - Define rewards by persona: Tutor (XP + leaderboard), Parent (class pass), Student (streak shield)
  - Vary by subject: Math +10% XP, Science +5%
  - Files: `app/src/types/growthTypes.ts` (RewardConfig interface)
  - Acceptance: Matrix covers 5 personas × 3 subjects = 15 variants

- [ ] **Data Schema**
  - `/rewards/{userId}/{rewardId}` → granted rewards (XP, credits, badges)
  - `/balances/{userId}` → aggregate balances (XP, classPassCount, shieldCount)
  - `/redemptions/{userId}/{redemptionId}` → redeemed rewards (timestamp, type)
  - `/reward_policy` → global config (caps, expiration, abuse thresholds)
  - Files: `app/src/types/growthTypes.ts`, `firestore.rules`
  - Acceptance: Schema enforced, indexes deployed

- [ ] **Reward Issuance**
  - Orchestrator calls `incentivesAgent.issueReward(userId, loopType, context)`
  - Idempotency: Use `requestKey` to prevent duplicate grants
  - Expiration: Class passes expire 90 days, XP never expires
  - Files: `functions/src/growth/incentivesAgent.ts`
  - Acceptance: Deterministic issuance, zero duplicates

- [ ] **Budget Caps**
  - Daily cap: 100 class passes/day, 10,000 XP/day (global)
  - Per-user cap: 5 class passes/month, 1,000 XP/week
  - If cap exceeded → queue reward for next period
  - Files: `functions/src/growth/incentivesAgent.ts`
  - Acceptance: Caps honored, overflow queued

- [ ] **Anti-Abuse Checks**
  - Integrate with fraud module: Don't reward flagged users
  - Velocity check: Max 10 rewards/day per user
  - Clawback: Revoke rewards if user later flagged
  - Files: `functions/src/growth/incentivesAgent.ts`, `functions/src/fraud/anomalyDetector.ts`
  - Acceptance: Abuse rate <0.5%, clawbacks executed

- [ ] **Redemption Flow**
  - User redeems class pass → create `/redemptions` entry → decrement balance
  - Tutor redeems XP → show on leaderboard (no balance change)
  - Files: `functions/src/growth/incentivesAgent.ts`
  - Acceptance: Redemptions atomic, double-spend prevented

- [ ] **Unit Economics Telemetry**
  - Track: Cost per reward (class pass = $2, XP = $0), CAC per loop, LTV delta
  - Compute ROI: (LTV uplift - CAC) / CAC
  - Files: `functions/src/growth/computeMetrics.ts`
  - Acceptance: Uplift + cost dashboards show per-loop ROI

- [ ] **Client Integration**
  - Display balance in profile: "You have 2 class passes, 450 XP"
  - Redemption UI: Tap to redeem, show success/error
  - Files: `app/src/components/growth/RewardsBalanceCard.tsx`, `app/src/services/growth/incentivesService.ts`
  - Acceptance: Balance updates in real-time, redemption flow works

- [ ] **Fallback Behavior**
  - If incentives agent times out → issue default reward (50 XP)
  - If redemption fails → retry 3x, then show error + support contact
  - Acceptance: User never blocked, fallback tested

- [ ] **Audit Log**
  - Log all reward grants, redemptions, clawbacks to `/rewards_audit_log`
  - Files: `functions/src/growth/incentivesAgent.ts`
  - Acceptance: 100% actions logged, audit-ready

- [ ] **Tests**
  - Unit: Reward issuance, cap enforcement, clawback logic
  - Integration: End-to-end redemption flow
  - Load: 1000 concurrent redemptions
  - Files: `functions/__tests__/incentivesAgent.test.ts`
  - Acceptance: 80% coverage, load test passes

**Global Acceptance:**
- Deterministic rewards with idempotency
- Caps honored, expiries enforced, audit log present
- Uplift + cost dashboards show per-loop ROI

---

### **🎨 Viral Surfaces (Week 2-4)**

---

#### **PR17.5 – Personalization Agent**
**Area:** Agent | **Risk:** Low | **Effort:** S | **Owner:** Engineer A (backend) + Engineer B (frontend)

**Scope:** Persona-based copy, tone, localization (EN/ES/FR) for viral loops.

**Dependencies:** PR16 (orchestrator)

**Kill-Switch:** `growth.personalization.enabled`

**Tasks:**
- [ ] **Persona Detection**
  - Infer from profile: `userType` field (Tutor/Parent/Student)
  - Fallback: Session context (if tutorId present → Tutor)
  - Files: `functions/src/growth/loopOrchestrator.ts`, `app/src/types/growthTypes.ts`
  - Acceptance: Persona correctly detected 100%

- [ ] **Dynamic Copy Templates**
  - Define templates per loop + persona + locale
  - Example: Tutor + TutorSpotlight + EN = "Share your 5★ rating!"
  - Files: `app/src/types/growthTypes.ts` (CopyTemplate interface)
  - Acceptance: 4 loops × 3 personas × 3 locales = 36 templates

- [ ] **Frontend Localization Hook**
  - `useLocalizedCopy(loopType, persona, locale)` → returns copy string
  - Fallback: EN if locale unavailable
  - Files: `app/src/hooks/useLocalizedCopy.ts`
  - Acceptance: Hook works, fallback tested

- [ ] **API Response Extension**
  - Orchestrator returns `{ copyKey, persona }` in decision
  - Client uses copyKey to fetch localized string
  - Files: `functions/src/growth/loopOrchestrator.ts`
  - Acceptance: All responses include copyKey

- [ ] **Fallback Behavior**
  - If localization fails → use EN template
  - If persona unknown → default to Parent (safest)
  - Acceptance: Zero errors, fallback tested

- [ ] **Tests**
  - Unit: Persona detection, template lookup
  - Integration: End-to-end with all 3 locales
  - Files: `functions/__tests__/loopOrchestrator.test.ts`
  - Acceptance: 80% coverage, all locales tested

**Global Acceptance:**
- Persona and locale-specific copy verified (EN/ES/FR)
- Fallback to EN if locale unavailable

---

#### **PR18 – Tutor Card Generator**
**Area:** Frontend | **Risk:** Medium | **Effort:** M | **Owner:** Engineer B

**Scope:** Visual, shareable Tutor Card as viral surface.

**Dependencies:** PR15 (referral links), PR16 (orchestrator), PR25 (incentives for XP reward)

**Kill-Switch:** `growth.loops.tutorCard.enabled`

**Tasks:**
- [ ] **Tutor Card Modal (Frontend)**
  - Preview card with tutor stats (rating, sessions, subjects)
  - Share via native sheet (WhatsApp, Instagram, Email)
  - Save to gallery (iOS/Android)
  - Files: `app/src/components/growth/TutorCardModal.tsx`
  - Acceptance: Modal renders <1s, share works on both platforms

- [ ] **Referral API Integration**
  - Call `referralService.createLink(tutorId, 'tutor_card')` → get signed link
  - Embed link in card metadata (QR code or text)
  - Files: `app/src/services/growth/tutorCardService.ts`, `app/src/services/growth/referralService.ts`
  - Acceptance: Link embedded, attribution tracked

- [ ] **Cloud Function: Image Generation**
  - Render card via Cloudinary API with dynamic fields
  - Fallback: Static template if Cloudinary fails
  - Cache: Store generated image URL for 14 days (avoid re-render)
  - Files: `functions/src/growth/generateTutorCard.ts`
  - Acceptance: Card generated <3s, fallback works

- [ ] **Uniqueness Filter**
  - Don't repeat same testimonial/stat within 14 days
  - Query `/tutor_cards/{tutorId}` for recent cards
  - Files: `functions/src/growth/generateTutorCard.ts`, `app/src/types/growthTypes.ts`
  - Acceptance: Zero duplicate stats within 14d window

- [ ] **Analytics**
  - Emit: `card_generated`, `card_shared`, `card_viewed` (from link open)
  - Include: experimentId, variantId, tutorId
  - Files: `app/src/services/growth/tutorCardService.ts`, `app/src/services/growth/experimentService.ts`
  - Acceptance: 100% events tracked

- [ ] **Fallback Behavior**
  - If image generation fails → show static card with text-only
  - If share fails (permissions denied) → show "Copy link" option
  - Acceptance: User can always share (graceful degradation)

- [ ] **Tests**
  - Integration: End-to-end card generation + share flow
  - Unit: Uniqueness filter, link embedding
  - Files: `app/__tests__/integration/viralLoops.e2e.test.ts`
  - Acceptance: 80% coverage, E2E passes on both platforms

**Global Acceptance:**
- Card renders <3s with fallback
- Uniqueness enforced (14 days)
- Attribution tracked (card_viewed → join)

---

#### **PR19 – Progress Reel Creator & Consent**
**Area:** Frontend + Backend | **Risk:** High | **Effort:** L | **Owner:** Engineer B (frontend) + Engineer A (backend)

**Scope:** Privacy-compliant progress reels with consent management.

**Dependencies:** PR15 (referral links), PR16 (orchestrator), PR20 (session summaries)

**Kill-Switch:** `growth.loops.progressReel.enabled`

**Tasks:**
- [ ] **Consent Schema & Revocation**
  - `/consents/{userId}` → granted consents (progressSharing, dataSharing)
  - Revocation trigger: Delete media within 1h
  - Files: `app/src/types/growthTypes.ts`, `functions/src/growth/onConsentRevoked.ts`, `firestore.rules`
  - Acceptance: Consent changes propagate <1h, media deleted

- [ ] **PII Redaction Pipeline**
  - Regex + NER to scrub: names, emails, phones, school names
  - Test dataset: 100 session summaries (must be 100% PII-free)
  - Files: `functions/src/ai/piiRedaction.ts`, `functions/__tests__/piiRedaction.test.ts`
  - Acceptance: 100% PII-free on test dataset

- [ ] **Video Generation**
  - Cloudinary Video API: 15-30s reel with highlights
  - Audio-safe background music (royalty-free)
  - Fallback: Animated card (no video) if generation fails
  - Files: `functions/src/growth/generateProgressReel.ts`
  - Acceptance: Reel generated <30s, fallback works

- [ ] **Frontend UX**
  - `ConsentExplainer.tsx`: Explain what's shared, show example
  - `ProgressReelModal.tsx`: Preview reel, share via native sheet
  - Files: `app/src/components/growth/ConsentExplainer.tsx`, `app/src/components/growth/ProgressReelModal.tsx`
  - Acceptance: User can preview before sharing, consent flow clear

- [ ] **Fallback Behavior**
  - If reel generation times out (>60s) → fallback to static card
  - If Cloudinary API down → skip reel, offer text-based share
  - Preserve attribution in fallback (text link still tracked)
  - Acceptance: User never blocked, fallback preserves K-factor

- [ ] **Analytics**
  - Emit: `reel_generated`, `reel_shared`, `reel_viewed`, `consent_granted`, `consent_revoked`
  - Include: consent metadata (grantedAt, revokedAt)
  - Files: `app/src/services/growth/progressReelService.ts`, `app/src/services/growth/experimentService.ts`
  - Acceptance: 100% events tracked, consent changes logged

- [ ] **Tests**
  - Unit: PII redaction, video generation, consent logic
  - Integration: End-to-end consent → reel → share flow
  - Files: `functions/__tests__/piiRedaction.test.ts`, `app/__tests__/integration/viralLoops.e2e.test.ts`
  - Acceptance: 80% coverage, E2E passes

**Global Acceptance:**
- Consent required, PII redaction 100% on test set
- Reel generated <30s with fallback (static card)
- Consent changes propagate within 24h

---

#### **PR26 – Async Results Surfaces + Micro-FVM** ⭐ **NEW**
**Area:** Frontend + Backend | **Risk:** Medium | **Effort:** L | **Owner:** Engineer B (frontend) + Engineer A (backend)

**Scope:** Privacy-safe results pages for diagnostics/practice + 5-question micro-FVM deep link for new users; cohort variant.

**Dependencies:** PR15 (referral links), PR16 (orchestrator)

**Kill-Switch:** `growth.results.sharingEnabled`, `growth.microFVM.enabled`

**Tasks:**
- [ ] **Results Page Schema**
  - Define results format: `{ userId, type (diagnostic|practice), score, skillsHeatmap, recommendations }`
  - Privacy: Redact PII (student names, school names)
  - Files: `app/src/types/growthTypes.ts`
  - Acceptance: Schema covers 3 result types (diagnostic, practice, skill-check)

- [ ] **OG Card Generation**
  - Create shareable Open Graph cards for results
  - Include: Score, top skill gains, referral link
  - Files: `functions/src/growth/generateResultsCard.ts`
  - Acceptance: Cards render <2s, OG preview works

- [ ] **Micro-FVM Deep Link**
  - 5-question skill check (e.g., "Algebra Basics")
  - Guest users can complete in <90s (no signup required)
  - Attribution: Install-deferred context hydration (link tracks to signup)
  - Files: `app/src/components/growth/MicroFVMScreen.tsx`, `functions/src/growth/microFVMGenerator.ts`
  - Acceptance: Guest completes <90s, join attributed to referral

- [ ] **Cohort Variant**
  - Teacher/tutor can share results for entire class/cohort
  - Link format: `/results/cohort/{cohortId}?ref={referralId}`
  - Opens directly to cohort leaderboard (see PR27)
  - Files: `app/src/components/growth/CohortResultsCard.tsx`
  - Acceptance: Cohort variant works, no PII leaks

- [ ] **Install-Deferred Context**
  - Store referral context (resultId, cohortId) on first link click
  - Hydrate after signup: Show original result that brought them
  - Files: `functions/src/growth/referralHandler.ts` (extend PR15)
  - Acceptance: Context preserved across install → signup

- [ ] **Analytics**
  - Emit: `results_shared`, `results_viewed`, `microFVM_started`, `microFVM_completed`, `join_from_results`
  - Track: Time to complete micro-FVM (target <90s)
  - Files: `app/src/services/growth/experimentService.ts`
  - Acceptance: 100% events tracked, funnel visible

- [ ] **Fallback Behavior**
  - If micro-FVM unavailable → show "Sign up to see full results"
  - If OG card fails → share text-based link
  - Acceptance: User can always share (graceful degradation)

- [ ] **Tests**
  - Integration: End-to-end results share → micro-FVM → signup
  - Unit: PII redaction, OG card generation, context hydration
  - Files: `app/__tests__/integration/viralLoops.e2e.test.ts`
  - Acceptance: 80% coverage, E2E passes

**Global Acceptance:**
- Guest completes micro-FVM <90s
- Results share link attributes join → FVM
- Teacher/tutor cohort variant enabled

---

### **👥 Social & Presence (Week 3-5)**

---

#### **PR21 – Activity Feed**
**Area:** Frontend | **Risk:** Low | **Effort:** M | **Owner:** Engineer B

**Scope:** Real-time "Alive" layer (subject presence + mini-feed).

**Dependencies:** None (uses existing `/presence` from PR3)

**Kill-Switch:** `growth.activityFeed.enabled`

**Tasks:**
- [ ] **Presence Aggregation**
  - Scheduled function (every 5 min): Compute active sessions by subject
  - Store in `/presence/subjects` → `{ subject, activeCount, updatedAt }`
  - Files: `functions/src/presence/computeSubjectPresence.ts`, `app/src/types/growthTypes.ts`
  - Acceptance: Aggregates update every 5 min, zero stale data

- [ ] **Feed UI**
  - Horizontal scroll: "🔥 12 Math sessions active now", "📚 5 Physics tutors online"
  - Tap-through to subject-specific detail modal
  - Files: `app/src/components/growth/ActivityFeed.tsx`, `app/src/components/growth/ActivityDetailModal.tsx`
  - Acceptance: Feed renders <100ms, updates every 5 min

- [ ] **CTA Routing**
  - "Join a Math session" → existing booking flow (no new scope)
  - "Start practicing Physics" → existing practice flow
  - Files: `app/src/components/growth/ActivityFeed.tsx`
  - Acceptance: CTAs route to existing screens, zero new flows

- [ ] **Performance**
  - Cache query: `/presence/subjects` (5 min TTL)
  - Background refresh: Firestore listener updates feed silently
  - Files: `app/src/hooks/useSubjectPresence.ts`
  - Acceptance: Feed load <100ms (P95), background refresh works

- [ ] **Fallback Behavior**
  - If presence data unavailable → show "Explore subjects" CTA
  - If aggregation fails → skip feed (don't block app)
  - Acceptance: User never blocked, fallback tested

- [ ] **Tests**
  - Integration: End-to-end feed rendering + CTA routing
  - Unit: Presence aggregation logic
  - Files: `app/__tests__/integration/viralLoops.e2e.test.ts`
  - Acceptance: 80% coverage, E2E passes

**Global Acceptance:**
- Feed refreshes every 5 min
- PII-free aggregates (no student names)
- Load time <100ms (P95)

---

#### **PR27 – Social Presence v2 (Cohort Rooms + Mini-Leaderboards)** ⭐ **NEW**
**Area:** Frontend + Backend | **Risk:** Medium | **Effort:** L | **Owner:** Engineer B (frontend) + Engineer A (backend)

**Scope:** Real-time cohort rooms (participants, streaks, upcoming sessions), per-subject leaderboards with fairness rules, opt-out.

**Dependencies:** PR21 (activity feed), PR25 (XP for leaderboard)

**Kill-Switch:** `growth.cohortRooms.enabled`, `growth.leaderboards.enabled`

**Tasks:**
- [ ] **Cohort Room Data**
  - Extend existing `/cohorts/{cohortId}` with: `{ participants, streaks, upcomingSessions, lastActiveAt }`
  - Real-time listener for joins/leaves
  - Files: `app/src/types/growthTypes.ts`, `firestore.rules`
  - Acceptance: Room state updates in <2s (P95)

- [ ] **Cohort Room UI**
  - Show: Participant avatars, current streaks, next session countdown
  - Actions: Invite friend, view leaderboard, opt-out
  - Files: `app/src/components/growth/CohortRoomScreen.tsx`
  - Acceptance: Room loads <1s, real-time updates work

- [ ] **Mini-Leaderboard**
  - Rank by: XP per subject (Math, Science, etc.)
  - Fairness rules: Age bands (13-15, 16-18), new-user boost (first 30 days)
  - Opt-out: User can hide from leaderboard (privacy setting)
  - Files: `functions/src/growth/leaderboardService.ts`, `app/src/components/growth/LeaderboardCard.tsx`
  - Acceptance: Fairness rules enforced, abuse rate <0.5%

- [ ] **Leaderboard Computation**
  - Scheduled function (daily): Compute rankings per subject per age band
  - Store in `/leaderboards/{subject}/{ageBand}` → top 100
  - Files: `functions/src/growth/leaderboardService.ts`
  - Acceptance: Rankings update daily, historical data retained

- [ ] **Opt-Out Flow**
  - User toggles "Show me on leaderboards" in settings
  - Immediate removal from public rankings
  - Files: `app/src/components/growth/PrivacySettings.tsx`
  - Acceptance: Opt-out takes effect within 15 min

- [ ] **Abuse Prevention**
  - Velocity check: Max 1000 XP/day (flag for review if exceeded)
  - Device fingerprinting: Detect multi-account farming
  - Files: `functions/src/fraud/anomalyDetector.ts` (reuse PR22)
  - Acceptance: Abuse rate <0.5%, flagged users removed from leaderboard

- [ ] **Analytics**
  - Emit: `cohort_joined`, `cohort_left`, `leaderboard_viewed`, `leaderboard_opt_out`
  - Track: Time spent in cohort room (engagement metric)
  - Files: `app/src/services/growth/experimentService.ts`
  - Acceptance: 100% events tracked

- [ ] **Fallback Behavior**
  - If leaderboard unavailable → show "Coming soon" message
  - If cohort room fails → show static participant list
  - Acceptance: User never blocked, fallback tested

- [ ] **Tests**
  - Integration: End-to-end cohort room + leaderboard
  - Unit: Fairness rules, opt-out logic, abuse detection
  - Files: `app/__tests__/integration/viralLoops.e2e.test.ts`, `functions/__tests__/leaderboardService.test.ts`
  - Acceptance: 80% coverage, E2E passes

**Global Acceptance:**
- Presence latency P95 <2s
- Room joins/leaves recorded in real-time
- Leaderboard fairness policies enforced
- Abuse rate <0.5%

---

### **🤖 AI & Transcription (Week 3-5)**

---

#### **PR20 – Transcription & Agentic Actions**
**Area:** Backend + Frontend | **Risk:** High | **Effort:** L | **Owner:** Engineer A (backend) + Engineer B (frontend notifications)

**Scope:** Transcribe sessions, summarize, trigger 4+ agentic actions.

**Dependencies:** PR16 (orchestrator for action triggers), PR25 (incentives for rewards)

**Kill-Switch:** `growth.transcription.enabled`, `growth.agenticActions.enabled`

**Tasks:**
- [ ] **Whisper Integration**
  - Trigger on: Recording uploaded to `/recordings/{sessionId}`
  - Call: OpenAI Whisper API → store transcript in `/transcripts/{sessionId}`
  - Retention: 90 days (auto-delete)
  - Files: `functions/src/transcription/transcribeSession.ts`
  - Acceptance: Transcription completes <10 min for 60 min session

- [ ] **Session Summarizer**
  - GPT-4o-mini: Summarize transcript → `{ highlights, topics, studentProgress, nextSteps }`
  - Store in `/sessions/{sessionId}/summary`
  - Files: `functions/src/ai/sessionSummarizer.ts`
  - Acceptance: Summary generated <30s, cost <$0.50/session

- [ ] **Action Analyzer**
  - Rules: If 5★ rating → TutorCard, if progressMade → ProgressReel, if testTopic → StudyBuddy, always → PrepPack
  - Output: List of actions to execute
  - Files: `functions/src/growth/actionAnalyzer.ts`
  - Acceptance: ≥4 distinct actions identified per session type

- [ ] **Action Executor**
  - Execute actions: Generate card/reel, send notification, schedule follow-up
  - Integrate with orchestrator: Check eligibility + cooldowns
  - Files: `functions/src/growth/actionExecutor.ts`
  - Acceptance: Actions triggered within 5 min of summary

- [ ] **Client Notifications**
  - Push notification: "Your session highlights are ready!"
  - In-app toast: "Share your progress with parents"
  - Files: `app/src/services/growth/referralService.ts` (notification handler)
  - Acceptance: Notifications delivered <1 min, opt-out honored

- [ ] **Fallback Behavior**
  - If Whisper fails → retry 3x, then mark transcript unavailable
  - If summarization fails → use static template ("Great session!")
  - If action execution fails → log to `/failed_actions` for manual retry
  - Acceptance: User never blocked, transcript failure doesn't block session completion

- [ ] **Cost Controls**
  - Budget: $0.50/session (Whisper $0.36 + GPT $0.10 + overhead $0.04)
  - Throttle: Max 100 transcriptions/day (increase gradually)
  - Alert: If cost exceeds $50/day
  - Files: `functions/src/transcription/transcribeSession.ts` (budget tracking)
  - Acceptance: Cost stays within budget, alerts trigger

- [ ] **Tests**
  - Unit: Transcription, summarization, action analysis
  - Integration: End-to-end session → transcript → summary → actions
  - Files: `functions/__tests__/transcriptionPipeline.test.ts`
  - Acceptance: 80% coverage, E2E passes

**Global Acceptance:**
- Transcription completes <10 min (60 min session)
- Summary generated <30s
- ≥4 actions triggered per session
- Cost <$0.50/session

---

#### **🔁 Extension: Next-Session Prep Pack**

**Scope:** Generate prep pack from previous summary + upcoming topic.

**Dependencies:** PR20 (session summaries)

**Kill-Switch:** `growth.prepPack.enabled`

**Tasks:**
- [ ] **Resource Curation**
  - Extract: Practice items, links, brief plan from summary
  - AI: GPT-4o-mini generates 3-5 resources based on nextSteps
  - Files: `functions/src/growth/prepPackGenerator.ts`
  - Acceptance: Prep pack generated <15s

- [ ] **AI Summarization Integration**
  - Compile: "Based on last session, here's what to practice..."
  - Include: Links to existing practice decks, external resources (Khan Academy)
  - Files: `functions/src/ai/sessionSummarizer.ts` (extend)
  - Acceptance: Prep pack includes 3+ actionable items

- [ ] **Share Flow (Frontend)**
  - Modal: Preview prep pack, share via email/SMS to student/parent
  - Include: Referral link (tutor can invite peers to use platform)
  - Files: `app/src/components/growth/PrepPackModal.tsx`, `app/src/services/growth/prepPackService.ts`
  - Acceptance: Share flow works, attribution tracked

- [ ] **Analytics**
  - Emit: `prepPack_generated`, `prepPack_shared`, `prepPack_viewed`
  - Track: Completion rate (did student practice recommended items?)
  - Files: `app/src/services/growth/experimentService.ts`
  - Acceptance: 100% events tracked

- [ ] **Fallback Behavior**
  - If prep pack generation fails → show generic "Practice more" message
  - Acceptance: User never blocked

- [ ] **Tests**
  - Integration: End-to-end prep pack generation + share
  - Files: `app/__tests__/integration/viralLoops.e2e.test.ts`
  - Acceptance: 80% coverage, E2E passes

**Acceptance:**
- Prep pack generated for 3 session types
- Share flow functional, attribution tracked

---

### **🛡️ Trust & Safety (Week 4-5)**

---

#### **PR22 – Fraud Detection & Review**
**Area:** Trust | **Risk:** High | **Effort:** L | **Owner:** Engineer A

**Scope:** Anomaly scoring, device/IP clustering, captcha, review queue.

**Dependencies:** PR15 (referral tracking), PR17 (experimentation to exclude fraud from K)

**Kill-Switch:** `growth.fraud.detectionEnabled`, `growth.fraud.captchaEnabled`

**Tasks:**
- [ ] **Anomaly Score**
  - Score 0-100 from: Velocity (invites/day), device reuse (same deviceId for multiple users), IP entropy (suspicious patterns)
  - Threshold: >70 = flag, >90 = auto-block
  - Files: `functions/src/fraud/anomalyDetector.ts`
  - Acceptance: Score computed <50ms, thresholds tuned to <0.5% false positives

- [ ] **Device Clustering**
  - Hash deviceId: Group users with same device
  - Suppress: If >3 users from same device → flag all
  - Files: `functions/src/fraud/deviceClustering.ts`
  - Acceptance: Clustering accurate, false positive rate <1%

- [ ] **IP Clustering**
  - Subnet grouping: `/24` CIDR blocks
  - Suppress: If >10 signups from same subnet in 1 hour → flag
  - Files: `functions/src/fraud/ipClustering.ts`
  - Acceptance: Clustering accurate, VPN/mobile IPs handled

- [ ] **Captcha Challenge**
  - Adaptive: Show hCaptcha if anomaly score >70
  - Require: Before `join_completed` event
  - Files: `functions/src/fraud/captchaHandler.ts`, `functions/src/growth/referralHandler.ts`
  - Acceptance: Captcha reduces fraud by ≥80%, user friction <5%

- [ ] **Review Queue**
  - Collection: `/fraud_queue/{referralId}` → flagged referrals
  - UI: Admin dashboard (PR29) for manual review
  - Actions: Approve, Reject, Ban user
  - Files: `functions/src/growth/referralHandler.ts`, `app/src/types/growthTypes.ts`
  - Acceptance: Admins can review 100 items/hour

- [ ] **Exclusion from K-Factor**
  - Flagged referrals excluded from K-factor calculation
  - If later approved → retroactively include
  - Files: `functions/src/growth/computeMetrics.ts` (extend PR17)
  - Acceptance: K-factor excludes fraud, accurate within 1%

- [ ] **Client Integration**
  - Mobile calls fraud service on suspicious patterns (client-side heuristics)
  - Files: `app/src/services/growth/fraudDetectionService.ts`
  - Acceptance: Client-side checks add <100ms latency

- [ ] **Fallback Behavior**
  - If fraud service down → allow (optimistic), flag for review
  - If captcha API down → skip captcha, log incident
  - Acceptance: User never blocked by fraud infrastructure failure

- [ ] **Tests**
  - Unit: Anomaly scoring, clustering logic, captcha integration
  - Integration: End-to-end fraud detection → review → exclusion
  - Files: `functions/__tests__/anomalyDetector.test.ts`
  - Acceptance: 80% coverage, E2E passes

**Global Acceptance:**
- Anomaly scoring, captcha, review queue functional
- Flagged joins excluded from K-factor
- Abuse rate <0.5%

---

### **🎓 Student & Parent Loops (Week 4-6)**

---

#### **PR23 – Study Buddy Challenge**
**Area:** Frontend + Backend | **Risk:** Low | **Effort:** M | **Owner:** Engineer A (backend) + Engineer B (frontend)

**Scope:** Student→Student loop to invite peers into shared streaks.

**Dependencies:** PR15 (referral links), PR16 (orchestrator), PR20 (agentic actions)

**Kill-Switch:** `growth.loops.studyBuddy.enabled`

**Tasks:**
- [ ] **Backend: Challenge Asset + Link**
  - Create challenge: `{ studentId, subject, topic, questions[5], streakReward }`
  - Generate signed link: `/challenge/{challengeId}?ref={referralId}`
  - Files: `functions/src/growth/actionExecutor.ts`, `functions/src/utils/links.ts`
  - Acceptance: Challenge created <500ms, link valid 7 days

- [ ] **Frontend: Challenge Modal**
  - UI: Select friend (from contacts), preview challenge, share via native sheet
  - Show: "Beat my score! Complete 5 questions, earn streak shield"
  - Files: `app/src/components/growth/ActivityDetailModal.tsx`
  - Acceptance: Modal renders <500ms, share works

- [ ] **Eligibility & Cooldown**
  - Limit: Once per 48h per subject
  - Integrate: Orchestrator checks cooldown before creating challenge
  - Files: `functions/src/growth/loopOrchestrator.ts`
  - Acceptance: Cooldowns enforced, zero spam

- [ ] **Analytics**
  - Emit: `challenge_sent`, `challenge_opened`, `challenge_completed`, `streak_earned`
  - Track: Completion rate (% of opened challenges completed)
  - Files: `app/src/types/growthTypes.ts`, `functions/src/growth/computeMetrics.ts`
  - Acceptance: 100% events tracked, funnel visible

- [ ] **Fallback Behavior**
  - If challenge creation fails → show "Try again" message
  - Acceptance: User never blocked

- [ ] **Tests**
  - Integration: End-to-end challenge creation → share → completion
  - Files: `app/__tests__/integration/viralLoops.e2e.test.ts`
  - Acceptance: 80% coverage, E2E passes

**Global Acceptance:**
- Challenge created <500ms, limited to 48h cooldown
- Analytics tracked, streak rewards issued

---

#### **PR30 – Second Student Loop** ⭐ **NEW** (Choose One)
**Area:** Frontend + Backend | **Risk:** Low | **Effort:** M | **Owner:** Engineer A (backend) + Engineer B (frontend)

**Scope:** Choose Option A (Streak Rescue) or Option B (Beat-My-Skill).

**Dependencies:** PR23 (first student loop), PR16 (orchestrator), PR25 (incentives)

**Kill-Switch:** `growth.loops.streakRescue.enabled` OR `growth.loops.beatMySkill.enabled`

**Option A: Streak Rescue**

**Tasks:**
- [ ] **Phone-a-Friend Flow**
  - Detect: Streak at risk (user hasn't practiced in 20+ hours)
  - Prompt: "Phone-a-friend to keep your streak alive!"
  - Friend joins: Both complete 5-question co-practice
  - Reward: Streak shield (prevents loss for 24h)
  - Files: `functions/src/growth/streakRescueService.ts`, `app/src/components/growth/StreakRescueModal.tsx`
  - Acceptance: Rescue triggered within 4h of risk, both users rewarded

- [ ] **Co-Practice Session**
  - Real-time: Show friend's progress (questions completed)
  - Completion: Both must finish to earn shield
  - Files: `app/src/components/growth/CoPracticeScreen.tsx`
  - Acceptance: Session completes <5 min, progress synced

- [ ] **Analytics**
  - Emit: `rescue_triggered`, `friend_invited`, `rescue_completed`, `streak_saved`
  - Files: `app/src/services/growth/experimentService.ts`
  - Acceptance: 100% events tracked

**Option B: Beat-My-Skill**

**Tasks:**
- [ ] **Micro-Deck Creation**
  - Auto-generate: 5 questions from student's recent skill practice
  - Include: Score to beat (student's best attempt)
  - Files: `functions/src/growth/microDeckGenerator.ts`
  - Acceptance: Deck generated <5s, questions relevant

- [ ] **Share Flow**
  - Modal: "Challenge a friend to beat my score!"
  - Link: Opens directly to micro-deck (no signup required for guest)
  - Files: `app/src/components/growth/BeatMySkillModal.tsx`
  - Acceptance: Share works, guest can attempt

- [ ] **Reward Logic**
  - Both get: XP if friend beats score, streak shield if friend reaches 80%+
  - Files: `functions/src/growth/incentivesAgent.ts` (extend PR25)
  - Acceptance: Rewards issued correctly

- [ ] **Analytics**
  - Emit: `deck_shared`, `deck_attempted`, `score_beaten`, `both_rewarded`
  - Files: `app/src/services/growth/experimentService.ts`
  - Acceptance: 100% events tracked

**Shared Tasks (Both Options):**
- [ ] **Eligibility & Cooldown**
  - Limit: Once per 48h (same as PR23)
  - Files: `functions/src/growth/loopOrchestrator.ts`
  - Acceptance: Cooldowns enforced

- [ ] **Abuse Prevention**
  - Max 10 invites/day (integrated with PR22)
  - Files: `functions/src/fraud/anomalyDetector.ts`
  - Acceptance: Spam rate <0.5%

- [ ] **Fallback Behavior**
  - If second user doesn't respond → initial user still gets partial credit
  - Acceptance: User never penalized for friend inactivity

- [ ] **Tests**
  - Integration: End-to-end loop creation → share → completion
  - Files: `app/__tests__/integration/viralLoops.e2e.test.ts`
  - Acceptance: 80% coverage, E2E passes

**Global Acceptance:**
- ≥2 student agentic actions shipped (PR23 + PR30)
- Abuse/spam thresholds enforced
- Opt-out honored

---

#### **PR24 – Parent Pod Invites & Tutor→Tutor Referrals**
**Area:** Frontend + Backend | **Risk:** Low | **Effort:** M | **Owner:** Engineer A (backend) + Engineer B (frontend)

**Scope:** Group invite loop and tutor network growth.

**Dependencies:** PR15 (referral links), PR16 (orchestrator), PR27 (cohort rooms)

**Kill-Switch:** `growth.loops.parentPod.enabled`, `growth.loops.tutorPeer.enabled`

**Tasks:**
- [ ] **Parent Pod Invites**
  - Generate: Group/cohort invite link using existing `cohortId`
  - Link format: `/join/cohort/{cohortId}?ref={parentId}`
  - Opens: Directly to cohort room (PR27)
  - Files: `functions/src/growth/parentPodInvites.ts`, `app/src/components/growth/ActivityFeed.tsx`
  - Acceptance: Link opens cohort room, attribution tracked

- [ ] **Tutor→Tutor Referral**
  - Allow: Tutors recommend tutors (complementary subjects)
  - Reward: Both get XP + leaderboard visibility (PR25 + PR27)
  - Link format: `/join/tutor/{tutorId}?ref={referringTutorId}`
  - Files: `functions/src/growth/tutorPeerReferral.ts`, `app/src/types/growthTypes.ts`
  - Acceptance: Attribution works, XP rewarded

- [ ] **Deep Link Context**
  - Open directly to: Cohort room or tutor onboarding
  - Context hydration: Show "Invited by Parent A" or "Recommended by Tutor B"
  - Files: `functions/src/utils/links.ts`, `app/src/services/growth/referralService.ts`
  - Acceptance: Context preserved, user sees who invited them

- [ ] **Analytics & Guardrails**
  - Emit: `pod_invite_sent`, `pod_joined`, `tutor_referred`, `tutor_joined`
  - Exclude: Suspicious clusters (PR22 fraud module)
  - Files: `functions/src/growth/computeMetrics.ts`, `functions/src/fraud/anomalyDetector.ts`
  - Acceptance: 100% events tracked, fraud excluded

- [ ] **Fallback Behavior**
  - If cohort room unavailable → show static participant list
  - If tutor onboarding fails → show "Contact support" message
  - Acceptance: User never blocked

- [ ] **Tests**
  - Integration: End-to-end pod invite → join → cohort room
  - Integration: End-to-end tutor referral → join → XP reward
  - Files: `app/__tests__/integration/viralLoops.e2e.test.ts`
  - Acceptance: 80% coverage, E2E passes

**Global Acceptance:**
- Deep links open correct context (cohort room, tutor onboarding)
- Analytics tracked, fraud excluded
- Both loops functional

---

### **📜 Compliance & Hardening (Week 6)**

---

#### **PR31 – Compliance Memo & DSR Hooks** ⭐ **NEW**
**Area:** Trust | **Risk:** High | **Effort:** M | **Owner:** Engineer A (backend) + Legal review

**Scope:** 1-pager covering COPPA/FERPA, data flows, consent gates, retention; implement delete/export user data hooks; tests for consent revocation.

**Dependencies:** PR19 (consent system)

**Kill-Switch:** N/A (compliance always active)

**Tasks:**
- [ ] **Compliance Memo (1-Pager)**
  - Document: COPPA/FERPA requirements, data flows (session → transcript → summary → share)
  - Consent gates: Parent must enable "Share progress" for reels
  - Retention: Transcripts 90 days, reels 30 days, referrals 1 year
  - PII handling: Redaction applied before any sharing
  - Files: `docs/COMPLIANCE_MEMO.md`
  - Acceptance: Memo approved by legal counsel

- [ ] **Data Subject Rights (DSR) Endpoints**
  - `/user/{userId}/export` → JSON export of all user data
  - `/user/{userId}/delete` → Soft delete (mark deleted, purge after 30 days)
  - Files: `functions/src/compliance/dsrHandler.ts`
  - Acceptance: Endpoints pass tests, GDPR/CCPA compliant

- [ ] **Delete User Data Hook**
  - On delete: Remove from `/users`, `/referrals`, `/consents`, `/rewards`, `/balances`
  - Anonymize: `/agent_logs`, `/loop_exposures` (keep for analytics, strip PII)
  - Files: `functions/src/compliance/deleteUserData.ts`
  - Acceptance: All user data deleted/anonymized within 24h

- [ ] **Export User Data Hook**
  - Export: All collections where userId appears (JSON format)
  - Include: Messages, sessions, referrals, rewards, consents
  - Files: `functions/src/compliance/exportUserData.ts`
  - Acceptance: Export completes <5 min, all data included

- [ ] **Consent Revocation Tests**
  - Test: User revokes consent → reels deleted within 1h
  - Test: Parent disables sharing → no new reels generated
  - Files: `functions/__tests__/consentRevocation.test.ts`
  - Acceptance: Consent changes propagate <1h

- [ ] **PII Audit**
  - Scan: All logs, share cards, analytics events for PII
  - Verify: 100% redaction on test dataset
  - Files: `functions/__tests__/piiAudit.test.ts`
  - Acceptance: Zero PII leaks in production

- [ ] **Tests**
  - Unit: DSR endpoints, delete/export logic
  - Integration: End-to-end user deletion + data verification
  - Files: `functions/__tests__/dsr.test.ts`
  - Acceptance: 80% coverage, E2E passes

**Global Acceptance:**
- Memo approved by legal counsel
- DSR endpoints pass tests (GDPR/CCPA compliant)
- Consent changes propagate within 24h

---

## 📅 Roadmap View (By Week)

### **Week 1-2: Infrastructure & Foundations**
- **PR15** – Referral Attribution System (Engineer A)
- **PR16** – Loop Orchestrator (Engineer A)
- **PR28** – MCP Contracts + Rationale Logging (Engineer A)
- **PR32** – Degradation & Feature Kills (Engineer A)
- **PR25** – Incentives & Economy Agent (Engineer A)

**Deliverables:** Attribution working, orchestrator live, kill-switches tested, rewards issued

---

### **Week 3-4: Viral Surfaces & Experimentation**
- **PR17** – Experimentation Framework (Engineer A)
- **PR17.5** – Personalization Agent (Engineer A + Engineer B)
- **PR18** – Tutor Card Generator (Engineer B)
- **PR26** – Async Results Surfaces + Micro-FVM (Engineer B + Engineer A)
- **PR21** – Activity Feed (Engineer B)

**Deliverables:** Tutor cards shareable, experiments running, results pages viral, activity feed live

---

### **Week 4-5: AI, Social, Fraud**
- **PR19** – Progress Reel Creator & Consent (Engineer B + Engineer A)
- **PR20** – Transcription & Agentic Actions (Engineer A + Engineer B)
- **PR27** – Social Presence v2 (Cohort Rooms + Leaderboards) (Engineer B + Engineer A)
- **PR22** – Fraud Detection & Review (Engineer A)

**Deliverables:** Reels generated, transcription live, cohort rooms functional, fraud detection active

---

### **Week 5-6: Student/Parent Loops & Ops**
- **PR23** – Study Buddy Challenge (Engineer A + Engineer B)
- **PR30** – Second Student Loop (Engineer A + Engineer B)
- **PR24** – Parent Pod Invites & Tutor→Tutor Referrals (Engineer A + Engineer B)
- **PR29** – Growth Ops Dashboard (Engineer A + TBD frontend)

**Deliverables:** Student loops live, parent/tutor loops functional, ops dashboard accessible

---

### **Week 6: Compliance & Hardening**
- **PR31** – Compliance Memo & DSR Hooks (Engineer A + Legal)
- Hardening: Load tests, abuse tests, kill-switch drills
- Launch prep: Feature flags at 5%, rollback plan

**Deliverables:** Compliance approved, DSR endpoints tested, soft-launch ready

---

## ✅ Checklist View (By PR)

### **Infrastructure (PR15-16, 28, 32)**
- [ ] PR15: Referral attribution (95% accuracy, <100ms link gen)
- [ ] PR16: Loop orchestrator (P95 <150ms, rationale logged)
- [ ] PR28: MCP logging (100% agent calls logged, PII-free)
- [ ] PR32: Feature kills (all kill-switches tested, fallbacks work)

### **Experimentation & Analytics (PR17, 29)**
- [ ] PR17: Experiments (K-factor daily, guardrails auto-pause)
- [ ] PR29: Ops dashboard (live metrics <1h lag, kill-switches functional)

### **Incentives (PR25)**
- [ ] PR25: Rewards ledger (deterministic issuance, caps honored, ROI visible)

### **Viral Surfaces (PR17.5, 18, 19, 26)**
- [ ] PR17.5: Personalization (persona + locale copy, EN/ES/FR)
- [ ] PR18: Tutor cards (render <3s, uniqueness 14d, attribution tracked)
- [ ] PR19: Progress reels (consent required, PII redaction 100%, fallback works)
- [ ] PR26: Results + micro-FVM (guest completes <90s, cohort variant enabled)

### **Social & Presence (PR21, 27)**
- [ ] PR21: Activity feed (refresh 5 min, load <100ms, PII-free)
- [ ] PR27: Cohort rooms + leaderboards (P95 <2s, fairness rules enforced, opt-out works)

### **AI & Transcription (PR20)**
- [ ] PR20: Transcription + actions (transcript <10 min, summary <30s, ≥4 actions triggered, cost <$0.50)
- [ ] PR20 Extension: Prep pack (generated for 3 session types, share flow functional)

### **Trust & Safety (PR22)**
- [ ] PR22: Fraud detection (anomaly scoring, captcha, review queue, abuse <0.5%)

### **Student/Parent/Tutor Loops (PR23, 30, 24)**
- [ ] PR23: Study Buddy (challenge created <500ms, cooldown 48h, analytics tracked)
- [ ] PR30: Second student loop (Option A or B shipped, abuse thresholds enforced)
- [ ] PR24: Parent pod + tutor peer (deep links work, analytics tracked, fraud excluded)

### **Compliance (PR31)**
- [ ] PR31: Compliance memo + DSR (memo approved, DSR endpoints tested, consent propagates <24h)

---

## 🌐 Global Acceptance Criteria (Applies to All PRs)

### **Observability**
- [ ] Metrics: All events logged to `/analytics_events` with experimentId, variantId
- [ ] Traces: Correlation IDs link loop → orchestrator → actions → outcomes
- [ ] Logs: Rationale logged for every agent decision (≤240 chars, PII-free)
- [ ] Dashboards: K-factor, funnels, retention visible in ops dashboard

### **Idempotency**
- [ ] All writes: Protected by `requestKey` (UUID) to prevent duplicates
- [ ] Referral creation: Same `referralId` never creates duplicate entry
- [ ] Reward issuance: Same `requestKey` never grants duplicate reward

### **Privacy**
- [ ] PII redaction: Applied to logs, share cards, analytics events
- [ ] Consent: Parental consent required for student data sharing
- [ ] Opt-out: Users can disable growth prompts (honored within 15 min)

### **Performance**
- [ ] Decision SLA: P95 ≤150ms for in-app triggers (orchestrator, fraud check)
- [ ] Background jobs: Complete within 15 min windows (metrics, leaderboards)
- [ ] Fallbacks: All critical paths degrade gracefully (no user-visible errors)

### **Security**
- [ ] Signed links: HMAC prevents tampering (verified on server)
- [ ] Rate limits: Max 10 invites/day per user (enforced)
- [ ] Device+IP heuristics: Fraud detection active (anomaly score >70 flagged)

### **Experimentation**
- [ ] Variant tagging: Every viral event includes experimentId + variantId
- [ ] Uplift computation: K-factor, retention deltas computed daily
- [ ] Auto-pause: Guardrails trigger within 1h if thresholds breached

### **Testing**
- [ ] Unit tests: ≥80% coverage for new modules
- [ ] E2E tests: Attribution, consent, personalization, loop flows tested
- [ ] Load tests: 100 RPS sustained, P95 latencies meet SLAs
- [ ] Abuse tests: Fraud detection catches ≥80% of simulated attacks

---

## 🚨 Blocking Assumptions & Missing Context

### **Assumptions**
1. **Firebase Dynamic Links** → If deprecated, need Branch.io migration (PR15)
2. **Cloudinary API** → Free tier sufficient for MVP (100 cards/day), upgrade if needed
3. **OpenAI Whisper** → Transcription cost $0.36/session, stays within budget
4. **Legal approval** → Compliance memo (PR31) must be approved before launch

### **Missing Context**
1. **Admin dashboard frontend** → Need to decide: Build custom React app or use Retool (PR29)
2. **Experiment allocation** → Confirm: Consistent hashing vs random assignment (PR17)
3. **Leaderboard fairness** → Need to define: Age bands, new-user boost percentages (PR27)
4. **Second student loop** → Choose: Streak Rescue (Option A) or Beat-My-Skill (Option B) (PR30)

### **Dependencies on External Services**
- OpenAI (Whisper, GPT-4o-mini)
- Cloudinary (card/reel generation)
- Firebase (Dynamic Links, FCM)
- hCaptcha (fraud prevention)

**Mitigation:** All have fallbacks (static cards, skip captcha, retry 3x)

---

## 🎯 Success Metrics (Phase 11 Complete)

### **Primary: K-Factor**
- [ ] K ≥ 1.20 in at least 1 loop (14-day cohort)
- [ ] Measured: (invites/user) × (joins/invite)
- [ ] Excludes: Fraudulent referrals (flagged by PR22)

### **Activation**
- [ ] +20% lift to first-value moment (FVM) rate for referred users
- [ ] Measured: % who complete micro-FVM or first practice session

### **Referral Mix**
- [ ] Referrals ≥30% of new weekly signups (from 0% baseline)
- [ ] Measured: Join source = referral link

### **Retention**
- [ ] +10% D7 retention for referred cohort vs organic
- [ ] Measured: D1, D7, D28 active users

### **Guardrails**
- [ ] <0.5% spam/abuse rate (fraudulent referrals)
- [ ] <1% opt-out rate (growth communications)
- [ ] Cost per referred user <$2 (transcription + LLM + hosting)

### **Tutor Utilization**
- [ ] +5% via referral conversion to sessions
- [ ] Measured: Referred users who book a session

### **Satisfaction**
- [ ] ≥4.7/5 CSAT on loop prompts & rewards
- [ ] Measured: In-app survey after sharing

---

**Status:** ✅ Platinum-Complete & Production-Ready  
**Maintainers:** Engineer A (Backend), Engineer B (Frontend)  
**Next Review:** Week 2 Post-Integration Testing  
**Version:** 2.0 (November 2025)
