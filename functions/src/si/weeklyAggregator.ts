/**
 * Session Intelligence: Weekly Aggregator (SI-07)
 * 
 * Runs every Sunday at 6 PM America/Chicago
 * Aggregates last week's daily summaries into a single weekly digest
 * Generates highlights and comprehensive summaries for parent overview
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { OpenAI } from 'openai';

// Lazy-load OpenAI client
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export interface WeeklySummary {
  conversationId: string;
  weekId: string; // Format: YYYY-WW (e.g., "2025-W01")
  startDate: string; // YYYY-MM-DD (Monday)
  endDate: string; // YYYY-MM-DD (Sunday)
  aggregatedSummary: string; // Comprehensive narrative summary
  highlights: string[]; // 5-7 key highlights from the week
  topicsSet: string[]; // Unique topics covered (e.g., ["Math.Algebra", "Science.Physics"])
  totalRecordings: number;
  totalDuration: number; // seconds
  totalWordCount: number;
  dailySummaries: Array<{
    date: string;
    recordingCount: number;
    duration: number;
    wordCount: number;
    topics: string[];
  }>;
  createdAt: admin.firestore.Timestamp;
  reelUrl?: string; // Will be set by SI-08
  reelStatus?: 'pending' | 'processing' | 'complete' | 'failed';
}

const WEEKLY_AGGREGATOR_PROMPT = `You are an AI tutor assistant creating a weekly progress summary for a parent.

**Daily Summaries from the Week:**
{dailySummariesText}

**Week Statistics:**
- Total recordings: {totalRecordings}
- Total study time: {totalDurationFormatted}
- Topics covered: {topicsJoined}

Create a comprehensive weekly summary in JSON format:

{
  "aggregatedSummary": "A 3-4 sentence narrative describing the week's learning journey, progress, and achievements",
  "highlights": [
    "Key achievement or breakthrough #1",
    "Key achievement or breakthrough #2",
    "Key achievement or breakthrough #3",
    "Key achievement or breakthrough #4",
    "Key achievement or breakthrough #5"
  ]
}

**Guidelines:**
- aggregatedSummary should tell a story about the student's week
- Highlights should be specific, actionable, and parent-friendly
- Focus on progress, growth, and concrete learning outcomes
- Mention topics covered and time invested
- Keep each highlight under 2 sentences
- Aim for 5-7 highlights total
- Use encouraging, positive language

Return ONLY the JSON object, no additional text.`;

/**
 * Get week ID in ISO format (YYYY-WW)
 */
function getWeekId(date: Date): string {
  const year = date.getFullYear();
  
  // Calculate ISO week number
  const firstDayOfYear = new Date(year, 0, 1);
  const daysSinceFirstDay = Math.floor(
    (date.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000)
  );
  const weekNumber = Math.ceil((daysSinceFirstDay + firstDayOfYear.getDay() + 1) / 7);
  
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * Get Monday and Sunday of the previous week
 */
function getPreviousWeekRange(): { monday: Date; sunday: Date } {
  const now = new Date();
  
  // Get last Sunday
  const daysUntilSunday = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - daysUntilSunday);
  lastSunday.setHours(23, 59, 59, 999);
  
  // Get Monday before that (7 days before Sunday)
  const monday = new Date(lastSunday);
  monday.setDate(lastSunday.getDate() - 6);
  monday.setHours(0, 0, 0, 0);
  
  return { monday, sunday: lastSunday };
}

/**
 * Format duration in human-readable form
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Fetch all conversations that had activity in the date range
 */
async function getActiveConversations(
  startDate: string,
  endDate: string
): Promise<string[]> {
  const db = admin.firestore();
  
  logger.info('🔍 Finding active conversations', { startDate, endDate });
  
  // Query all daily summaries in the date range using collection group
  const dailySummariesSnapshot = await db
    .collectionGroup('daily')
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .get();
  
  // Extract unique conversation IDs
  const conversationIds = new Set<string>();
  dailySummariesSnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.conversationId) {
      conversationIds.add(data.conversationId);
    }
  });
  
  logger.info('✅ Found active conversations', { count: conversationIds.size });
  
  return Array.from(conversationIds);
}

/**
 * Generate weekly summary for a single conversation
 */
