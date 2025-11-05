# MessageAI Compliance Memo

**Version:** 1.0  
**Date:** November 5, 2025  
**Status:** For Legal Review  
**Product:** MessageAI - AI-Powered Educational Platform

---

## Executive Summary

This memo documents MessageAI's compliance approach for COPPA (Children's Online Privacy Protection Act), FERPA (Family Educational Rights and Privacy Act), GDPR (General Data Protection Regulation), and CCPA (California Consumer Privacy Act). It outlines our data flows, consent management, retention policies, and user rights implementation.

---

## 1. Regulatory Framework

### 1.1 COPPA Compliance (Children Under 13)
- **Parental Consent Required:** All data collection for users under 13 requires verifiable parental consent
- **Consent Gates:** Parents must explicitly enable "Share progress" and "Data sharing" features
- **Right to Review:** Parents can review all data collected about their child
- **Right to Delete:** Parents can delete their child's account and all associated data
- **Limited Collection:** We collect only data necessary for educational purposes

### 1.2 FERPA Compliance (Educational Records)
- **Education Records:** Session transcripts, summaries, and progress data qualify as education records
- **Consent Required:** Sharing education records requires explicit user/parent consent
- **Directory Information:** Names and basic profile information treated as directory information
- **Access Rights:** Users/parents can access all education records
- **Amendment Rights:** Users can request corrections to inaccurate records

### 1.3 GDPR Compliance (EU Users)
- **Right to Access:** Users can export all personal data in JSON format
- **Right to Erasure:** Users can delete their account (soft delete + 30-day purge)
- **Right to Rectification:** Users can update their profile information
- **Right to Restriction:** Users can revoke consent for data processing
- **Data Portability:** Export includes all user data in machine-readable format
- **Privacy by Design:** PII redaction, server-side processing, minimal data collection

### 1.4 CCPA Compliance (California Residents)
- **Right to Know:** Users can request what data we collect and how it's used
- **Right to Delete:** Users can request deletion of personal information
- **Right to Opt-Out:** Users can opt-out of data sharing (no sale of personal information)
- **Non-Discrimination:** Same service quality for users who exercise privacy rights
- **Authorized Agent:** Parents can act as authorized agents for minors

---

## 2. Data Flows

### 2.1 Primary Data Flow

```
User Creates Session
  ↓
Session Data Collected (participants, time, subject)
  ↓
[CONSENT GATE 1: User must enable transcription]
  ↓
Audio Transcribed (OpenAI Whisper API)
  ↓
PII Redaction Applied (names, schools, locations → [REDACTED])
  ↓
AI Summarization (GPT-4o-mini)
  ↓
[CONSENT GATE 2: User must enable "Share progress"]
  ↓
Progress Reel Generated (privacy-compliant carousel)
  ↓
Reel Shared (with redacted content only)
```

### 2.2 Consent Gates

| Feature | Consent Required | Collection | Default |
|---------|-----------------|------------|---------|
| Basic Messaging | No | Always allowed | On |
| Session Recording | No | Always allowed | On |
| Transcription | Yes | `transcription.enabled` | Off |
| AI Summarization | Yes | `transcription.enabled` | Off |
| Progress Reels | Yes | `consents.progressSharing` | Off |
| Data Sharing | Yes | `consents.dataSharing` | Off |
| Tutor Cards | Yes | `consents.progressSharing` | Off |

### 2.3 PII Handling

**Before Sharing:**
1. **Name Redaction:** "John Smith" → "[REDACTED]"
2. **School Redaction:** "Lincoln High School" → "[REDACTED]"
3. **Location Redaction:** "San Francisco, CA" → "[REDACTED]"
4. **Device/IP Hashing:** SHA-256 hashing for fraud detection
5. **Server-Side Only:** Sensitive data never sent to client

**Example:**
```
Original: "John Smith from Lincoln High School scored 95% on the algebra test."
Redacted: "[REDACTED] from [REDACTED] scored 95% on the algebra test."
```

---

## 3. Data Retention

### 3.1 Retention Periods

| Data Type | Retention Period | Purge Method | Justification |
|-----------|-----------------|--------------|---------------|
| Transcripts | 90 days | Automatic deletion | Operational necessity |
| Progress Reels | 30 days | Automatic deletion | Feature-specific |
| Referrals | 1 year | Automatic deletion | Attribution window |
| Messages | User-controlled | Manual deletion | User content |
| Sessions | Indefinite | Manual deletion | Core educational record |
| Events | Indefinite | Manual deletion | Calendar data |
| Consent Logs | 7 years | Automatic deletion | Legal compliance |
| DSR Requests | 7 years | Automatic deletion | Legal compliance |
| Fraud Logs | 1 year | Automatic deletion | Security purposes |

### 3.2 Automatic Cleanup

**Daily Job:** `cleanupExpiredData` Cloud Function
- Deletes transcripts older than 90 days
- Deletes reels older than 30 days
- Deletes referrals older than 1 year
- Purges soft-deleted accounts after 30 days

---

## 4. Consent Management

### 4.1 Consent Types

