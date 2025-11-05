import { collection, query, where, getDocs, orderBy, limit as firestoreLimit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DailySummary, WeeklySummary, SIEvent, SIAlert, SIAnalytics } from '@/types/sessionIntel';

/**
 * Fetch daily summaries with optional filters
 */
export async function getDailySummaries(
  conversationId?: string,
  startDate?: Date,
  endDate?: Date,
  limitCount: number = 50
): Promise<DailySummary[]> {
  try {
    let q = query(
      collection(db, 'summaries'),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limitCount)
    );

    if (conversationId) {
      q = query(q, where('conversationId', '==', conversationId));
    }

    if (startDate) {
      q = query(q, where('createdAt', '>=', Timestamp.fromDate(startDate)));
    }

    if (endDate) {
      q = query(q, where('createdAt', '<=', Timestamp.fromDate(endDate)));
    }

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Return mock data
      return [
        {
          id: 'daily_1',
          conversationId: 'conv_123',
          date: new Date().toISOString().split('T')[0],
          messageCount: 25,
          transcriptText: 'Student discussed quadratic equations...',
          summary: 'Review of quadratic equations and factoring techniques.',
          participants: ['user_tutor_1', 'user_parent_1'],
          createdAt: Timestamp.now(),
        },
        {
          id: 'daily_2',
          conversationId: 'conv_124',
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          messageCount: 18,
          transcriptText: 'Discussed essay writing structure...',
          summary: 'Introduction to five-paragraph essay format.',
          participants: ['user_tutor_2', 'user_parent_2'],
          createdAt: Timestamp.fromDate(new Date(Date.now() - 86400000)),
        },
      ];
    }

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as DailySummary[];
  } catch (error) {
    console.error('Error fetching daily summaries:', error);
    throw error;
  }
}

/**
 * Fetch weekly summaries
 */
export async function getWeeklySummaries(
  conversationId?: string,
  limitCount: number = 20
): Promise<WeeklySummary[]> {
  try {
    let q = query(
      collection(db, 'summaries'),
      orderBy('weekStart', 'desc'),
      firestoreLimit(limitCount)
    );

    if (conversationId) {
      q = query(q, where('conversationId', '==', conversationId));
    }

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Return mock data
      return [
        {
          id: 'weekly_1',
          conversationId: 'conv_123',
          weekId: '2025-W45',
          weekStart: Timestamp.fromDate(new Date(Date.now() - 7 * 86400000)),
          weekEnd: Timestamp.now(),
          totalMessages: 120,
          totalRecordings: 5,
          keyTopics: ['Algebra', 'Quadratic Equations', 'Factoring'],
          summary: 'Productive week covering quadratic equations with 5 tutoring sessions.',
          reelGenerated: true,
          reelId: 'reel_123',
          participants: ['user_tutor_1', 'user_parent_1'],
          createdAt: Timestamp.now(),
        },
      ];
    }

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as WeeklySummary[];
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
      where('resolved', '==', false),
      orderBy('timestamp', 'desc'),
      firestoreLimit(50)
    );

    const alertsSnapshot = await getDocs(alertsQuery);
    const alerts: SIAlert[] = alertsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as SIAlert[];

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

