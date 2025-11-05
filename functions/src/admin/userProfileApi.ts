import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

const getDb = () => admin.firestore();

interface UserProfileResponse {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'tutor' | 'parent';
  age?: number;
  subjects?: string[];
  createdAt: admin.firestore.Timestamp;
  lastActive?: admin.firestore.Timestamp;
  stats: {
    totalSessions: number;
    totalMessages: number;
    totalReferrals: number;
    xpBalance: number;
    monthlyXp: number;
    monthlyPercentile: number;
  };
  banned?: boolean;
  bannedAt?: admin.firestore.Timestamp;
  bannedBy?: string;
  banReason?: string;
  linkedTutorIds?: string[];
  linkedParentIds?: string[];
}

/**
 * Get detailed user profile for admin dashboard
 * Requires admin custom claim
 */
export const getUserProfile = onCall(
  {
    enforceAppCheck: false,
    cors: true,
  },
  async (request) => {
    // Check if user is authenticated and is admin
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    if (!request.auth.token.admin) {
      throw new HttpsError('permission-denied', 'User must be an admin');
    }

    const { userId } = request.data;

    if (!userId || typeof userId !== 'string') {
      throw new HttpsError('invalid-argument', 'userId is required');
    }

    try {
      const db = getDb();

      // Get user document
      const userDoc = await db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found');
      }

      const userData = userDoc.data()!;

      // Get XP balance
      const balanceDoc = await db.collection('balances').doc(userId).get();
      const xpBalance = balanceDoc.exists ? balanceDoc.data()?.xpBalance || 0 : 0;

      // Get stats from user.stats field (monthly percentile)
      const userStats = userData.stats || {
        monthlyXp: 0,
        monthlyChallenges: 0,
        monthlyPercentile: -1,
      };

      // Count total sessions (conversations where user is participant)
      const conversationsSnapshot = await db.collection('conversations')
        .where('participants', 'array-contains', userId)
        .get();
      const totalSessions = conversationsSnapshot.size;

      // Count total messages sent by user
      let totalMessages = 0;
      for (const convDoc of conversationsSnapshot.docs) {
        const messagesSnapshot = await db.collection('conversations')
          .doc(convDoc.id)
          .collection('messages')
          .where('senderId', '==', userId)
          .count()
          .get();
        totalMessages += messagesSnapshot.data().count;
      }

      // Count total referrals
      const referralsSnapshot = await db.collection('referrals')
        .where('referrerId', '==', userId)
        .get();
      const totalReferrals = referralsSnapshot.size;

      // Build response
      const profile: UserProfileResponse = {
        uid: userId,
        email: userData.email || '',
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        role: userData.role,
        age: userData.age,
        subjects: userData.subjects || [],
        createdAt: userData.createdAt || admin.firestore.Timestamp.now(),
        lastActive: userData.lastActive,
        stats: {
          totalSessions,
          totalMessages,
          totalReferrals,
          xpBalance,
          monthlyXp: userStats.monthlyXp || 0,
          monthlyPercentile: userStats.monthlyPercentile || -1,
        },
        banned: userData.banned || false,
        bannedAt: userData.bannedAt,
        bannedBy: userData.bannedBy,
        banReason: userData.banReason,
        linkedTutorIds: userData.linkedTutorIds || [],
        linkedParentIds: userData.linkedParentIds || [],
      };

      logger.info(`Admin ${request.auth.uid} fetched profile for user ${userId}`);

      return profile;
    } catch (error: any) {
      logger.error(`Error fetching user profile for ${userId}:`, error);
      throw new HttpsError('internal', `Failed to fetch user profile: ${error.message}`);
    }
  }
);