async function generateWeeklySummary(
  conversationId: string,
  weekId: string,
  startDate: string,
  endDate: string
): Promise<void> {
  const db = admin.firestore();
  
  logger.info('📊 Generating weekly summary', {
    conversationId: conversationId.substring(0, 12),
    weekId,
    startDate,
    endDate,
  });
  
  try {
    // Fetch all daily summaries for the week
    const dailySummariesRef = db
      .collection('summaries')
      .doc(conversationId)
      .collection('daily');
    
    const dailyDocs = await dailySummariesRef
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'asc')
      .get();
    
    if (dailyDocs.empty) {
      logger.info('⚠️ No daily summaries found for week', {
        conversationId: conversationId.substring(0, 12),
        weekId,
      });
      return;
    }
    
    logger.info('📚 Found daily summaries', {
      conversationId: conversationId.substring(0, 12),
      count: dailyDocs.size,
    });
    
    // Aggregate data from daily summaries
    let totalRecordings = 0;
    let totalDuration = 0;
    let totalWordCount = 0;
    const allTopics = new Set<string>();
    const dailySummariesData: WeeklySummary['dailySummaries'] = [];
    const dailySummariesText: string[] = [];
    
    dailyDocs.forEach(doc => {
      const daily = doc.data();
      
      totalRecordings += daily.recordings?.length || 0;
      totalDuration += daily.totalDuration || 0;
      totalWordCount += daily.totalWordCount || 0;
      
      // Collect topics
      (daily.topicsSet || []).forEach((topic: string) => allTopics.add(topic));
      
      // Build daily summary entry
      dailySummariesData.push({
        date: daily.date,
        recordingCount: daily.recordings?.length || 0,
        duration: daily.totalDuration || 0,
        wordCount: daily.totalWordCount || 0,
        topics: daily.topicsSet || [],
      });
      
      // Build text for LLM context
      if (daily.recordings && daily.recordings.length > 0) {
        const recordingSummaries = daily.recordings
          .map((r: any) => r.highlights?.join('. ') || '')
          .filter(Boolean)
          .join(' ');
        
        if (recordingSummaries) {
          dailySummariesText.push(`**${daily.date}:** ${recordingSummaries}`);
        }
      }
    });
    
    if (dailySummariesText.length === 0) {
      logger.warn('⚠️ No content to summarize', {
        conversationId: conversationId.substring(0, 12),
        weekId,
      });
      return;
    }
    
    logger.info('📝 Calling LLM for weekly summary', {
      conversationId: conversationId.substring(0, 12),
      dailySummaries: dailySummariesText.length,
      totalRecordings,
    });
    
    // Generate summary using LLM
    const prompt = WEEKLY_AGGREGATOR_PROMPT
      .replace('{dailySummariesText}', dailySummariesText.join('\n\n'))
      .replace('{totalRecordings}', totalRecordings.toString())
      .replace('{totalDurationFormatted}', formatDuration(totalDuration))
      .replace('{topicsJoined}', Array.from(allTopics).join(', '));
    
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a precise AI assistant that returns only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 800,
    });
    
    const responseText = completion.choices[0]?.message?.content || '{}';
    
    // Parse LLM response
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (error) {
      logger.error('Failed to parse LLM response', { responseText, error });
      throw new Error('Invalid JSON response from LLM');
    }
    
    // Build weekly summary document
    const weeklySummary: WeeklySummary = {
      conversationId,
      weekId,
      startDate,
      endDate,
      aggregatedSummary: parsed.aggregatedSummary || '',
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 7) : [],
      topicsSet: Array.from(allTopics),
      totalRecordings,
      totalDuration,
      totalWordCount,
      dailySummaries: dailySummariesData,
      createdAt: admin.firestore.Timestamp.now(),
      reelStatus: 'pending',
    };
    
    // Save to Firestore
    const weeklyRef = db
      .collection('summaries')
      .doc(conversationId)
      .collection('weekly')
      .doc(weekId);
    
    await weeklyRef.set(weeklySummary);
    
    logger.info('✅ Weekly summary created', {
      conversationId: conversationId.substring(0, 12),
      weekId,
      highlights: weeklySummary.highlights.length,
      topics: weeklySummary.topicsSet.length,
    });
    
    // Generate weekly reel (SI-09)
    try {
      const { generateWeeklyReel } = await import('./generateWeeklyReel');
      const reelId = await generateWeeklyReel(conversationId, weekId);
      
      if (reelId) {
        logger.info('✅ Weekly reel generated', {
          conversationId: conversationId.substring(0, 12),
          weekId,
          reelId,
        });
        
        // Queue push notification (SI-09)
        await queueWeeklyReelNotification(conversationId, weekId, reelId);
      }
    } catch (reelError: any) {
      logger.error('❌ Weekly reel generation failed (non-fatal)', {
        conversationId: conversationId.substring(0, 12),
        weekId,
        error: reelError.message,
      });
      // Don't throw - weekly summary was still created successfully
    }
    
  } catch (error: any) {
    logger.error('❌ Failed to generate weekly summary', {
      conversationId: conversationId.substring(0, 12),
      weekId,
      error: error.message,
      stack: error.stack,
    });
    
    // Don't throw - continue processing other conversations
  }
}

