# PR18 – Tutor Card Generator
**Implementation Plan**

---

## 📋 Overview

**Scope:** Visual, shareable Tutor Card as the first viral surface.

**What it does:**
- Tutors can generate beautiful cards with their stats (rating, sessions, subjects)
- Share via WhatsApp, Instagram, SMS, Email
- Cards include attribution links (QR code or text)
- Track views and conversions
- Cache cards for 14 days to avoid duplicate generation

**Dependencies:**
- ✅ PR15 (Referral Attribution) – for link generation
- ✅ PR16 (Orchestrator) – for eligibility/cooldowns
- ✅ PR25 (Incentives) – for XP rewards
- ✅ PR17 (Experiments) – for A/B testing variants

**Kill-Switch:** `growth.loops.tutorCard.enabled`

**Effort:** M (3-5 days)

---

## 🎯 Goals

1. **Fast Generation:** Card generated in <3s (P95)
2. **High Quality:** Professional-looking cards with tutor photo, stats, subjects
3. **Attribution:** Every card includes a unique referral link
4. **Uniqueness:** No duplicate stats within 14 days
5. **Fallback:** Static template if image generation fails
6. **Analytics:** Track `card_generated`, `card_shared`, `card_viewed`

---

## 🏗️ Architecture

### **Flow:**
```
1. Tutor completes 5★ session
   ↓
2. Orchestrator decides → "Show Tutor Card prompt"
   ↓
3. Frontend calls tutorCardService.generate()
   ↓
4. Cloud Function checks uniqueness + generates card (Cloudinary or Canvas)
   ↓
5. Returns image URL + referral link
   ↓
6. Tutor previews card + shares via native sheet
   ↓
7. Recipient clicks link → attribution tracked → lands on app
```

### **Components:**
- **Frontend:** `TutorCardModal.tsx` (preview + share UI)
- **Service:** `tutorCardService.ts` (client-side API calls)
- **Cloud Function:** `generateTutorCard.ts` (image generation)
- **Storage:** `/tutor_cards/{tutorId}/{cardId}` (metadata)
- **Analytics:** Growth events for tracking

---

## 📐 Step-by-Step Implementation

---

### **Step 1: Define Types & Schema**

#### **1.1 Add Types to `app/src/types/growthTypes.ts`**

Add these interfaces:

```typescript
// ============================================================================
// TUTOR CARD TYPES (PR18)
// ============================================================================

/**
 * Tutor card metadata
 * Collection: /tutor_cards/{tutorId}/cards/{cardId}
 */
export interface TutorCard {
  cardId: string;
  tutorId: string;
  tutorName: string;
  tutorPhoto?: string;

  // Stats shown on card
  rating: number;              // e.g., 5.0
  totalSessions: number;       // e.g., 47
  subjects: string[];          // e.g., ['Math', 'Physics']
  testimonial?: string;        // Optional student quote

  // Attribution
  referralLink: string;
  referralId: string;

  // Metadata
  imageUrl?: string;           // Generated card image
  generatedAt: Timestamp;
  expiresAt: Timestamp;        // Cache for 14 days
  experimentId?: string;
  variantId?: string;

  // Analytics
  viewCount: number;
  shareCount: number;
}

/**
 * Tutor card generation request
 */
export interface GenerateTutorCardRequest {
  tutorId: string;
  forceRegenerate?: boolean;   // Skip cache, create new card
}

/**
 * Tutor card generation response
 */
export interface GenerateTutorCardResponse {
  cardId: string;
  imageUrl: string;            // URL to generated card image
  referralLink: string;
  expiresAt: Timestamp;
  isCached: boolean;           // True if returned from cache
}
```

#### **1.2 Update Feature Flags in `app/src/config/featureFlags.ts`**

```typescript
export const GROWTH_FEATURE_FLAGS = {
  // ... existing flags ...

  // PR18: Tutor Cards
  loops: {
    tutorCard: {
      enabled: true,           // ✅ Enable for PR18
    },
    // ... other loops ...
  },

  // ... rest of flags ...
};
```

