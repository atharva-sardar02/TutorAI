import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { isGrowthFeatureEnabled } from '../utils/featureFlags';
import { createReferralInternal } from './referralHandler';

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
      const enabled = await isGrowthFeatureEnabled('loop_tutor_card');
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
      const referralResult = await createReferralInternal({
        referrerId: tutorId,
        referrerType: 'tutor',
        loopType: 'tutor_card',
      });

      const referralLink = referralResult.url;
      const referralId = referralResult.referralId;

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
        stack: error.stack,
        tutorId: tutorId.substring(0, 8),
      });
      
      // Return more specific error messages
      if (error.code === 'permission-denied') {
        throw new HttpsError('permission-denied', 'Can only generate your own card');
      } else if (error.code === 'not-found') {
        throw new HttpsError('not-found', 'Tutor not found');
      } else if (error.code === 'failed-precondition') {
        throw error; // Pass through kill-switch errors
      } else {
        throw new HttpsError('internal', `Failed to generate card: ${error.message}`);
      }
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

  try {
    // Query sessions where tutor participated
    const sessionsSnapshot = await db
      .collection('sessions')
      .where('participants', 'array-contains', tutorId)
      .where('status', '==', 'completed')
      .orderBy('endTime', 'desc')
      .limit(50)
      .get();

    const sessions = sessionsSnapshot.docs.map(doc => doc.data());

    // If no sessions, return default stats
    if (sessions.length === 0) {
      logger.warn('⚠️ No sessions found for tutor', { tutorId: tutorId.substring(0, 8) });
      return {
        rating: 0,
        totalSessions: 0,
        subjects: [],
        testimonial: null,
      };
    }

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
  } catch (error: any) {
    // If index not found, log and return defaults
    if (error.code === 9 || error.message?.includes('index')) {
      logger.error('❌ Missing Firestore index for sessions query', {
        tutorId: tutorId.substring(0, 8),
        error: error.message,
      });
      throw new HttpsError(
        'failed-precondition',
        'Database index required. Please contact support.'
      );
    }
    throw error;
  }
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
 * For MVP: Return a data structure that frontend can render
 * Production: Integrate Cloudinary text overlays or dedicated image service
 */
async function generateCardImage(tutorData: any, stats: any, referralLink: string): Promise<string> {
  // OPTION 1: Cloudinary with text overlays (recommended for production)
  // const cloudinary = require('cloudinary').v2;
  // const imageUrl = cloudinary.url('tutor-card-template.png', {
  //   transformation: [
  //     { overlay: { text: tutorData.name, font_family: 'Arial', font_size: 48 } },
  //     { overlay: { text: `${stats.rating} ⭐`, font_family: 'Arial', font_size: 36 } },
  //     // ... more overlays
  //   ]
  // });

  // OPTION 2: For MVP - Use a reliable placeholder service
  // DiceBear Avatars API - free, no rate limits, works consistently
  const rating = stats.rating || 0;
  const sessions = stats.totalSessions || 0;
  const subjects = stats.subjects?.join(', ') || 'No subjects';
  
  // Use DiceBear initials style with custom seed based on tutor data
  const seed = `${tutorData.name || 'Tutor'}-${rating}-${sessions}`;
  const avatarUrl = `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(seed)}&size=600`;
  
  logger.info('🎨 Generated placeholder card', {
    name: tutorData.name?.substring(0, 20),
    rating,
    sessions,
    subjects: subjects.substring(0, 50),
  });
  
  // TODO: Replace with actual card image generation (Cloudinary/Canvas)
  return avatarUrl;
}

/**
 * Generate unique card ID
 */
function generateCardId(): string {
  return `card_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Track card view (called when referral link is opened)
 */
export async function trackCardView(cardId: string, tutorId: string): Promise<void> {
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
}

/**
 * Track card share (increment share count)
 */
export async function trackCardShare(cardId: string, tutorId: string): Promise<void> {
  const db = getDb();

  try {
    const cardRef = db
      .collection('tutor_cards')
      .doc(tutorId)
      .collection('cards')
      .doc(cardId);

    await cardRef.update({
      shareCount: admin.firestore.FieldValue.increment(1),
    });

    logger.info('✅ Card share tracked', { cardId, tutorId: tutorId.substring(0, 8) });
  } catch (error: any) {
    logger.error('❌ Failed to track card share', { error: error.message, cardId });
  }
}