/**
 * Queue push notification for weekly reel ready
 */
async function queueWeeklyReelNotification(
  conversationId: string,
  weekId: string,
  reelId: string
): Promise<void> {
  const db = admin.firestore();
  
  try {
    // Get conversation to find participants
    const conversationDoc = await db.collection('conversations').doc(conversationId).get();
    const participants = conversationDoc.data()?.participants || [];
    
    // Send notification to each participant (typically parents)
    for (const userId of participants) {
      const userDoc = await db.collection('users').doc(userId).get();
      const user = userDoc.data();
      
      // Only notify if user has push tokens
      if (user?.pushTokens && user.pushTokens.length > 0) {
        await db.collection('notifications').add({
          userId,
          type: 'weekly_reel_ready',
          title: 'Your Weekly Progress Reel is Ready! 🎬',
          body: 'See this week\'s learning highlights and achievements',
          data: {
            type: 'weekly_reel',
            reelId,
            weekId,
            conversationId,
          },
          tokens: user.pushTokens,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          sent: false,
        });
        
        logger.info('📬 Queued weekly reel notification', {
          userId: userId.substring(0, 8),
          reelId,
          weekId,
        });
      }
    }
  } catch (error: any) {
    logger.error('❌ Failed to queue weekly reel notification', {
      conversationId: conversationId.substring(0, 12),
      weekId,
      reelId,
      error: error.message,
    });
    // Don't throw - notification failure shouldn't break the flow
  }
}

/**
 * Main scheduled function: Generate weekly summaries
 * Runs every Sunday at 6 PM America/Chicago
 */
export const aggregateWeeklySummaries = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: '1GB',
  })
  .pubsub
  .schedule('0 18 * * 0') // Every Sunday at 6 PM
  .timeZone('America/Chicago')
  .onRun(async (context) => {
    logger.info('🗓️ Starting weekly summary aggregation');
    
    try {
      // Get previous week's date range (Monday to Sunday)
      const { monday, sunday } = getPreviousWeekRange();
      const startDate = monday.toISOString().split('T')[0]; // YYYY-MM-DD
      const endDate = sunday.toISOString().split('T')[0]; // YYYY-MM-DD
      const weekId = getWeekId(monday);
      
      logger.info('📅 Processing week', { weekId, startDate, endDate });
      
      // Find all conversations with activity in the date range
      const conversationIds = await getActiveConversations(startDate, endDate);
      
      if (conversationIds.length === 0) {
        logger.info('ℹ️ No active conversations found for the week');
        return;
      }
      
      logger.info('🔄 Generating summaries', { conversations: conversationIds.length });
      
      // Generate weekly summary for each conversation
      let successCount = 0;
      let errorCount = 0;
      
      for (const conversationId of conversationIds) {
        try {
          await generateWeeklySummary(conversationId, weekId, startDate, endDate);
          successCount++;
        } catch (error: any) {
          logger.error('❌ Failed to process conversation', {
            conversationId: conversationId.substring(0, 12),
            error: error.message,
          });
          errorCount++;
        }
      }
      
      logger.info('✅ Weekly aggregation complete', {
        weekId,
        totalConversations: conversationIds.length,
        successful: successCount,
        failed: errorCount,
      });
      
    } catch (error: any) {
      logger.error('❌ Weekly aggregation failed', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  });

