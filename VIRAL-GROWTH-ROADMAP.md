# MessageAI Viral Growth — Implementation Sequence

**Goal:** K-Factor ≥ 1.20 | 6 weeks | 18 PRs

---

## 🚀 Quick Start (Week 1-2)

### **Phase 1: Foundation** 
*Must complete before anything else*

1. **PR15** – Referral Attribution ⚡ *BLOCKING*
   - Smart links + cross-device tracking
   - Test: Click → install → signup chain works

2. **PR16** – Loop Orchestrator ⚡ *BLOCKING*
   - Decision engine (<150ms)
   - Test: Cooldowns prevent spam

3. **PR32** – Feature Kills ⚡ *BLOCKING*
   - Kill-switches + fallbacks
   - Test: Toggle each flag, verify graceful degradation

4. **PR25** – Incentives Economy
   - XP, class passes, rewards ledger
   - Test: Rewards issued, caps enforced

5. **PR28** – MCP Logging
   - Agent rationale tracking
   - Test: Every decision logged, PII-free

---

## 📊 Phase 2: Metrics & Testing (Week 2-3)

6. **PR17** – A/B Experiments
   - K-factor computation + guardrails
   - Test: Variants split 50/50, K computed daily

7. **PR29** – Ops Dashboard
   - Live metrics + kill-switches UI
   - Test: Dashboard shows K-factor, toggles work <60s

---

## 🎨 Phase 3: Viral Surfaces (Week 2-4)
*Can parallelize*

8. **PR17.5** – Personalization
   - Persona + locale copy (EN/ES/FR)
   - Test: 3 personas × 3 locales = 9 variants

9. **PR18** – Tutor Cards ⭐ *FIRST VIRAL LOOP*
   - Shareable visual testimonials
   - Test: Card renders <3s, share works

10. **PR26** – Results + Micro-FVM
    - Results sharing + 5-question guest flow
    - Test: Guest completes <90s, join attributed

11. **PR21** – Activity Feed
    - Real-time presence by subject
    - Test: Feed refreshes every 5 min

---

## 🤖 Phase 4: AI Pipeline (Week 3-4)

12. **PR20** – Transcription + Agentic Actions
    - Whisper transcription + 4+ actions
    - Test: Transcript <10 min, actions triggered <5 min
    - **Extension:** Prep Pack generation

13. **PR19** – Progress Reels (requires PR20)
    - Privacy-compliant video highlights
    - Test: Consent required, PII redacted, consent revoke deletes media

---

## 👥 Phase 5: Social & Loops (Week 4-5)

14. **PR27** – Cohort Rooms + Leaderboards
    - Real-time presence + XP rankings
    - Test: Room updates <2s, opt-out honored

15. **PR23** – Study Buddy Challenge ⭐ *STUDENT LOOP*
    - Student→Student challenge sharing
    - Test: Challenge created <500ms, cooldown 48h

16. **PR30** – Second Student Loop (choose one)
    - **Option A:** Streak Rescue (phone-a-friend)
    - **Option B:** Beat-My-Skill (micro-deck)
    - Test: Rewards issued, abuse <0.5%

17. **PR24** – Parent Pod + Tutor Referrals
    - Group invites + tutor→tutor network
    - Test: Deep links open correct context

---

## 🛡️ Phase 6: Safety & Compliance (Week 5-6)

18. **PR22** – Fraud Detection
    - Anomaly scoring + captcha + review queue
    - Test: Fraud flagged, excluded from K-factor

19. **PR31** – Compliance & DSR ⚡ *LEGAL BLOCKER*
    - COPPA/FERPA memo + data export/delete
    - Test: Export <5 min, delete propagates <24h

---

## ✅ Testing Order

```
┌─ Infra (PR15, 16, 32) → MUST PASS FIRST
├─ Metrics (PR17, 29)   → Sets up dashboards
├─ Surfaces (PR18, 26, 21, 27) → Parallel OK
├─ AI (PR20, 19)        → Sequential (20 first)
├─ Loops (PR23, 30, 24) → Parallel OK
├─ Safety (PR22, 25, 28) → Anytime after PR16
└─ Compliance (PR31)    → Final gate before launch
```

---

## 🎯 Success Checklist

- [ ] Attribution accuracy ≥95%
- [ ] K-factor ≥1.20 in ≥1 loop
- [ ] All kill-switches tested in staging
- [ ] Fraud/abuse rate <0.5%
- [ ] Compliance memo approved
- [ ] Cost per referred user <$2

---

## 🚨 Quick Reference

**Blocking PRs:** PR15, PR16, PR32, PR31  
**First viral loop to ship:** PR18 (Tutor Cards)  
**Highest risk:** PR19 (consent), PR20 (cost), PR22 (fraud), PR31 (legal)  
**Can skip for MVP:** PR27 (leaderboards), PR30 (second student loop)

**Rollback:** Every PR has `growth.<feature>.enabled` flag  
**Evidence:** Screen recordings + logs + dashboard screenshots per PR

---

**Team:** Engineer A (Backend), Engineer B (Frontend)  
**Launch:** Soft-launch at 5% rollout after PR31 approved