#### progressSharing
- **Purpose:** Enable Progress Reels generation and sharing
- **Required For:** Progress Reels, Tutor Cards
- **Default:** Disabled (opt-in)
- **Revocation Effect:** Automatic deletion of all reels within 1 hour

#### dataSharing
- **Purpose:** Enable data sharing with third parties
- **Required For:** Future partnerships (not currently used)
- **Default:** Disabled (opt-in)
- **Revocation Effect:** No new data shared externally

### 4.2 Consent Storage

**Dual Storage Strategy:**
1. **Quick Access:** `/users/{userId}.consents.progressSharing` (boolean)
2. **Audit Trail:** `/consents/{userId}/history/{logId}` (timestamped log)

**Audit Log Entry:**
```json
{
  "userId": "abc123",
  "consentType": "progressSharing",
  "action": "granted",
  "timestamp": "2025-11-05T10:30:00Z",
  "metadata": {
    "triggeredBy": "parent",
    "ipAddress": "hashed_ip",
    "userAgent": "Mozilla/5.0..."
  }
}
```

### 4.3 Consent Revocation

**Automatic Cleanup Trigger:** `onConsentRevoked` Cloud Function
- **Trigger:** Firestore document update on `/users/{userId}`
- **Detection:** `consents.progressSharing` changes from `true` to `false`
- **Action:** Delete all reels for that user
- **Timing:** Completes within 1 hour
- **Logging:** Records deletion in `failed_operations` if errors occur

---

## 5. Data Subject Rights (DSR)

### 5.1 Right to Access (Export)

**Endpoint:** `exportUserDataEndpoint` Cloud Function

**Collections Exported:**
1. User profile (`/users/{userId}`)
2. Messages (`/messages` where `senderId == userId`)
3. Conversations (`/conversations` where `userId` in `participants`)
4. Events (`/events` where `userId` in `participants` or `createdBy`)
5. Sessions (`/sessions` where `userId` in `participants`)
6. Referrals (`/referrals` where `referrerId == userId`)
7. Rewards (`/rewards` where `userId == userId`)
8. Consent history (`/consents/{userId}/history`)
9. Challenges (`/challenges` where `creatorId == userId` or `participantId == userId`)
10. Progress Reels (`/reels` where `userId == userId`)
11. Tutor Cards (`/cards` where `tutorId == userId`)

**Format:** JSON export with metadata
**Performance:** Completes in <5 minutes
**Access Control:** Users can only export their own data (or admins)

**Example Export:**
```json
{
  "user": { "displayName": "Jane Doe", ... },
  "messages": [ ... ],
  "exportMetadata": {
    "exportedAt": "2025-11-05T10:30:00Z",
    "userId": "abc123",
    "collectionsIncluded": ["users", "messages", "events", ...]
  }
}
```

### 5.2 Right to Erasure (Delete)

**Endpoint:** `deleteUserAccountEndpoint` Cloud Function

**Deletion Strategy:**
1. **Soft Delete (Immediate):**
   - Mark user as deleted
   - Anonymize PII: `displayName` → "[Deleted User]"
   - Set purge date (30 days out)

2. **Active Collection Removal (Within 24 hours):**
   - Delete from: `/referrals`, `/consents`, `/rewards`, `/balances`, `/reels`, `/challenges`
   - Keep for compliance: `/dsr_requests` (7 years)

3. **Analytics Anonymization (Within 24 hours):**
   - Replace `userId` with `"deleted_user"` in `/agent_logs`, `/loop_exposures`
   - Preserve aggregate insights, strip PII

4. **Hard Delete (After 30 days):**
   - Firebase Auth account deleted
   - User document purged
   - Scheduled via `/scheduled_deletions` collection

**Access Control:** Users can only delete their own account (or admins)
**Compliance:** Meets GDPR/CCPA right to be forgotten

---

## 6. Security Measures

### 6.1 Data Protection

**Encryption:**
- **In Transit:** TLS 1.3 for all client-server communication
- **At Rest:** Firestore default encryption (AES-256)

**Access Control:**
- **Server-Side Only:** Sensitive operations via Cloud Functions
- **Role-Based:** Admin-only access to fraud queues, DSR logs
- **Firestore Rules:** Client read/write restrictions enforced

**PII Protection:**
- **SHA-256 Hashing:** Device IDs, IP addresses (fraud detection)
- **Redaction:** Names, schools, locations before sharing
- **Server-Side Processing:** No PII in client-side code

### 6.2 Audit Logging

**What We Log:**
- All DSR requests (export, delete)
- All consent changes (granted, revoked)
- All fraud admin actions (approve, reject, ban)
- All reward issuance/redemption

**Audit Log Fields:**
- Action type
- User ID (hashed for privacy)
- Timestamp
- IP address (hashed)
- Result (success/failure)

**Retention:** 7 years for compliance logs

---

## 7. Child Safety (COPPA Specific)

### 7.1 Age Verification

**Registration Flow:**
1. User enters date of birth
2. If age < 13: Require parental email
3. Send verification email to parent
4. Parent must approve before account activation

