/**
 * Session Intelligence: Analytics Logger (SI-10)
 * 
 * Structured logging for SI events with timing metrics and error categorization
 * Provides observability into recording uploads, transcription, and reel generation
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

const db = admin.firestore();

export type SIEventType =
  | 'recording_upload_started'
  | 'recording_upload_succeeded'
  | 'recording_upload_failed'
  | 'transcription_started'
  | 'transcription_succeeded'
  | 'transcription_failed'
  | 'daily_summary_created'
  | 'weekly_summary_created'
  | 'weekly_reel_generated'
  | 'weekly_reel_viewed'
  | 'transcript_viewed'
  | 'recording_viewed';

export type ErrorCategory =
  | 'upload_error'
  | 'transcription_error'
  | 'llm_error'
  | 'storage_error'
  | 'permission_error'
  | 'quota_error'
  | 'network_error'
  | 'unknown_error';

export interface SIAnalyticsEvent {
  eventType: SIEventType;
  userId: string;
  conversationId?: string;
  recordingId?: string;
  weekId?: string;
  reelId?: string;
  
  // Timing metrics (in milliseconds)
  uploadMs?: number;
  processMs?: number;
  transcribeMs?: number;
  summarizeMs?: number;
  
  // Size metrics
  fileSizeBytes?: number;
  durationSeconds?: number;
  wordCount?: number;
  
  // Error details
  errorCategory?: ErrorCategory;
  errorMessage?: string;
  errorStack?: string;
  
  // Context
  fileType?: 'video' | 'audio';
  qualityScore?: number;
  
  timestamp: admin.firestore.Timestamp;
}

/**
 * Log a Session Intelligence analytics event
 * Stores in Firestore for querying and sends to Cloud Logging
 * 
 * @param event - Analytics event data
 */
export async function logSIEvent(event: SIAnalyticsEvent): Promise<void> {
  try {
    // Structured logging to Cloud Logging
    logger.info(`📊 SI Event: ${event.eventType}`, {
      eventType: event.eventType,
      userId: event.userId?.substring(0, 8),
      conversationId: event.conversationId?.substring(0, 12),
      recordingId: event.recordingId?.substring(0, 12),
      uploadMs: event.uploadMs,
      processMs: event.processMs,
      transcribeMs: event.transcribeMs,
      fileSizeBytes: event.fileSizeBytes,
      durationSeconds: event.durationSeconds,
      wordCount: event.wordCount,
      fileType: event.fileType,
      qualityScore: event.qualityScore,
      errorCategory: event.errorCategory,
      errorMessage: event.errorMessage,
    });
    
    // Store in Firestore for analytics queries
    await db.collection('si_analytics').add({
      ...event,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Alert on errors
    if (event.errorCategory) {
      await alertOnError(event);
    }
    
  } catch (error: any) {
    // Don't let analytics failures break the main flow
    logger.error('❌ Failed to log SI analytics event', {
      eventType: event.eventType,
      error: error.message,
    });
  }
}

/**
 * Alert on errors based on category
 * In production, this could integrate with alerting services
 */
async function alertOnError(event: SIAnalyticsEvent): Promise<void> {
  const severity = getErrorSeverity(event.errorCategory!);
  
  logger.error(`🚨 SI Error [${severity}]: ${event.errorCategory}`, {
    eventType: event.eventType,
    userId: event.userId?.substring(0, 8),
    conversationId: event.conversationId?.substring(0, 12),
    errorCategory: event.errorCategory,
    errorMessage: event.errorMessage,
    severity,
  });
  
  // For critical errors, store in alerts collection
  if (severity === 'critical') {
    await db.collection('si_alerts').add({
      eventType: event.eventType,
      errorCategory: event.errorCategory,
      errorMessage: event.errorMessage,
      userId: event.userId,
      conversationId: event.conversationId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      resolved: false,
    });
  }
}

/**
 * Determine error severity
 */
function getErrorSeverity(category: ErrorCategory): 'low' | 'medium' | 'high' | 'critical' {
  switch (category) {
    case 'quota_error':
    case 'permission_error':
      return 'critical';
    case 'llm_error':
    case 'transcription_error':
      return 'high';
    case 'storage_error':
    case 'upload_error':
      return 'medium';
    case 'network_error':
    case 'unknown_error':
    default:
      return 'low';
  }
}

/**
 * Helper: Start timing
 */
export function startTimer(): number {
  return Date.now();
}

/**
 * Helper: Calculate elapsed time
 */
export function elapsedMs(startTime: number): number {
  return Date.now() - startTime;
}

/**
 * Helper: Categorize error
 */
export function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();
  
  if (message.includes('quota') || message.includes('rate limit')) {
    return 'quota_error';
  } else if (message.includes('permission') || message.includes('forbidden')) {
    return 'permission_error';
  } else if (message.includes('openai') || message.includes('gpt')) {
    return 'llm_error';
  } else if (message.includes('storage') || message.includes('upload')) {
    return 'storage_error';
  } else if (message.includes('network') || message.includes('timeout')) {
    return 'network_error';
  } else if (message.includes('transcription') || message.includes('whisper')) {
    return 'transcription_error';
  } else {
    return 'unknown_error';
  }
}

/**
 * Query analytics metrics
 * Useful for dashboards and monitoring
 */
export async function getAnalyticsMetrics(
  startDate: Date,
  endDate: Date
): Promise<{
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  totalTranscriptions: number;
  successfulTranscriptions: number;
  failedTranscriptions: number;
  averageUploadMs: number;
  averageTranscribeMs: number;
  totalErrors: number;
  errorsByCategory: Record<string, number>;
}> {
  const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
  const endTimestamp = admin.firestore.Timestamp.fromDate(endDate);
  
  const eventsSnapshot = await db
    .collection('si_analytics')
    .where('timestamp', '>=', startTimestamp)
    .where('timestamp', '<=', endTimestamp)
    .get();
  
  const events = eventsSnapshot.docs.map(doc => doc.data() as SIAnalyticsEvent);
  
  // Calculate metrics
  const uploads = events.filter(e => e.eventType.includes('upload'));
  const transcriptions = events.filter(e => e.eventType.includes('transcription'));
  const errors = events.filter(e => e.errorCategory);
  
  const uploadTimes = uploads
    .filter(e => e.uploadMs)
    .map(e => e.uploadMs!);
  
  const transcribeTimes = transcriptions
    .filter(e => e.transcribeMs)
    .map(e => e.transcribeMs!);
  
  const errorsByCategory: Record<string, number> = {};
  errors.forEach(e => {
    if (e.errorCategory) {
      errorsByCategory[e.errorCategory] = (errorsByCategory[e.errorCategory] || 0) + 1;
    }
  });
  
  return {
    totalUploads: uploads.length,
    successfulUploads: uploads.filter(e => e.eventType === 'recording_upload_succeeded').length,
    failedUploads: uploads.filter(e => e.eventType === 'recording_upload_failed').length,
    totalTranscriptions: transcriptions.length,
    successfulTranscriptions: transcriptions.filter(e => e.eventType === 'transcription_succeeded').length,
    failedTranscriptions: transcriptions.filter(e => e.eventType === 'transcription_failed').length,
    averageUploadMs: uploadTimes.length > 0 
      ? uploadTimes.reduce((a, b) => a + b, 0) / uploadTimes.length 
      : 0,
    averageTranscribeMs: transcribeTimes.length > 0
      ? transcribeTimes.reduce((a, b) => a + b, 0) / transcribeTimes.length
      : 0,
    totalErrors: errors.length,
    errorsByCategory,
  };
}