---

### **Step 2: Cloud Function – Image Generation**

#### **2.1 Create `functions/src/growth/generateTutorCard.ts`**

This function generates the card image and stores metadata.

```typescript
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { isGrowthFeatureEnabled } from '../utils/featureFlags';
import { createReferralLink } from './referralHandler';

const getDb = () => admin.firestore();

/**
 * Generate a shareable Tutor Card
 */
export const generateTutorCard = onCall(
  {
    timeoutSeconds: 30,
    memory: '512MiB',
  },
  async (request) => {
    const { auth, data } = request;

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { tutorId, forceRegenerate } = data;
    const userId = auth.uid;

    // Security: Only tutors can generate their own cards
    if (userId !== tutorId) {
      throw new HttpsError('permission-denied', 'Can only generate your own card');
    }

    try {
      // Step 0: Check kill-switch
      const enabled = await isGrowthFeatureEnabled('loops.tutorCard');
      if (!enabled) {
        logger.info('⏭️ Tutor Card disabled via kill-switch', { tutorId: tutorId.substring(0, 8) });
        throw new HttpsError('failed-precondition', 'Tutor cards are temporarily unavailable');
      }

      const db = getDb();

      // Step 1: Check for cached card (if not forcing regeneration)
      if (!forceRegenerate) {
        const cachedCard = await getCachedCard(tutorId);
        if (cachedCard) {
          logger.info('✅ Returning cached card', { tutorId: tutorId.substring(0, 8), cardId: cachedCard.cardId });
          return {
            cardId: cachedCard.cardId,
            imageUrl: cachedCard.imageUrl,
            referralLink: cachedCard.referralLink,
            expiresAt: cachedCard.expiresAt,
            isCached: true,
          };
        }
      }

      // Step 2: Fetch tutor data
      const tutorDoc = await db.doc(`users/${tutorId}`).get();
      const tutorData = tutorDoc.data();

      if (!tutorData) {
        throw new HttpsError('not-found', 'Tutor not found');
      }

      // Step 3: Calculate stats
      const stats = await calculateTutorStats(tutorId);

      // Step 4: Check uniqueness (don't repeat same stats within 14 days)
      const isDuplicate = await checkDuplicateStats(tutorId, stats);
      if (isDuplicate) {
        logger.warn('⚠️ Duplicate stats, returning last card', { tutorId: tutorId.substring(0, 8) });
        const lastCard = await getCachedCard(tutorId);
        if (lastCard) {
          return {
            cardId: lastCard.cardId,
            imageUrl: lastCard.imageUrl,
            referralLink: lastCard.referralLink,
            expiresAt: lastCard.expiresAt,
            isCached: true,
          };
        }
      }

      // Step 5: Generate referral link
      const referralResult = await createReferralLink({
        auth,
        data: {
          referrerId: tutorId,
          referrerType: 'tutor',
          loopType: 'tutor_card',
        },
      });

      const referralLink = referralResult.data.link;
      const referralId = referralResult.data.referralId;

      // Step 6: Generate card image
      const imageUrl = await generateCardImage(tutorData, stats, referralLink);

      // Step 7: Store card metadata
      const cardId = generateCardId();
      const now = admin.firestore.Timestamp.now();
      const expiresAt = admin.firestore.Timestamp.fromMillis(
        now.toMillis() + 14 * 24 * 60 * 60 * 1000 // 14 days
      );

      const cardData = {
        cardId,
        tutorId,
        tutorName: tutorData.name || 'Tutor',
        tutorPhoto: tutorData.photoURL || null,
        rating: stats.rating,
        totalSessions: stats.totalSessions,
        subjects: stats.subjects,
        testimonial: stats.testimonial || null,
        referralLink,
        referralId,
        imageUrl,
        generatedAt: now,
        expiresAt,
        viewCount: 0,
        shareCount: 0,
      };

      await db
        .collection('tutor_cards')
        .doc(tutorId)
        .collection('cards')
        .doc(cardId)
        .set(cardData);

      logger.info('✅ Tutor card generated', {
        tutorId: tutorId.substring(0, 8),
        cardId,
        rating: stats.rating,
        sessions: stats.totalSessions,
      });

      return {
        cardId,
        imageUrl,
        referralLink,
        expiresAt,
        isCached: false,
      };

    } catch (error: any) {
      logger.error('❌ Failed to generate tutor card', {
        error: error.message,
        tutorId: tutorId.substring(0, 8),
      });
      throw new HttpsError('internal', 'Failed to generate card');
    }
  }
);

/**
 * Get cached card if available and not expired
 */
async function getCachedCard(tutorId: string): Promise<any | null> {
  const db = getDb();
  const now = admin.firestore.Timestamp.now();

  const snapshot = await db
    .collection('tutor_cards')
    .doc(tutorId)
    .collection('cards')
    .where('expiresAt', '>', now)
    .orderBy('expiresAt', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data();
}

/**
 * Calculate tutor stats from sessions
 */
async function calculateTutorStats(tutorId: string): Promise<any> {
  const db = getDb();

  // Query sessions where tutor participated
  const sessionsSnapshot = await db
    .collection('sessions')
    .where('participants', 'array-contains', tutorId)
    .where('status', '==', 'completed')
    .orderBy('endTime', 'desc')
    .limit(50)
    .get();

  const sessions = sessionsSnapshot.docs.map(doc => doc.data());

  // Calculate average rating
  const ratings = sessions
    .map(s => s.tutorRating)
    .filter(r => r !== undefined && r > 0);

  const avgRating = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
    : 0;

  // Get unique subjects
  const subjects = [...new Set(sessions.map(s => s.subject).filter(Boolean))];

  // Get a testimonial (from latest 5-star session)
  const fiveStarSession = sessions.find(s => s.tutorRating === 5);
  const testimonial = fiveStarSession?.studentFeedback || null;

  return {
    rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
    totalSessions: sessions.length,
    subjects: subjects.slice(0, 3), // Top 3 subjects
    testimonial,
  };
}

/**
 * Check if stats are duplicate (same rating/sessions/subjects within 14 days)
 */
async function checkDuplicateStats(tutorId: string, stats: any): Promise<boolean> {
  const db = getDb();
  const fourteenDaysAgo = admin.firestore.Timestamp.fromMillis(
    Date.now() - 14 * 24 * 60 * 60 * 1000
  );

  const snapshot = await db
    .collection('tutor_cards')
    .doc(tutorId)
    .collection('cards')
    .where('generatedAt', '>', fourteenDaysAgo)
    .where('rating', '==', stats.rating)
    .where('totalSessions', '==', stats.totalSessions)
    .limit(1)
    .get();

  return !snapshot.empty;
}

/**
 * Generate card image URL
 * 
 * For MVP: Use a simple approach with Canvas or Cloudinary transformations
 * Production: Consider Cloudinary's text overlays or a dedicated image service
 */
async function generateCardImage(tutorData: any, stats: any, referralLink: string): Promise<string> {
  // OPTION 1: Cloudinary with text overlays (recommended)
  // const cloudinary = require('cloudinary').v2;
  // const imageUrl = cloudinary.url('tutor-card-template.png', {
  //   transformation: [
  //     { overlay: { text: tutorData.name, font_family: 'Arial', font_size: 48 } },
  //     { overlay: { text: `${stats.rating} ⭐`, font_family: 'Arial', font_size: 36 } },
  //     // ... more overlays
  //   ]
  // });

  // OPTION 2: For MVP - Return a placeholder with query params
  // The frontend can render the card client-side and take a screenshot
  const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/messageai-123.appspot.com/o/tutor-card-template.png?alt=media';
  
  // For now, return a static template
  // TODO: Implement actual image generation with Cloudinary or Canvas
  return `${baseUrl}#rating=${stats.rating}&sessions=${stats.totalSessions}&subjects=${stats.subjects.join(',')}`;
}

