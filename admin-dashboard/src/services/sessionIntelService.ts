import { collection, query, where, getDocs, orderBy, limit as firestoreLimit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DailySummary, WeeklySummary, SIEvent, SIAlert, SIAnalytics } from '@/types/sessionIntel';

/**
 * Fetch daily summaries with optional filters
 * Now queries the aggregated admin_daily_summaries collection
 */
export async function getDailySummaries(
  conversationId?: string,
  startDate?: Date,
  endDate?: Date,
  limitCount: number = 50
): Promise<DailySummary[]> {
  try {
    // Query the aggregated admin collection
    let q = query(
      collection(db, 'admin_daily_summaries'),
      orderBy('date', 'desc'),
      firestoreLimit(limitCount)
    );

    // Apply filters if provided
    if (conversationId) {
      q = query(q, where('conversationId', '==', conversationId));
    }

    const snapshot = await getDocs(q);

    let summaries = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        conversationId: data.conversationId,
        date: data.date,
        messageCount: data.messageCount || 0,
        transcriptText: data.summary || '', // Use summary as transcript preview
        summary: data.summary || '',
        participants: data.participants || [],
        createdAt: data.dateTimestamp || data.aggregatedAt || Timestamp.now(),
        recordingCount: data.recordingCount,
        topics: data.topics,
        keywords: data.keywords,
        sentiment: data.sentiment,
      };
    }) as DailySummary[];

    // Client-side date filtering
    if (startDate || endDate) {
      summaries = summaries.filter(s => {
        const summaryDate = new Date(s.date);
        if (startDate && summaryDate < startDate) return false;
        if (endDate && summaryDate > endDate) return false;
        return true;
      });
    }

    return summaries;
  } catch (error) {
    console.error('Error fetching daily summaries:', error);
    throw error;
  }
}

/**
 * Fetch weekly summaries
 * Now queries the aggregated admin_weekly_summaries collection
 */
export async function getWeeklySummaries(
  conversationId?: string,
  limitCount: number = 20
): Promise<WeeklySummary[]> {
  try {
    // Query the aggregated admin collection
    let q = query(
      collection(db, 'admin_weekly_summaries'),
      orderBy('startDate', 'desc'),
      firestoreLimit(limitCount)
    );

    // Apply filter if provided
    if (conversationId) {
      q = query(q, where('conversationId', '==', conversationId));
    }

    const snapshot = await getDocs(q);

    const summaries = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        conversationId: data.conversationId,
        weekId: data.week,
        weekStart: data.startDate,
        weekEnd: data.endDate,
        totalMessages: data.totalMessages || 0,
        totalRecordings: data.totalRecordings || 0,
        keyTopics: data.topics || [],
        summary: data.summary || '',
        reelGenerated: data.reelGenerated || false,
        reelId: data.reelId,
        participants: data.participants || [],
        createdAt: data.aggregatedAt || Timestamp.now(),
      };
    }) as WeeklySummary[];

    return summaries;
  } catch (error) {
    console.error('Error fetching weekly summaries:', error);
    throw error;
  }
}

/**
 * Fetch SI analytics events and alerts
 */
export async function getSIAnalytics(
  startDate?: Date,
  endDate?: Date
): Promise<SIAnalytics> {
  try {
    // Query SI events
    let eventsQuery = query(
      collection(db, 'si_analytics'),
      orderBy('timestamp', 'desc'),
      firestoreLimit(100)
    );

    if (startDate) {
      eventsQuery = query(eventsQuery, where('timestamp', '>=', Timestamp.fromDate(startDate)));
    }

    const eventsSnapshot = await getDocs(eventsQuery);
    const events: SIEvent[] = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as SIEvent[];

    // Query SI alerts
    const alertsQuery = query(
      collection(db, 'si_alerts'),
      orderBy('timestamp', 'desc'),
      firestoreLimit(50)
    );

    const alertsSnapshot = await getDocs(alertsQuery);
    const allAlerts: SIAlert[] = alertsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as SIAlert[];
    
    // Filter unresolved alerts in memory
    const alerts = allAlerts.filter(alert => !alert.resolved);

    // Calculate summary stats
    const errorEvents = events.filter(e => e.eventType === 'error');
    const errorRate = events.length > 0 ? (errorEvents.length / events.length) * 100 : 0;
    
    const avgProcessingTime = events
      .filter(e => e.durationMs)
      .reduce((sum, e) => sum + (e.durationMs || 0), 0) / events.filter(e => e.durationMs).length || 0;

    // If no real data, return mock
    if (events.length === 0) {
      return {
        events: [
          {
            id: 'event_1',
            eventType: 'recording_uploaded',
            timestamp: Timestamp.now(),
            conversationId: 'conv_123',
            userId: 'user_1',
            metadata: { fileName: 'session_2025-11-05.mp4', size: 15728640 },
          },
          {
            id: 'event_2',
            eventType: 'transcription_complete',
            timestamp: Timestamp.now(),
            conversationId: 'conv_123',
            durationMs: 5420,
          },
        ],
        alerts: [],
        summary: {
          totalRecordings: 45,
          totalTranscriptions: 42,
          totalDailySummaries: 38,
          totalWeeklySummaries: 6,
          avgProcessingTime: 4800,
          errorRate: 2.5,
        },
      };
    }

    return {
      events,
      alerts,
      summary: {
        totalRecordings: events.filter(e => e.eventType === 'recording_uploaded').length,
        totalTranscriptions: events.filter(e => e.eventType === 'transcription_complete').length,
        totalDailySummaries: events.filter(e => e.eventType === 'daily_summary_generated').length,
        totalWeeklySummaries: events.filter(e => e.eventType === 'weekly_summary_generated').length,
        avgProcessingTime,
        errorRate,
      },
    };
  } catch (error) {
    console.error('Error fetching SI analytics:', error);
    throw error;
  }
}

