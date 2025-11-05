import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const getDb = () => admin.firestore();

/**
 * Scheduled function to aggregate daily and weekly summaries
 * into top-level collections for admin dashboard queries
 * 
 * Runs every 6 hours to ensure admin dashboard has fresh data
 * 
 * Source collections (nested):
 * - /summaries/{cid}/daily/{date}
 * - /summaries/{cid}/weekly/{week}
 * 
 * Target collections (flat):
 * - /admin_daily_summaries/{cid}_{date}
 * - /admin_weekly_summaries/{cid}_{week}
 */
export const aggregateAdminSummaries = onSchedule(
  {
    schedule: 'every 6 hours',
    timeZone: 'America/New_York',
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async () => {
    const startTime = Date.now();
    logger.info('Starting admin summary aggregation');

    try {
      const db = getDb();

      // Aggregate daily summaries
      const dailyCount = await aggregateDailySummaries(db);
      logger.info(`Aggregated ${dailyCount} daily summaries`);

      // Aggregate weekly summaries
      const weeklyCount = await aggregateWeeklySummaries(db);
      logger.info(`Aggregated ${weeklyCount} weekly summaries`);

      const duration = Date.now() - startTime;
      logger.info(`Admin summary aggregation complete in ${duration}ms`, {
        dailyCount,
        weeklyCount,
        duration,
      });

      // Log to analytics
      await db.collection('si_analytics').add({
        event: 'admin_summary_aggregation',
        timestamp: admin.firestore.Timestamp.now(),
        dailyCount,
        weeklyCount,
        durationMs: duration,
        status: 'success',
      });
    } catch (error: any) {
      logger.error('Error aggregating admin summaries:', error);
      
      // Log error to analytics
      const db = getDb();
      await db.collection('si_analytics').add({
        event: 'admin_summary_aggregation',
        timestamp: admin.firestore.Timestamp.now(),
        error: error.message,
        status: 'failed',
      });

      throw error;
    }
  }
);

/**
 * Aggregate all daily summaries into admin collection
 */
async function aggregateDailySummaries(db: admin.firestore.Firestore): Promise<number> {
  try {
    // Use collection group query to get all daily summaries across all conversations
    const summariesSnapshot = await db.collectionGroup('daily')
      .orderBy('date', 'desc')
      .limit(1000) // Limit to recent summaries
      .get();

    logger.info(`Found ${summariesSnapshot.size} daily summaries to aggregate`);

    let aggregatedCount = 0;
    const batch = db.batch();
    let batchCount = 0;

    for (const doc of summariesSnapshot.docs) {
      const data = doc.data();
      const conversationId = doc.ref.parent.parent?.id;

      if (!conversationId) {
        logger.warn(`Skipping daily summary ${doc.id} - no conversation ID`);
        continue;
      }

      // Create composite ID: {cid}_{date}
      const adminDocId = `${conversationId}_${data.date}`;

      // Copy to admin collection with metadata
      const adminDocRef = db.collection('admin_daily_summaries').doc(adminDocId);
      batch.set(adminDocRef, {
        conversationId,
        date: data.date,
        dateTimestamp: data.dateTimestamp || admin.firestore.Timestamp.now(),
        messageCount: data.messageCount || 0,
        recordingCount: data.recordingCount || 0,
        participants: data.participants || [],
        summary: data.summary || '',
        topics: data.topics || [],
        keywords: data.keywords || [],
        sentiment: data.sentiment,
        aggregatedAt: admin.firestore.Timestamp.now(),
      }, { merge: true });

      aggregatedCount++;
      batchCount++;

      // Commit batch every 500 documents (Firestore limit)
      if (batchCount >= 500) {
        await batch.commit();
        logger.info(`Committed batch of ${batchCount} daily summaries`);
        batchCount = 0;
      }
    }

    // Commit remaining documents
    if (batchCount > 0) {
      await batch.commit();
      logger.info(`Committed final batch of ${batchCount} daily summaries`);
    }

    return aggregatedCount;
  } catch (error: any) {
    logger.error('Error aggregating daily summaries:', error);
    throw error;
  }
}

/**
 * Aggregate all weekly summaries into admin collection
 */
async function aggregateWeeklySummaries(db: admin.firestore.Firestore): Promise<number> {
  try {
    // Use collection group query to get all weekly summaries across all conversations
    const summariesSnapshot = await db.collectionGroup('weekly')
      .orderBy('startDate', 'desc')
      .limit(500) // Limit to recent summaries
      .get();

    logger.info(`Found ${summariesSnapshot.size} weekly summaries to aggregate`);

    let aggregatedCount = 0;
    const batch = db.batch();
    let batchCount = 0;

    for (const doc of summariesSnapshot.docs) {
      const data = doc.data();
      const conversationId = doc.ref.parent.parent?.id;

      if (!conversationId) {
        logger.warn(`Skipping weekly summary ${doc.id} - no conversation ID`);
        continue;
      }

      // Create composite ID: {cid}_{week}
      const week = data.week || doc.id;
      const adminDocId = `${conversationId}_${week}`;

      // Copy to admin collection with metadata
      const adminDocRef = db.collection('admin_weekly_summaries').doc(adminDocId);
      batch.set(adminDocRef, {
        conversationId,
        week,
        startDate: data.startDate,
        endDate: data.endDate,
        totalMessages: data.totalMessages || 0,
        totalRecordings: data.totalRecordings || 0,
        totalDays: data.totalDays || 0,
        participants: data.participants || [],
        summary: data.summary || '',
        highlights: data.highlights || [],
        topics: data.topics || [],
        sentiment: data.sentiment,
        reelGenerated: data.reelGenerated || false,
        aggregatedAt: admin.firestore.Timestamp.now(),
      }, { merge: true });

      aggregatedCount++;
      batchCount++;

      // Commit batch every 500 documents (Firestore limit)
      if (batchCount >= 500) {
        await batch.commit();
        logger.info(`Committed batch of ${batchCount} weekly summaries`);
        batchCount = 0;
      }
    }

    // Commit remaining documents
    if (batchCount > 0) {
      await batch.commit();
      logger.info(`Committed final batch of ${batchCount} weekly summaries`);
    }

    return aggregatedCount;
  } catch (error: any) {
    logger.error('Error aggregating weekly summaries:', error);
    throw error;
  }
}