/**
 * Generate unique card ID
 */
function generateCardId(): string {
  return `card_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
```

#### **2.2 Track Card Views (Helper Function)**

Add this to handle attribution when someone views a card:

```typescript
/**
 * Track card view (called when referral link is opened)
 */
export const trackCardView = async (cardId: string, tutorId: string): Promise<void> => {
  const db = getDb();

  try {
    const cardRef = db
      .collection('tutor_cards')
      .doc(tutorId)
      .collection('cards')
      .doc(cardId);

    await cardRef.update({
      viewCount: admin.firestore.FieldValue.increment(1),
    });

    logger.info('✅ Card view tracked', { cardId, tutorId: tutorId.substring(0, 8) });
  } catch (error: any) {
    logger.error('❌ Failed to track card view', { error: error.message, cardId });
  }
};
```

---

### **Step 3: Frontend Service – Tutor Card API Client**

#### **3.1 Create `app/src/services/growth/tutorCardService.ts`**

Client-side service to interact with the backend:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';
import { logEvent } from 'firebase/analytics';
import { getAnalytics } from '../analytics';
import type { GenerateTutorCardRequest, GenerateTutorCardResponse } from '../../types/growthTypes';

const functions = getFunctions();

/**
 * Generate a Tutor Card
 */
export async function generateTutorCard(
  tutorId: string,
  forceRegenerate: boolean = false
): Promise<GenerateTutorCardResponse> {
  const generateFn = httpsCallable<GenerateTutorCardRequest, GenerateTutorCardResponse>(
    functions,
    'generateTutorCard'
  );

  const result = await generateFn({ tutorId, forceRegenerate });

  // Log analytics event
  const analytics = getAnalytics();
  logEvent(analytics, 'card_generated', {
    card_id: result.data.cardId,
    tutor_id: tutorId,
    is_cached: result.data.isCached,
  });

  return result.data;
}

/**
 * Track card share
 */
export async function trackCardShare(cardId: string, tutorId: string, channel: string): Promise<void> {
  const analytics = getAnalytics();
  logEvent(analytics, 'card_shared', {
    card_id: cardId,
    tutor_id: tutorId,
    channel, // 'whatsapp', 'instagram', 'sms', 'email', etc.
  });
}
```

---

### **Step 4: Frontend UI – Tutor Card Modal**

#### **4.1 Create `app/src/components/growth/TutorCardModal.tsx`**

Modal to preview and share the card:

```tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { generateTutorCard, trackCardShare } from '../../services/growth/tutorCardService';
import type { GenerateTutorCardResponse } from '../../types/growthTypes';

interface TutorCardModalProps {
  visible: boolean;
  tutorId: string;
  onClose: () => void;
}

export function TutorCardModal({ visible, tutorId, onClose }: TutorCardModalProps) {
  const [loading, setLoading] = useState(false);
  const [cardData, setCardData] = useState<GenerateTutorCardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && tutorId) {
      loadCard();
    }
  }, [visible, tutorId]);

  const loadCard = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await generateTutorCard(tutorId, false);
      setCardData(result);
    } catch (err: any) {
      console.error('Failed to generate card:', err);
      setError(err.message || 'Failed to generate card');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!cardData) return;

    try {
      const message = `Check out my tutoring profile! ⭐\n\n${cardData.referralLink}`;

      const result = await Share.share({
        message,
        url: cardData.imageUrl, // iOS only
        title: 'My Tutor Card',
      });

      // Track share
      if (result.action === Share.sharedAction) {
        const channel = result.activityType || 'unknown';
        await trackCardShare(cardData.cardId, tutorId, channel);
      }
    } catch (err: any) {
      console.error('Share failed:', err);
      Alert.alert('Error', 'Failed to share card');
    }
  };

  const handleSaveToGallery = async () => {
    if (!cardData) return;

    try {
      // Request permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant access to save images');
        return;
      }

      // Download image
      const fileUri = `${FileSystem.documentDirectory}tutor-card-${cardData.cardId}.png`;
      await FileSystem.downloadAsync(cardData.imageUrl, fileUri);

      // Save to gallery
      await MediaLibrary.createAssetAsync(fileUri);

      Alert.alert('Success', 'Card saved to gallery!');
      await trackCardShare(cardData.cardId, tutorId, 'gallery');
    } catch (err: any) {
      console.error('Save failed:', err);
      Alert.alert('Error', 'Failed to save card');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Your Tutor Card</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Generating your card...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#FF3B30" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadCard}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {cardData && !loading && (
            <>
              {/* Card Preview */}
              <View style={styles.cardContainer}>
                <Image
                  source={{ uri: cardData.imageUrl }}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
                {cardData.isCached && (
                  <View style={styles.cachedBadge}>
                    <Text style={styles.cachedText}>Cached</Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                  <Ionicons name="share-outline" size={24} color="#FFF" />
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveButton} onPress={handleSaveToGallery}>
                  <Ionicons name="download-outline" size={24} color="#007AFF" />
                  <Text style={styles.saveButtonText}>Save to Gallery</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  cardContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  cardImage: {
    width: '100%',
    height: 400,
    borderRadius: 12,
  },
  cachedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cachedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F0F0F0',
    paddingVertical: 14,
    borderRadius: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});
