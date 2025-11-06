# Technical Context - TutorAI

**Last Updated:** November 2025

---

## Technology Stack

### Mobile Application (`app/`)
- **React Native:** 0.81.5
- **Expo SDK:** 54.0.18
- **Expo Router:** 6.0.13 (file-based routing)
- **TypeScript:** 5.9 (strict mode)
- **React:** 19.1.0
- **FlashList:** 2.0.2 (virtualized lists)

### Admin Dashboard (`admin-dashboard/`)
- **React:** 19.1.1
- **TypeScript:** 5.9.3
- **Vite:** 7.1.7 (build tool)
- **Material-UI (MUI):** v7.3.5
- **TanStack React Query:** 5.90.7 (state management & caching)
- **React Router DOM:** 7.9.5
- **Recharts:** 3.3.0 (charting library)
- **date-fns:** 4.1.0 (date handling)

### Backend
- **Firebase:** 12.4.0 (mobile), 12.5.0 (admin dashboard)
  - **Firestore** - Real-time database with offline support
  - **Firebase Auth** - Email/password authentication
  - **Firebase Storage** - Profile photos & media uploads
  - **Cloud Functions** - Node.js 20 runtime
- **Expo Push Service** - APNs/FCM notification delivery
- **Firestore Offline Persistence** - Automatic AsyncStorage caching (mobile)

### Development Tools
- **Package Manager:** pnpm (workspace disabled)
- **Testing:** Jest 29.7 + React Testing Library (mobile)
- **Transpilation:** Babel with module resolver (mobile)
- **Build Tool:** Vite (admin dashboard)
- **Linting:** ESLint (both projects)

### AI/ML Stack
- **OpenAI SDK:** @ai-sdk/openai (GPT-4o-mini)
- **Anthropic SDK:** @ai-sdk/anthropic (Claude)
- **AI SDK:** ai ^4.0.0
- **OpenAI Whisper:** Direct API integration (transcription)
- **Chrono-node:** 2.7.6 (date parsing)
- **Luxon:** 3.4.4 (timezone handling)

---

## Development Setup

### Prerequisites
- **Node.js:** v18+ LTS
- **pnpm:** `npm install -g pnpm`
- **Expo CLI:** `npm install -g expo-cli`
- **Firebase CLI:** `npm install -g firebase-tools`
- **iOS Simulator** (Mac) or **Android Emulator**

### Project Structure
```
TutorAI/
├── app/                         # React Native Mobile App
│   ├── app/                     # Expo Router screens (NESTED!)
│   ├── src/
│   │   ├── services/           # Business logic
│   │   ├── hooks/              # React hooks
│   │   ├── components/         # UI components
│   │   ├── contexts/           # React Context
│   │   ├── lib/                # Firebase config
│   │   ├── types/              # TypeScript types
│   │   └── utils/              # Utilities
│   └── package.json
│
├── admin-dashboard/             # React Web Admin Dashboard
│   ├── src/
│   │   ├── pages/              # Route pages
│   │   ├── components/         # UI components
│   │   ├── hooks/              # Custom hooks (React Query)
│   │   ├── services/           # API services
│   │   ├── contexts/           # React contexts (Auth)
│   │   ├── lib/                # Firebase SDK
│   │   ├── types/              # TypeScript types
│   │   └── utils/              # Utility functions
│   └── package.json
│
├── functions/                   # Firebase Cloud Functions
│   ├── src/
│   │   ├── growth/             # Viral growth features
│   │   ├── ai/                 # AI services
│   │   ├── fraud/              # Fraud detection
│   │   ├── admin/               # Admin APIs
│   │   ├── compliance/         # DSR/compliance
│   │   └── services/            # Backend services
│   └── package.json
│
├── docs/                        # Documentation
├── memory-bank/                 # Memory Bank files
└── package.json                 # Root workspace
```

### Installation

#### Mobile App
```bash
# Install dependencies
cd app
pnpm install

# Configure Firebase (create app/src/lib/firebaseConfig.ts)
# Create .env file with Firebase config

# Start development server
pnpm start
```

