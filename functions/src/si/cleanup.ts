/**
 * Session Intelligence: Cleanup & Retention (SI-11)
 * 
 * Scheduled cleanup of old recordings to manage storage costs
 * Retention policy:
 * - Raw recordings: Deleted after 30 days
 * - Transcripts: Kept indefinitely
 * - Daily summaries: Kept indefinitely
 * - Weekly summaries: Kept indefinitely
 * - Reels: Expire after 30 days (handled by reel generation)
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

const db = admin.firestore();

interface CleanupStats {
  recordingsDeleted: number;
  transcriptsKept: number;
  storageFreedBytes: number;
  errors: number;
}

/**
 * Delete old raw recordings from Storage and Firestore
 * Keeps transcripts and summaries for analytics
 * 
 * @param retentionDays - Number of days to keep recordings (default: 30)
 */
export async function cleanupOldRecordings(retentionDays: number = 30): Promise<CleanupStats> {
  logger.info('🧹 Starting recording cleanup', { retentionDays });
  
  const stats: CleanupStats = {
    recordingsDeleted: 0,
    transcriptsKept: 0,
    storageFreedBytes: 0,
    errors: 0,
  };
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);
    
    logger.info('📅 Cutoff date for cleanup', {
      cutoffDate: cutoffDate.toISOString(),
      retentionDays,
    });
    
    // Query all recordings older than cutoff date using collection group
    const oldRecordingsSnapshot = await db
      .collectionGroup('recordings')
      .where('uploadedAt', '<', cutoffTimestamp)
      .get();
    
    logger.info('📦 Found recordings to clean up', {
      count: oldRecordingsSnapshot.size,
    });
    
    // Process each recording
    for (const recordingDoc of oldRecordingsSnapshot.docs) {
      try {
        const recording = recordingDoc.data();
        const conversationId = recording.conversationId;
        const recordingId = recordingDoc.id;
        const storageUrl = recording.storageUrl;
        const fileSizeBytes = recording.fileSizeBytes || 0;
        
        logger.info('🗑️ Deleting old recording', {
          conversationId: conversationId?.substring(0, 12),
          recordingId: recordingId.substring(0, 12),
          uploadedAt: recording.uploadedAt?.toDate().toISOString(),
          fileSizeBytes,
        });
        
        // Delete from Storage
        if (storageUrl) {
          try {
            await deleteFromStorage(storageUrl);
            stats.storageFreedBytes += fileSizeBytes;
          } catch (storageError: any) {
            logger.error('❌ Failed to delete from Storage', {
              recordingId,
              storageUrl,
              error: storageError.message,
            });
            stats.errors++;
            // Continue with Firestore deletion even if Storage fails
          }
        }
        
        // Delete from Firestore (recording document)
        await recordingDoc.ref.delete();
        stats.recordingsDeleted++;
        
        // Check if transcript exists (we keep transcripts)
        const transcriptRef = db
          .collection('transcripts')
          .doc(conversationId)
          .collection('recordings')
          .doc(recordingId);
        
        const transcriptDoc = await transcriptRef.get();
        if (transcriptDoc.exists) {
          stats.transcriptsKept++;
          logger.info('✅ Transcript preserved', {
            recordingId: recordingId.substring(0, 12),
          });
        }
        
      } catch (error: any) {
        logger.error('❌ Error processing recording for cleanup', {
          recordingId: recordingDoc.id.substring(0, 12),
          error: error.message,
        });
        stats.errors++;
      }
    }
    
    logger.info('✅ Cleanup complete', {
      recordingsDeleted: stats.recordingsDeleted,
      transcriptsKept: stats.transcriptsKept,
      storageFreedMB: (stats.storageFreedBytes / (1024 * 1024)).toFixed(2),
      errors: stats.errors,
    });
    
    // Log cleanup stats to analytics
    await db.collection('si_analytics').add({
      eventType: 'cleanup_completed',
      recordingsDeleted: stats.recordingsDeleted,
      transcriptsKept: stats.transcriptsKept,
      storageFreedBytes: stats.storageFreedBytes,
      errors: stats.errors,
      retentionDays,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return stats;
    
  } catch (error: any) {
    logger.error('❌ Cleanup failed', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Delete a file from Firebase Storage given its URL or path
 */
async function deleteFromStorage(urlOrPath: string): Promise<void> {
  try {
    // Extract path from URL if needed
    let storagePath = urlOrPath;
    
    if (urlOrPath.startsWith('http')) {
      // Parse URL to get path
      const url = new URL(urlOrPath);
      const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
      if (pathMatch) {
        storagePath = decodeURIComponent(pathMatch[1]);
      }
    }
    
    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);
    
    await file.delete();
    logger.info('✅ Deleted from Storage', { path: storagePath });
    
  } catch (error: any) {
    logger.error('❌ Failed to delete from Storage', {
      urlOrPath,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Scheduled Cloud Function: Run cleanup daily at 2 AM
 * Deletes recordings older than 30 days
 */
export const scheduledRecordingCleanup = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: '512MiB',
  })
  .pubsub
  .schedule('0 2 * * *') // Every day at 2 AM
  .timeZone('UTC')
  .onRun(async (context) => {
    logger.info('🧹 Scheduled recording cleanup started');
    
    try {
      const stats = await cleanupOldRecordings(30); // 30 days retention
      
      logger.info('✅ Scheduled cleanup completed', stats);
      
      return stats;
    } catch (error: any) {
      logger.error('❌ Scheduled cleanup failed', {
        error: error.message,
        stack: error.stack,
      });
      
      // Don't throw - log the error and continue
      return {
        error: error.message,
        timestamp: context.timestamp,
      };
    }
  });

/**
 * Manual cleanup function for testing/admin use
 * Can be called with custom retention days
 */
export const manualRecordingCleanup = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '512MiB',
  })
  .https
  .onCall(async (data, context) => {
    // Require admin authentication
    if (!context.auth || !context.auth.token.admin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can run manual cleanup'
      );
    }
    
    const retentionDays = data.retentionDays || 30;
    
    logger.info('🧹 Manual cleanup initiated by admin', {
      adminUid: context.auth.uid,
      retentionDays,
    });
    
    try {
      const stats = await cleanupOldRecordings(retentionDays);
      return {
        success: true,
        stats,
      };
    } catch (error: any) {
      logger.error('❌ Manual cleanup failed', {
        error: error.message,
      });
      throw new functions.https.HttpsError(
        'internal',
        'Cleanup failed: ' + error.message
      );
    }
  });