```

---

### **Step 5: Orchestrator Integration**

#### **5.1 Update `functions/src/growth/eligibilityRules.ts`**

Add Tutor Card eligibility rules:

```typescript
export function getEligibilityRules(loopType: string): EligibilityRule | null {
  const rules: Record<string, EligibilityRule> = {
    // ... existing loops ...

    tutor_card: {
      loopType: 'tutor_card',
      requiredRole: 'tutor',
      minSessions: 5,            // At least 5 completed sessions
      minRating: 4.5,            // At least 4.5 average rating
      cooldownMs: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxExposuresPerDay: 1,
    },

    // ... other loops ...
  };

  return rules[loopType] || null;
}
```

#### **5.2 Update `functions/src/growth/eligibilityRules.ts` – Add to Configured Loops**

```typescript
export function getConfiguredLoops(): string[] {
  return [
    'tutor_spotlight',
    'tutor_card',      // ← NEW
    'results',
    // ... other loops ...
  ];
}
```

---

### **Step 6: Frontend Integration – Trigger from App**

#### **6.1 Add Trigger Button (Temporary Test UI)**

For now, add a test button in `app/app/(tabs)/index.tsx`:

```tsx
import { TutorCardModal } from '../src/components/growth/TutorCardModal';

export default function HomeScreen() {
  const [showCardModal, setShowCardModal] = useState(false);
  const { user } = useAuth();

  return (
    <View>
      {/* Existing content */}

      {/* Tutor Card Test Button */}
      {user?.userType === 'tutor' && (
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => setShowCardModal(true)}
        >
          <Text style={styles.testButtonText}>📇 Generate Tutor Card (PR18)</Text>
        </TouchableOpacity>
      )}

      {/* Tutor Card Modal */}
      <TutorCardModal
        visible={showCardModal}
        tutorId={user?.uid || ''}
        onClose={() => setShowCardModal(false)}
      />
    </View>
  );
}
```

#### **6.2 Production Integration (After Testing)**

In production, trigger the card modal after:
1. A tutor completes a 5-star session
2. Orchestrator decides to show `tutor_card` prompt
3. User taps the prompt notification

---

### **Step 7: Firestore Schema & Rules**

#### **7.1 Update `firestore.rules`**

Add security rules for `/tutor_cards`:

```firestore
// --- TUTOR_CARDS COLLECTION (PR18) ---
// Shareable tutor cards with stats
match /tutor_cards/{tutorId}/cards/{cardId} {
  // Tutors can read their own cards
  allow read: if request.auth != null && request.auth.uid == tutorId;

  // Only Cloud Functions can write
  allow write: if false;
}

