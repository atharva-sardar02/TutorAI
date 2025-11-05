/**
 * Session Intelligence: Message Aggregator (SI-05B)
 * 
 * Aggregates text messages from conversations for daily summaries
 * Scheduled to run end-of-day to capture all messages for complete context
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { updateDailySummaryWithMessages } from './dailySummarizer';

export interface MessageDigest {
  messageCount: number;
  textContent: string; // Formatted chat transcript
  participantIds: string[];
  firstMessageAt: admin.firestore.Timestamp;
  lastMessageAt: admin.firestore.Timestamp;
}

/**
 * Fetch and format all text messages for a conversation on a specific date
 * 
 * @param conversationId - ID of the conversation
 * @param dateStr - Date in YYYY-MM-DD format
 * @returns MessageDigest with formatted message text
 */
export async function aggregateMessagesForDate(
  conversationId: string,
  dateStr: string
): Promise<MessageDigest | null> {
  const db = admin.firestore();
  
  logger.info('📨 Aggregating messages for date', { conversationId, dateStr });
  
  try {
    // Parse date string and create UTC timestamps for start/end of day
    const [year, month, day] = dateStr.split('-').map(Number);
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    
    const startTimestamp = admin.firestore.Timestamp.fromDate(startOfDay);
    const endTimestamp = admin.firestore.Timestamp.fromDate(endOfDay);
    
    logger.info('📅 Date range', {
      conversationId,
      dateStr,
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
    });
    
    // Query messages for the day
    const messagesSnapshot = await db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .where('serverTimestamp', '>=', startTimestamp)
      .where('serverTimestamp', '<=', endTimestamp)
      .orderBy('serverTimestamp', 'asc')
      .get();
    
    if (messagesSnapshot.empty) {
      logger.info('No messages found for date', { conversationId, dateStr });
      return null;
    }
    
    // Filter to text messages only, exclude assistant/system messages
    const textMessages = messagesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as any))
      .filter((msg: any) => 
        msg.type === 'text' && 
        msg.senderId !== 'assistant' &&
        msg.text && 
        msg.text.trim().length > 0
      );
    
    if (textMessages.length === 0) {
      logger.info('No text messages after filtering', { conversationId, dateStr });
      return null;
    }
    
    // Format as chat transcript: "SenderName: message text\n..."
    const formattedContent = textMessages
      .map(msg => {
        const senderName = msg.senderName || 'Unknown';
        return `${senderName}: ${msg.text}`;
      })
      .join('\n');
    
    // Collect unique participant IDs
    const participantIds = Array.from(
      new Set(textMessages.map(msg => msg.senderId).filter(Boolean))
    );
    
    const messageDigest: MessageDigest = {
      messageCount: textMessages.length,
      textContent: formattedContent,
      participantIds,
      firstMessageAt: textMessages[0].serverTimestamp,
      lastMessageAt: textMessages[textMessages.length - 1].serverTimestamp,
    };
    
    logger.info('✅ Message digest created', {
      conversationId,
      dateStr,
      messageCount: messageDigest.messageCount,
      textLength: formattedContent.length,
      participants: participantIds.length,
    });
    
    return messageDigest;
    
  } catch (error: any) {
    logger.error('❌ Failed to aggregate messages', {
      conversationId,
      dateStr,
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
}

/**
 * Scheduled Cloud Function: Aggregate messages daily
 * Runs at 11:59 PM daily to process all conversations with messages
 */
export const aggregateDailyMessages = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: '1GB',
  })
  .pubsub
  .schedule('59 23 * * *') // 11:59 PM daily
  .timeZone('UTC')
  .onRun(async (context) => {
    logger.info('🕐 Starting daily message aggregation');
    
    const db = admin.firestore();
    
    try {
      // Get yesterday's date (since we run at 11:59 PM, process completed day)
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      yesterday.setUTCHours(0, 0, 0, 0);
      
      const dateStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
      
      logger.info('📅 Processing date', { dateStr });
      
      // Query all messages from yesterday using collection group
      const yesterdayStart = admin.firestore.Timestamp.fromDate(yesterday);
      const yesterdayEnd = admin.firestore.Timestamp.fromDate(
        new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1)
      );
      
      const messagesSnapshot = await db
        .collectionGroup('messages')
        .where('serverTimestamp', '>=', yesterdayStart)
        .where('serverTimestamp', '<=', yesterdayEnd)
        .get();
      
      logger.info('📊 Messages found', { count: messagesSnapshot.size });
      
      if (messagesSnapshot.empty) {
        logger.info('No messages to process for date', { dateStr });
        return;
      }
      
      // Group messages by conversationId
      const conversationIds = new Set<string>();
      messagesSnapshot.docs.forEach(doc => {
        const message = doc.data();
        if (message.conversationId) {
          conversationIds.add(message.conversationId);
        }
      });
      
      logger.info('📋 Conversations to process', { count: conversationIds.size });
      
      // Process each conversation
      let successCount = 0;
      let errorCount = 0;
      
      for (const conversationId of conversationIds) {
        try {
          await updateDailySummaryWithMessages(conversationId, dateStr);
          successCount++;
        } catch (error: any) {
          logger.error('❌ Failed to process conversation', {
            conversationId,
            error: error.message,
          });
          errorCount++;
        }
      }
      
      logger.info('✅ Daily message aggregation complete', {
        dateStr,
        totalConversations: conversationIds.size,
        successful: successCount,
        failed: errorCount,
      });
      
    } catch (error: any) {
      logger.error('❌ Daily message aggregation failed', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  });