#### Admin Dashboard
```bash
# Install dependencies
cd admin-dashboard
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with Firebase credentials

# Run development server
npm run dev

# Build for production
npm run build
```

#### Backend Functions
```bash
# Install dependencies
cd functions
pnpm install

# Deploy Cloud Functions
firebase deploy --only functions
```

---

## Firebase Configuration

### Environment Variables

#### Mobile App (`.env` in root)
```bash
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

#### Admin Dashboard (`admin-dashboard/.env`)
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

#### Cloud Functions (`functions/.env`)
```bash
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

### Firestore Rules
- Located in `firestore.rules`
- Security rules for collections
- Helper functions for common checks
- Member validation for conversations
- Admin-only access for admin collections

### Storage Rules
- Located in `storage.rules`
- Image upload permissions
- Size limits enforced

### Cloud Functions
- **Runtime:** Node.js 20
- **Region:** us-central1 (default)
- **Deployment:** `firebase deploy --only functions`
- **Logs:** `firebase functions:log`

---

## Development Workflow

### Running the Mobile App
```bash
# Start Expo dev server
cd app
pnpm start

# Run on specific platform
pnpm ios          # iOS simulator
pnpm android      # Android emulator
pnpm web          # Web browser (limited)
```

### Running the Admin Dashboard
```bash
# Start Vite dev server
cd admin-dashboard
npm run dev       # http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing
```bash
# Mobile app tests
cd app
pnpm test

# Admin dashboard type check
cd admin-dashboard
npm run type-check
npm run lint
```

### Firebase Emulators
```bash
# Start emulators
cd app
pnpm emu

# Emulators run on:
# - Firestore: http://localhost:8080
# - Storage: http://localhost:9199
# - Functions: http://localhost:5001
# - UI: http://localhost:4000
```

---

## Build & Deployment

### Mobile App
```bash
# Development build
eas build --profile development --platform ios
eas build --profile development --platform android

# Production build
eas build --profile production --platform ios
eas build --profile production --platform android
```

### Admin Dashboard
```bash
# Build for production
cd admin-dashboard
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Or deploy to Vercel/Netlify
# Connect GitHub repo, set build command: npm run build
# Output directory: dist
```

### Firebase Deploy
```bash
# Deploy rules only
firebase deploy --only firestore:rules,storage:rules

# Deploy functions only
firebase deploy --only functions