// Allow card views from referral links (increment viewCount)
match /tutor_cards/{tutorId}/cards/{cardId} {
  // Anyone with the link can view (for attribution tracking)
  allow get: if request.auth != null;
}
```

#### **7.2 Update `firestore.indexes.json`**

Add indexes for querying cards:

```json
{
  "indexes": [
    {
      "collectionGroup": "cards",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tutorId", "order": "ASCENDING" },
        { "fieldPath": "expiresAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "cards",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tutorId", "order": "ASCENDING" },
        { "fieldPath": "generatedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

### **Step 8: Export Functions & Deploy**

#### **8.1 Update `functions/src/index.ts`**

```typescript
// ... existing exports ...

// Tutor Cards (PR18)
export { generateTutorCard } from './growth/generateTutorCard';
```

#### **8.2 Deploy**

```bash
# From project root
cd /Users/tahmeedrahim/Projects/MessageAI

# Deploy Firestore rules & indexes
firebase deploy --only firestore:rules,firestore:indexes

# Deploy Cloud Functions
cd functions
pnpm install
pnpm run build
cd ..
firebase deploy --only functions:generateTutorCard
```

---

## 🧪 Testing Plan

### **Manual Test Steps:**

1. **Generate Card (Cached):**
   - Open app as tutor (with 5+ sessions, 4.5+ rating)
   - Tap "Generate Tutor Card" button
   - Verify card generates in <3s
   - Tap button again → verify cached card returned instantly

2. **Share Card:**
   - Tap "Share" button
   - Select WhatsApp/SMS
   - Verify link includes referral ID
   - Open link on another device → verify attribution tracked

3. **Save to Gallery:**
   - Tap "Save to Gallery"
   - Check Photos app → verify card saved
   - Verify permissions requested if not granted

4. **Uniqueness Filter:**
   - Generate a card
   - Complete another session (same rating)
   - Try to generate again → verify same card returned (not regenerated)

5. **Fallback (Kill-Switch):**
   - In Firestore, set `growth_feature_flags/loops/tutorCard/enabled = false`
   - Try to generate card → verify error message

6. **Orchestrator Integration:**
   - Complete a 5-star session as tutor
   - Call orchestrator → verify `tutor_card` in eligible loops
   - Verify cooldown enforced (7 days)

---

## 📊 Success Metrics

- **Generation Time:** P95 <3s ✅
- **Cache Hit Rate:** >80% (cards reused within 14 days)
- **Share Rate:** >30% of generated cards are shared
- **Attribution Accuracy:** >95% of shares tracked correctly
- **Error Rate:** <1% (image generation failures)

---

## 🚨 Fallback & Degradation

1. **If Image Generation Fails:**
   - Return a static template URL
   - Log error to Cloud Functions logs
   - Show user a generic card with text-only

2. **If Cloudinary Down:**
   - Use local Canvas rendering (client-side screenshot)
   - Or skip image, share text-only link

3. **If Kill-Switch ON:**
   - Show error: "Tutor cards are temporarily unavailable"
   - Don't block user workflow

---

## 🎯 Next Steps After PR18

1. **PR17.5** – Personalization Agent (persona-specific copy)
2. **PR26** – Results Surfaces + Micro-FVM
3. **PR21** – Activity Feed

---

## 📝 Notes

- **Image Generation:** For MVP, we're using a placeholder approach. In production, integrate Cloudinary text overlays or a dedicated image service.
- **QR Codes:** Optional enhancement – embed QR code in card image pointing to referral link.
- **A/B Testing:** Once PR17 is live, run experiments on card designs (layout, colors, testimonials).

---

**Status:** 📝 **Ready to Implement**  
**Dependencies:** ✅ All met (PR15, PR16, PR25, PR17)  
**Effort:** 3-5 days  
**Next:** Start with Step 1 (Types & Schema)

