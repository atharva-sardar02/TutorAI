/**
 * Export User Data - PR31
 * 
 * Collects all user data from Firestore for GDPR/CCPA compliance
 * Exports to JSON format for right to access
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

const getDb = () => admin.firestore();

export interface UserDataExport {
  user: any;
  messages: any[];
  conversations: any[];
  events: any[];
  sessions: any[];
  referrals: any[];
  rewards: any[];
  consents: any[];
  challenges: any[];
  reels: any[];
  tutorCards: any[];
  exportMetadata: {
    exportedAt: string;
    userId: string;
    collectionsIncluded: string[];
  };
}

/**
 * Export all user data to JSON
 * 
 * Collections to export:
 * - /users/{userId}
 * - /messages (where userId in participants)
 * - /conversations (where userId in participants)
 * - /events (where userId in participants or createdBy)
 * - /sessions (where userId in participants)
 * - /referrals (where userId = referrerId or referredUserId)
 * - /rewards (where userId matches)
 * - /consents/{userId}/history
 * - /challenges (where userId = creatorId or participantId)
 * - /reels (where userId matches)
 * - /cards (where tutorId = userId)
 */
export async function exportUserData(userId: string): Promise<UserDataExport> {
  const db = getDb();
  const exportData: UserDataExport = {
    user: null,
    messages: [],
    conversations: [],
    events: [],
    sessions: [],
    referrals: [],
    rewards: [],
    consents: [],
    challenges: [],
    reels: [],
    tutorCards: [],
    exportMetadata: {
      exportedAt: new Date().toISOString(),
      userId,
      collectionsIncluded: [],
    },
  };
  
  logger.info('📦 Starting user data export', {
    userId: userId.substring(0, 8),
  });
  
  try {
    // 1. User profile
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      exportData.user = userDoc.data();
      exportData.exportMetadata.collectionsIncluded.push('users');
    }
    
    // 2. Messages
    const messagesSnapshot = await db
      .collection('messages')
      .where('senderId', '==', userId)
      .get();
    exportData.messages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (exportData.messages.length > 0) {
      exportData.exportMetadata.collectionsIncluded.push('messages');
    }
    
    // 3. Conversations
    const conversationsSnapshot = await db
      .collection('conversations')
      .where('participants', 'array-contains', userId)
      .get();
    exportData.conversations = conversationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (exportData.conversations.length > 0) {
      exportData.exportMetadata.collectionsIncluded.push('conversations');
    }
    
    // 4. Events
    const eventsSnapshot = await db
      .collection('events')
      .where('participants', 'array-contains', userId)
      .get();
    exportData.events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (exportData.events.length > 0) {
      exportData.exportMetadata.collectionsIncluded.push('events');
    }
    
    // 5. Sessions
    const sessionsSnapshot = await db
      .collection('sessions')
      .where('participants', 'array-contains', userId)
      .get();
    exportData.sessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (exportData.sessions.length > 0) {
      exportData.exportMetadata.collectionsIncluded.push('sessions');
    }
    
    // 6. Referrals
    const referralsSnapshot = await db
      .collection('referrals')
      .where('referrerId', '==', userId)
      .get();
    exportData.referrals = referralsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (exportData.referrals.length > 0) {
      exportData.exportMetadata.collectionsIncluded.push('referrals');
    }
    
    // 7. Rewards
    const rewardsSnapshot = await db
      .collection('rewards')
      .where('userId', '==', userId)
      .get();
    exportData.rewards = rewardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (exportData.rewards.length > 0) {
      exportData.exportMetadata.collectionsIncluded.push('rewards');
    }
    
    // 8. Consents
    const consentsSnapshot = await db
      .collection('consents')
      .doc(userId)
      .collection('history')
      .get();
    exportData.consents = consentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (exportData.consents.length > 0) {
      exportData.exportMetadata.collectionsIncluded.push('consents');
    }
    
    // 9. Challenges
    const challengesSnapshot = await db
      .collection('challenges')
      .where('creatorId', '==', userId)
      .get();
    exportData.challenges = challengesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (exportData.challenges.length > 0) {
      exportData.exportMetadata.collectionsIncluded.push('challenges');
    }
    
    // 10. Reels
    const reelsSnapshot = await db
      .collection('reels')
      .where('userId', '==', userId)
      .get();
    exportData.reels = reelsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (exportData.reels.length > 0) {
      exportData.exportMetadata.collectionsIncluded.push('reels');
    }
    
    // 11. Tutor Cards
    const tutorCardsSnapshot = await db
      .collection('cards')
      .where('tutorId', '==', userId)
      .get();
    exportData.tutorCards = tutorCardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (exportData.tutorCards.length > 0) {
      exportData.exportMetadata.collectionsIncluded.push('cards');
    }
    
    logger.info('✅ User data export complete', {
      userId: userId.substring(0, 8),
      collectionsIncluded: exportData.exportMetadata.collectionsIncluded.length,
      totalRecords: Object.values(exportData).filter(Array.isArray).reduce((sum: number, arr) => sum + arr.length, 0),
    });
    
    return exportData;
  } catch (error: any) {
    logger.error('❌ Failed to export user data', {
      userId: userId.substring(0, 8),
      error: error.message,
    });
    throw error;
  }
}