# Deploy everything
firebase deploy
```

---

## Dependencies

### Mobile App Dependencies
```json
{
  "@react-native-async-storage/async-storage": "^2.2.0",
  "@react-native-community/netinfo": "^11.4.1",
  "@shopify/flash-list": "2.0.2",
  "expo": "~54.0.18",
  "expo-router": "~6.0.13",
  "firebase": "^12.4.0",
  "react": "19.1.0",
  "react-native": "0.81.5"
}
```

### Admin Dashboard Dependencies
```json
{
  "@mui/material": "^7.3.5",
  "@tanstack/react-query": "^5.90.7",
  "react": "^19.1.1",
  "react-dom": "^19.1.1",
  "react-router-dom": "^7.9.5",
  "recharts": "^3.3.0",
  "firebase": "^12.5.0"
}
```

### Backend Dependencies
```json
{
  "@ai-sdk/anthropic": "^1.0.0",
  "@ai-sdk/openai": "^1.0.0",
  "ai": "^4.0.0",
  "chrono-node": "^2.7.6",
  "expo-server-sdk": "^3.7.0",
  "firebase-admin": "^12.0.0",
  "firebase-functions": "^5.0.0",
  "openai": "^6.8.0"
}
```

---

## Technical Constraints

### Platform Limitations
- **iOS Simulator:** Push notifications require physical device
- **Android Emulator:** Push notifications require physical device
- **Web (Mobile App):** Limited Firebase support, not primary target
- **Admin Dashboard:** Web-only, requires modern browser

### Firebase Limits
- **Firestore:** 500 documents per batch write
- **Storage:** 5MB per file (we compress to <2MB)
- **Functions:** 540s timeout (9 minutes)
- **Blaze Plan Required:** Cloud Functions require pay-as-you-go

### Performance Targets
- **Message Delivery:** < 3s P95 (mobile)
- **Scheduling:** 725ms average (fast-path)
- **Initial Load:** < 500ms (50 messages, mobile)
- **Scroll Performance:** 60fps with 100+ messages (mobile)
- **Dashboard Load:** < 2 seconds (admin)
- **Metrics Refresh:** < 500ms API response (admin)

---

## Code Quality Standards

### TypeScript
- **Strict Mode:** Enabled for all projects
- **No `any` types:** All types explicitly defined
- **ESLint:** Prevents hardcoded timezones (mobile)
- **Type Coverage:** 100% for production code

### Testing
- **Mobile App:** 73 automated tests (unit, component, integration)
- **Admin Dashboard:** Type checking, linting, build testing
- **Coverage:** 49% statements (mobile, acceptable for UI-heavy MVP)

### Code Organization
- **Mobile App:** Services (business logic), Hooks (React integration), Components (UI)
- **Admin Dashboard:** Pages (routes), Components (UI), Hooks (React Query), Services (API)
- **Shared Types:** `app/src/types/` for mobile, `admin-dashboard/src/types/` for admin

---

## Development Tools

### Code Editor
- **VS Code** recommended
- **TypeScript extension** required
- **ESLint extension** recommended

### Debugging
- **Mobile App:** React Native Debugger, Expo DevTools
- **Admin Dashboard:** React DevTools, Browser DevTools
- **Backend:** Firebase Console, Cloud Functions logs

### Version Control
- **Git** for source control
- **Branch Naming:** `feat/pr<number>-short-description`
- **PR Strategy:** One PR = one feature flag

---

## Known Technical Debt

### High Priority
1. **Auth Persistence** - Memory-only (should use AsyncStorage)
2. **Push Token Refresh** - Tokens can expire, need periodic refresh
3. **Message Denormalization** - Old messages show old names if user changes name

### Medium Priority
1. **Conversation Cache** - No invalidation strategy
2. **Batch Operations** - Some operations sequential, could be parallel
3. **Message Search** - No search capability
4. **Admin Dashboard:** Add automated tests (currently manual only)

### Low Priority
1. **Message Reactions** - Not implemented
2. **Message Editing** - Not implemented
3. **Voice Messages** - Not implemented
4. **End-to-End Encryption** - Not implemented

---

## Security Considerations

### Authentication
- **Mobile App:** Firebase Auth with email/password
- **Admin Dashboard:** Firebase Auth with custom claims (role-based)
- **User Documents:** Created on signup
- **Presence Tracking:** For authenticated users only

### Data Privacy
- PII redaction before AI processing
- Explicit consent for progress reels
- Privacy policy compliance required
- Admin dashboard shows redacted data

### Firestore Security
- Rules prevent unauthorized access
- Member validation for conversations
- User can only write own profile
- Admin-only collections for admin dashboard

### API Security
- Cloud Functions use Firebase Admin SDK
- API keys stored in environment variables
- Rate limiting planned for AI features
- Role-based access control for admin APIs

---

## Performance Optimizations

### Mobile App (Implemented)
- ✅ FlashList for virtualized lists
- ✅ Message pagination (50 per page)
- ✅ Image compression (< 2MB)
- ✅ Debounced typing indicators
- ✅ 30s presence heartbeat (vs. hot writes)
- ✅ Fast-path AI architecture (80% of requests)

### Admin Dashboard (Implemented)
- ✅ React Query caching (5 min stale time)
- ✅ Lazy loading of route components
- ✅ Real-time Firestore listeners for critical data
- ✅ Paginated tables (50 items/page)
- ✅ Optimistic updates for kill-switches

### Planned
- Message search indexing
- Advanced caching strategies
- Rate limiting for AI calls
- Cost tracking and optimization
- Admin dashboard automated tests

---

**This context ensures consistent technical decisions and development practices across the mobile app, admin dashboard, and backend services.**