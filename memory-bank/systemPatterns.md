# System Patterns - TutorAI

**Last Updated:** November 2025

---

## Architecture Overview

### High-Level Structure
```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile App (React Native)                │
│                    iOS/Android Native Apps                  │
└──────────────────────┬──────────────────────────────────────┘
                        │
                        │ Firebase SDK
                        │
┌───────────────────────▼──────────────────────────────────────┐
│                    Admin Dashboard (React)                    │
│                    Web Application (Vite)                    │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ Firebase SDK
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Firestore   │ │ Firebase Auth│ │Cloud Functions│
│  (Database)  │ │  (Auth)       │ │  (Backend)    │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Application Components

#### 1. Mobile App (`app/`)
- **Platform:** React Native 0.81.5 + Expo SDK 54.0.18
- **Routing:** Expo Router 6.0.13 (file-based routing)
- **Location:** `app/app/` directory (NESTED structure)
- **Primary Users:** Tutors, Students, Parents
- **Features:** Chat, scheduling, deadlines, viral loops, session intelligence

#### 2. Admin Dashboard (`admin-dashboard/`)
- **Platform:** React 18 + TypeScript + Vite
- **UI Library:** Material-UI (MUI) v7
- **State Management:** TanStack React Query + Context API
- **Routing:** React Router DOM v6
- **Charts:** Recharts
- **Primary Users:** Admins, Analysts, Support
- **Features:** Metrics, fraud queue, kill-switches, system health

#### 3. Backend Services (`functions/`)
- **Platform:** Node.js 20 + Firebase Cloud Functions
- **AI Services:** OpenAI Whisper, GPT-4o-mini, Claude
- **Features:** Growth loops, fraud detection, transcription, compliance

---

## Key Design Patterns

### 1. Service + Hook Pattern
**Purpose:** Separate business logic from React components

**Mobile App Structure:**
```typescript
// Service: Pure business logic (testable)
export async function fetchData(id: string): Promise<Data> {
  // Firebase operations
}

