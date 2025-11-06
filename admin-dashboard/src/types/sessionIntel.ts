import { Timestamp } from 'firebase/firestore';

export interface DailySummary {
  id: string;
  conversationId: string;
  date: string; // YYYY-MM-DD
  messageCount: number;
  transcriptText?: string;
  summary?: string;
  participants: string[];
  createdAt: Timestamp;
}

export interface WeeklySummary {
  id: string;
  conversationId: string;
  weekId: string; // YYYY-WW
  weekStart: Timestamp;
  weekEnd: Timestamp;
  totalMessages: number;
  totalRecordings: number;
  keyTopics: string[];
  summary: string;
  reelGenerated: boolean;
  reelId?: string;
  participants: string[];
  createdAt: Timestamp;
}

export interface SIEvent {
  id: string;
  eventType: 'recording_uploaded' | 'transcription_complete' | 'daily_summary_generated' | 'weekly_summary_generated' | 'reel_generated' | 'error';
  timestamp: Timestamp;
  conversationId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  durationMs?: number;
  error?: {
    category: string;
    message: string;
  };
}

export interface SIAlert {
  id: string;
  alertType: 'high_error_rate' | 'processing_delay' | 'storage_limit' | 'transcription_failed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Timestamp;
  resolved: boolean;
  resolvedAt?: Timestamp;
  metadata?: Record<string, any>;
}

/**
 * Runtime validation helper for SIEvent
 */
export function isValidSIEvent(event: any): event is SIEvent {
  return (
    event &&
    typeof event.id === 'string' &&
    typeof event.eventType === 'string' &&
    event.timestamp !== null &&
    event.timestamp !== undefined
  );
}

/**
 * Runtime validation helper for SIAlert
 */
export function isValidSIAlert(alert: any): alert is SIAlert {
  return (
    alert &&
    typeof alert.id === 'string' &&
    typeof alert.message === 'string' &&
    alert.timestamp !== null &&
    alert.timestamp !== undefined
  );
}

export interface SIAnalytics {
  events: SIEvent[];
  alerts: SIAlert[];
  summary: {
    totalRecordings: number;
    totalTranscriptions: number;
    totalDailySummaries: number;
    totalWeeklySummaries: number;
    avgProcessingTime: number;
    errorRate: number;
  };
}