**Verification Methods:**
- Email verification (primary)
- Credit card verification (for paid features)
- Government ID verification (for high-value transactions)

### 7.2 Parental Controls

**Parent Dashboard:**
- View all child's data
- Enable/disable transcription
- Enable/disable progress sharing
- Export child's data
- Delete child's account

**Notifications:**
- Parent notified when child enables new features
- Parent notified when data is shared externally

---

## 8. Third-Party Services

### 8.1 Service Providers

| Provider | Purpose | Data Shared | DPA Signed |
|----------|---------|-------------|------------|
| Firebase | Backend infrastructure | All user data | Yes |
| OpenAI | Transcription (Whisper API) | Audio files (redacted) | Yes |
| OpenAI | Summarization (GPT-4o-mini) | Transcripts (redacted) | Yes |
| hCaptcha | Bot detection | IP address (hashed) | Yes |
| Expo | Mobile app framework | Device data | Yes |

### 8.2 Data Processing Agreements (DPAs)

All third-party service providers have signed DPAs covering:
- GDPR Article 28 requirements
- CCPA service provider obligations
- COPPA-compliant data handling
- Data breach notification procedures

---

## 9. Incident Response

### 9.1 Data Breach Protocol

**Detection:**
- Automated monitoring (Firebase Security Rules violations)
- Manual security audits (quarterly)
- User reports (security@messageai.app)

**Response Timeline:**
- **0-24 hours:** Contain breach, assess scope
- **24-72 hours:** Notify affected users (email)
- **72 hours:** Notify regulators (GDPR requirement)

**Notification Includes:**
- Nature of breach
- Data types affected
- Mitigation steps taken
- User actions recommended

### 9.2 PII Leak Prevention

**Automated Scans:**
- Pre-share PII audit (100% of reels/cards)
- Log analysis for PII exposure
- Anomaly detection for unusual data access

**Manual Reviews:**
- Quarterly compliance audits
- Random sampling of shared content
- User feedback reviews

---

## 10. User Rights Summary

### 10.1 What Users Can Do

✅ **Access Their Data:** Export all data in JSON format  
✅ **Delete Their Account:** Soft delete + 30-day purge  
✅ **Revoke Consent:** Stop progress reels generation  
✅ **Update Profile:** Modify name, email, photo  
✅ **Download Content:** Export messages, sessions, events  
✅ **Opt-Out of Sharing:** Disable `progressSharing` consent  
✅ **Request Corrections:** Update inaccurate education records  

### 10.2 How to Exercise Rights

**Via App:**
- Settings → Privacy → Export My Data
- Settings → Privacy → Delete My Account
- Settings → Privacy → Manage Consent

**Via Email:**
- privacy@messageai.app (24-hour response time)
- Subject: "DSR Request - [Access/Delete/Update]"

**Via API:**
- `exportUserDataEndpoint` Cloud Function
- `deleteUserAccountEndpoint` Cloud Function

---

## 11. Compliance Monitoring

### 11.1 Ongoing Audits

**Quarterly Reviews:**
- PII redaction effectiveness (100% target)
- Consent revocation timing (<1 hour target)
- DSR request completion (<5 minutes export, <24 hours delete)
- Retention policy enforcement (automated cleanup verification)

**Annual Audits:**
- Third-party security audit
- Legal compliance review
- Privacy policy updates
- DPA renewals

### 11.2 Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| PII Redaction Rate | 100% | - | TBD |
| Consent Revocation Time | <1 hour | - | TBD |
| Export Completion Time | <5 minutes | - | TBD |
| Delete Completion Time | <24 hours | - | TBD |
| User Complaints | <1% | - | TBD |

---

## 12. Legal Review Checklist

- [ ] **COPPA Compliance:** Parental consent mechanism approved
- [ ] **FERPA Compliance:** Education records handling approved
- [ ] **GDPR Compliance:** DSR endpoints approved
- [ ] **CCPA Compliance:** Data export/delete approved
- [ ] **Privacy Policy:** Updated to reflect all practices
- [ ] **Terms of Service:** Updated to include consent language
- [ ] **DPAs:** All third-party agreements signed
- [ ] **Breach Protocol:** Incident response plan approved
- [ ] **Retention Policy:** Automated cleanup validated
- [ ] **Audit Schedule:** Quarterly/annual reviews scheduled

---

## 13. Contact Information

**Privacy Officer:** [Name TBD]  
**Email:** privacy@messageai.app  
**Phone:** [Phone TBD]  
**Address:** [Address TBD]

**Legal Counsel:** [Firm TBD]  
**Email:** legal@messageai.app

---

## 14. Document Control

**Version History:**
- v1.0 (November 5, 2025): Initial compliance memo for PR31 implementation

**Next Review:** February 5, 2026 (90 days)

**Approval Required From:**
- [ ] Legal Counsel
- [ ] Privacy Officer
- [ ] Chief Technology Officer
- [ ] Chief Executive Officer

---

**Status:** ⏳ PENDING LEGAL REVIEW

**Notes:** This memo documents the technical implementation of compliance features (PR31). Legal review and approval required before production deployment.