// Hook: React integration
export function useData(id: string) {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    const unsubscribe = onSnapshot(ref, callback);
    return () => unsubscribe();
  }, [id]);
  return { data };
}
```

**Admin Dashboard Structure:**
```typescript
// Service: API calls (React Query)
export const useMetrics = (params) => {
  return useQuery({
    queryKey: ['metrics', params],
    queryFn: () => metricsService.getMetrics(params),
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}
```

**Benefits:**
- Services testable without React
- Hooks provide reactive data
- Clear separation of concerns
- Admin dashboard uses React Query for caching

---

### 2. Optimistic UI Pattern
**Purpose:** Instant user feedback before server confirmation

**Flow:**
```
User Action
  ↓
Update Local State (optimistic)
  ↓
Persist to AsyncStorage (optional - mobile only)
  ↓
Send to Server
  ↓
Real-time Listener Updates
  ↓
Reconcile Optimistic State
```

**Used For:**
- Sending messages (mobile)
- Creating conversations (mobile)
- Adding friends (mobile)
- Toggling kill-switches (admin dashboard)
- Approving/rejecting fraud items (admin dashboard)

---

### 3. Real-Time Listener Pattern
**Purpose:** Instant updates across devices

**Mobile App Implementation:**
```typescript
useEffect(() => {
  if (!resourceId) return;
  
  const unsubscribe = onSnapshot(
    resourceRef,
    (snapshot) => {
      setState(processSnapshot(snapshot));
    },
    (error) => {
      handleError(error);
    }
  );
  
  return () => unsubscribe(); // Cleanup
}, [resourceId]);
```

**Admin Dashboard Implementation:**
```typescript
// React Query with real-time updates
const { data } = useQuery({
  queryKey: ['fraudQueue'],
  queryFn: () => fetchFraudQueue(),
  refetchInterval: 30000, // 30s refresh
});

// Or Firestore listeners for instant updates
useEffect(() => {
  const unsubscribe = onSnapshot(
    collection(db, 'fraud_queue'),
    (snapshot) => {
      setFraudItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
  );
  return () => unsubscribe();
}, []);
```

**Applied To:**
- Conversations (mobile)
- Messages (mobile)
- Presence (mobile)
- Fraud queue (admin dashboard)
- Metrics (admin dashboard)
- System health (admin dashboard)

---

### 4. Fast-Path Architecture (AI)
**Purpose:** Minimize AI costs and latency

**Strategy:**
1. **Regex Heuristics** - Detect 80% of scheduling messages (no LLM)
2. **Chrono-node Parser** - Parse dates in 5ms (was 1-3s with GPT-4)
3. **Template Confirmations** - Pre-written responses (was GPT-4 generation)
4. **Fallback to GPT-4o-mini** - Only for ambiguous cases

**Performance:**
- Fast-path: 725ms average (93% faster)
- Cost: $0.0002 per message (93% cheaper)
- 80% of requests use fast-path

---

### 5. Role-Based Access Control (Admin Dashboard)
**Purpose:** Secure admin operations

**Implementation:**
```typescript
// Firebase Custom Claims
{
  role: 'admin' | 'analyst' | 'support',
  permissions: ['read', 'write', 'delete']
}

// Protected Route Component
<ProtectedRoute requiredRole="admin">
  <AdminPage />
</ProtectedRoute>

// Backend Verification
if (!isAdmin(request.auth)) {
  throw new functions.https.HttpsError('permission-denied');
}
```

**Roles:**
- **Admin:** Full access to all features
- **Analyst:** Read-only access to metrics
- **Support:** Limited access (fraud queue, audit logs)

---

### 6. Data Flow Patterns

#### Mobile App Message Flow
```
User sends message
  ↓
Generate messageId (UUID)
  ↓
Add to optimisticMessages
  ↓
Save to AsyncStorage
  ↓
sendMessageWithRetry()
  ├─ Check server ack (already sent?)
  ├─ Write to Firestore
  │   ├─ Online: Success → Cloud Function → Push Notification
  │   └─ Offline: Queued → Auto-send when online
  └─ Returns { success, isOffline }
  ↓
onSnapshot listener fires
  ↓
Update messages state
  ↓
Remove from optimisticMessages
```

#### Admin Dashboard Metrics Flow
```
Admin opens dashboard
  ↓
React Query fetches metrics
  ├─ Check cache (5 min stale time)
  ├─ If stale: Fetch from Cloud Function
  └─ If fresh: Return cached data
  ↓
Firestore listener updates real-time
  ↓
React Query refetches on interval (30s)
  ↓
UI updates with new data
```

---

## Component Architecture

### Mobile App Structure

**⚠️ CRITICAL: Nested app/ Directory**
Expo Router by default searches for routes in an `app/` subdirectory within your project root. All routes MUST live in `app/app/` subdirectory!

```
app/                           # Project root (package.json here)
├── app/                       # ⚠️ Routes directory (Expo Router default!)
│   ├── _layout.tsx            # Root layout with AuthProvider
│   ├── index.tsx              # Entry point with auth redirect
│   ├── (auth)/                # Auth routes
│   │   ├── _layout.tsx
│   │   ├── login.tsx          [/(auth)/login]
│   │   └── signup.tsx         [/(auth)/signup]
│   ├── (tabs)/                # Tab routes
│   │   ├── _layout.tsx        # Tab navigator - 5 tabs
│   │   ├── index.tsx          [/(tabs) - Chats list]
│   │   ├── schedule.tsx        [/(tabs)/schedule - Calendar/Events]
│   │   ├── tasks.tsx           [/(tabs)/tasks - Deadlines/To-dos]
│   │   ├── assistant.tsx      [/(tabs)/assistant - AI Dashboard]
│   │   └── profile.tsx        [/(tabs)/profile]
│   ├── chat/
│   │   └── [id].tsx           [/chat/:id - Dynamic route]
│   ├── users.tsx              [/users - Suggested Contacts]
│   ├── newGroup.tsx           [/newGroup - Group Creation]
│   ├── profile/[id].tsx       [/profile/:id - User Profile]
│   ├── groupInfo/[id].tsx     [/groupInfo/:id - Group Info]
│   ├── recordings/[id].tsx    [Recordings viewer]
│   ├── progressReel.tsx       [Progress reel viewer]
│   ├── sessionDetail.tsx      [Session detail screen]
│   └── cohortRoom.tsx         [Cohort room]
├── src/                        # Support code (NOT routes!)
│   ├── contexts/               # AuthContext
│   ├── hooks/                  # useAuth, useFriends, etc.
│   ├── lib/                    # Firebase + services
│   ├── services/               # authService, friendService, etc.
│   ├── components/             # 67 UI components
│   ├── types/                  # TypeScript types
│   └── utils/                 # messageId (UUID), formatters
├── ios/                        # iOS native
├── android/                    # Android native
├── package.json                # "main": "expo-router/entry"
├── app.json                    # Expo config
└── babel.config.js            # Build config
```

**Key Route Files:**
- `app/app/_layout.tsx` - Root layout (Expo Router entry) ⚠️ NESTED!
- `app/app/index.tsx` - Initial route with auth redirect
- `app/app/(auth)/login.tsx` + `signup.tsx` - Auth screens
- `app/app/(tabs)/index.tsx` - Chats list (friends-first layout)
- `app/app/(tabs)/schedule.tsx` - Calendar and event management
- `app/app/(tabs)/tasks.tsx` - Deadline and task management
- `app/app/(tabs)/assistant.tsx` - AI insights dashboard
- `app/app/chat/[id].tsx` - Chat room with real-time messages

### Admin Dashboard Structure
```
admin-dashboard/src/
├── pages/
│   ├── Dashboard.tsx (Overview)
│   ├── Growth/
│   │   ├── KFactorDashboard.tsx
│   │   ├── FunnelMetrics.tsx
│   │   ├── RetentionMetrics.tsx
│   │   └── PercentileMonitor.tsx
│   ├── SessionIntel/
│   │   ├── DailySummaries.tsx
│   │   ├── WeeklySummaries.tsx
│   │   └── SIAnalytics.tsx
│   ├── Fraud/
│   │   └── FraudQueue.tsx
│   ├── Experiments/
│   │   └── ExperimentList.tsx
│   └── System/
│       ├── KillSwitches.tsx
│       ├── UserManagement.tsx
│       ├── SystemHealth.tsx
│       └── AuditLog.tsx
├── components/
│   ├── Layout/ (Sidebar, TopBar, MainLayout)
│   ├── Cards/ (MetricCard, StatCard)
│   ├── Charts/ (KFactorChart, FunnelChart)
│   └── Tables/ (FraudQueueTable, UserTable)
└── hooks/ (Custom React hooks with React Query)
```

---

## Security Patterns

### Authentication
- **Mobile App:** Firebase Auth with email/password
- **Admin Dashboard:** Firebase Auth with custom claims (role-based)
- **Backend:** Firebase Admin SDK for server-side operations

### Firestore Rules
```javascript
// Mobile app rules
match /conversations/{cid}/messages/{mid} {
  allow read, write: if isMember(cid);
}

// Admin dashboard rules
match /admin_audit_log/{logId} {
  allow read: if isAdmin();
  allow write: if false; // Only Cloud Functions can write
}
```

### PII Redaction
- Regex patterns for phones, emails, addresses
- NER (Named Entity Recognition) for names, school names
- Applied before AI embedding
- 500-char limit for embeddings
- Admin dashboard shows redacted data

---

## Performance Patterns

### Mobile App
- **Virtualized Lists:** FlashList for 60fps scrolling
- **Pagination:** 50 messages per page
- **Image Compression:** < 2MB automatic
- **Debouncing:** Typing indicators (200ms), presence (30s)
- **Offline Support:** AsyncStorage + Firestore cache

### Admin Dashboard
- **React Query Caching:** 5 min stale time for metrics
- **Lazy Loading:** Components loaded on route access
- **Real-time Updates:** Firestore listeners for critical data
- **Chunked Loading:** Large tables paginated (50 items/page)
- **Optimistic Updates:** Kill-switch toggles update immediately

---

## Testing Patterns

### Mobile App
- **Unit Tests:** Services, utils, hooks (30 tests)
- **Component Tests:** UI components (33 tests)
- **Integration Tests:** E2E flows (10 tests)
- **Coverage:** 49% statements (acceptable for UI-heavy MVP)

### Admin Dashboard
- **Type Checking:** `npm run type-check`
- **Linting:** ESLint configuration
- **Build Testing:** `npm run build` (tests for build errors)
- **Manual Testing:** Comprehensive checklist for all features

---

## Known Patterns & Trade-offs

### Mobile App
- **Presence Latency:** 30s heartbeat + 90s threshold = Up to 120s offline detection
- **Message Denormalization:** `senderName` stored with message (shows old name if user changes)
- **Offline Cache:** Firestore cache indefinite (stale data possible)
- **Notifications:** Current implementation triggers notifications only when chat screen is open (needs global listener for all conversations)

### Admin Dashboard
- **Metrics Latency:** React Query cache (5 min) vs real-time listeners
- **Data Aggregation:** Backend scheduled jobs compute metrics (daily)
- **Chart Rendering:** Recharts performance with large datasets

## Mobile App Implementation Notes

### Notification System
**Status:** Implemented but needs UX clarification

**Current Implementation:**
- Local notifications for new messages
- Presence-based suppression (activeConversationId)
- Tap-to-navigate to conversation
- Permission handling
- Sender name + message preview
- Image message indicator ("📷 Image")

**Issue Identified:**
- Notification listener is per-chat, not global
- Notifications only trigger if that specific chat's listener fires
- If user is on home screen or different chat, no listener = no notification

**Recommended Fix:**
- Global message listener for ALL conversations user participates in
- Trigger regardless of current screen
- Suppression logic still applies (don't notify if viewing that conversation)

**Files:**
- `app/src/services/notificationService.ts` - Complete notification system
- `app/app.json` - Permissions configured
- `app/app/_layout.tsx` - Setup on login
- `app/app/chat/[id].tsx` - Trigger on new messages

### Import Pattern (@ Alias)
All imports use @ for src/ folder:
```typescript
import { useAuth } from '@/hooks/useAuth';
import { signInWithEmail } from '@/services/authService';
import { Message } from '@/types/index';
import { db, auth } from '@/lib/firebase';
```

**Configured in:**
- `tsconfig.json` - TypeScript path mapping
- `babel.config.js` - babel-plugin-module-resolver

---

**These patterns ensure consistency, maintainability, and performance across both the mobile app and admin dashboard.**