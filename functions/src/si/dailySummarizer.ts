/**
 * Session Intelligence: Daily Summarizer (SI-05)
 * 
 * Generates daily summaries from individual recording transcripts
 * Triggered when transcripts are created
 * Appends to daily summary documents for later weekly aggregation
 */

import { OpenAI } from 'openai';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

// Lazy-load OpenAI client
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export interface RecordingSummary {
  recordingId: string;
  highlights: string[]; // 2-3 key moments from this recording
  topics: string[]; // Normalized topics ["Algebra", "Calculus", "Physics"]
  duration: number; // Duration in seconds
  wordCount: number;
  qualityScore: number; // 0-100
  createdAt: admin.firestore.Timestamp;
}

export interface MessageDigest {
  messageCount: number;
  textContent: string; // Formatted chat transcript
  participantIds: string[];
  firstMessageAt: admin.firestore.Timestamp;
  lastMessageAt: admin.firestore.Timestamp;
}

export interface DailySummary {
  conversationId: string;
  date: string; // YYYY-MM-DD
  recordings: RecordingSummary[]; // All recordings processed today
  messageDigest?: MessageDigest; // Chat messages from the day (SI-05B)
  totalDuration: number; // Sum of all recordings
  totalWordCount: number;
  topicsSet: string[]; // Unique topics across all recordings
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

const DAILY_SUMMARIZER_PROMPT = `You are an AI tutor assistant analyzing a lecture recording.

**Chat Messages (if available):**
{messages}

**Recording Transcript:**
{transcript}

**Recording Metadata:**
- Duration: {duration} minutes
- Word Count: {wordCount}

Analyze this recording and provide a structured summary in JSON format:

{
  "highlights": ["Key point 1", "Key point 2"],
  "topics": ["Math.Algebra", "Math.Geometry"],
  "qualityScore": 85
}

**Guidelines for topics:**
- Use normalized format: "Subject.SubTopic" (e.g., "Math.Algebra", "Science.Physics", "English.Grammar")
- Be specific but consistent (e.g., "Math.Quadratics" not "quadratic equations")
- Limit to 3 most relevant topics
- Common subjects: Math, Science, English, History, Language, Arts, Test Prep

**Guidelines for highlights:**
- Extract 2-3 key teaching moments or concepts covered
- Be concise (under 2 sentences each)
- Focus on what the student learned or practiced

**Guidelines for quality score:**
- 90-100: Excellent structure, clear teaching, good engagement
- 70-89: Good content, some structure
- 50-69: Basic coverage, minimal structure
- 0-49: Poor quality or very short

Return ONLY the JSON object, no additional text.`;

/**
 * Generate summary for a single recording transcript
 * 
 * @param conversationId - ID of the conversation
 * @param recordingId - ID of the recording
 * @param transcript - Full transcript text
 * @param duration - Duration in seconds
 * @param wordCount - Word count
 * @param messageContext - Optional chat message context for richer summaries
 * @returns RecordingSummary object
 */
async function summarizeRecording(
  conversationId: string,
  recordingId: string,
  transcript: string,
  duration: number,
  wordCount: number,
  messageContext?: string
): Promise<RecordingSummary> {
  logger.info('🤖 Summarizing recording', { conversationId, recordingId, wordCount });
  
  // Build prompt with optional message context
  const messagesSection = messageContext 
    ? messageContext.substring(0, 5000) // Limit to ~5k chars
    : 'No chat messages available for this recording.';
  
  const prompt = DAILY_SUMMARIZER_PROMPT
    .replace('{messages}', messagesSection)
    .replace('{transcript}', transcript.substring(0, 15000)) // Limit to ~15k chars to avoid token limits
    .replace('{duration}', (duration / 60).toFixed(1))
    .replace('{wordCount}', wordCount.toString());
  
  // Call GPT-4o-mini
  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a precise AI assistant that returns only valid JSON.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3, // Lower temperature for more consistent output
    max_tokens: 500,
  });
  
  const responseText = completion.choices[0]?.message?.content || '{}';
  
  // Parse JSON response
  let parsed: any;
  try {
    parsed = JSON.parse(responseText);
  } catch (error) {
    logger.error('Failed to parse LLM response', { responseText, error });
    throw new Error('Invalid JSON response from LLM');
  }
  
  // Validate and build summary
  const summary: RecordingSummary = {
    recordingId,
    highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 3) : [],
    topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 3) : [],
    duration,
    wordCount,
    qualityScore: typeof parsed.qualityScore === 'number' ? parsed.qualityScore : 50,
    createdAt: admin.firestore.Timestamp.now(),
  };
  
  logger.info('✅ Recording summary generated', {
    conversationId,
    recordingId,
    topics: summary.topics,
    qualityScore: summary.qualityScore,
  });
  
  return summary;
}

/**
 * Main function: Process new transcript and update daily summary
 * Called by Firestore trigger when transcript is created
 * 
 * @param conversationId - ID of the conversation
 * @param recordingId - ID of the recording
 */
export async function processDailySummary(
  conversationId: string,
  recordingId: string
): Promise<void> {
  const db = admin.firestore();
  
  logger.info('📝 Processing daily summary', { conversationId, recordingId });
  
  try {
    // Fetch transcript
    const transcriptRef = db
      .collection('transcripts')
      .doc(conversationId)
      .collection('recordings')
      .doc(recordingId);
    
    const transcriptDoc = await transcriptRef.get();
    if (!transcriptDoc.exists) {
      logger.error('Transcript not found', { conversationId, recordingId });
      return;
    }
    
    const transcript = transcriptDoc.data()!;
    
    if (transcript.status !== 'complete') {
      logger.info('Transcript not ready, skipping', {
        conversationId,
        recordingId,
        status: transcript.status,
      });
      return;
    }
    
    // Generate recording summary using LLM
    const recordingSummary = await summarizeRecording(
      conversationId,
      recordingId,
      transcript.text,
      transcript.duration || 0,
      transcript.wordCount || 0
    );
    
    // Get current date in YYYY-MM-DD format
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Reference to daily summary document
    const dailySummaryRef = db
      .collection('summaries')
      .doc(conversationId)
      .collection('daily')
      .doc(dateStr);
    
    // Atomic update: append recording summary to daily doc
    await db.runTransaction(async (transaction) => {
      const dailyDoc = await transaction.get(dailySummaryRef);
      
      if (!dailyDoc.exists) {
        // Create new daily summary
        const newDaily: DailySummary = {
          conversationId,
          date: dateStr,
          recordings: [recordingSummary],
          totalDuration: recordingSummary.duration,
          totalWordCount: recordingSummary.wordCount,
          topicsSet: recordingSummary.topics,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        };
        
        transaction.set(dailySummaryRef, newDaily);
        logger.info('✅ Created new daily summary', { conversationId, date: dateStr });
      } else {
        // Append to existing daily summary
        const existingDaily = dailyDoc.data() as DailySummary;
        
        // Idempotency guard: check if this recording was already processed
        const alreadyProcessed = existingDaily.recordings.some(
          (r) => r.recordingId === recordingId
        );
        
        if (alreadyProcessed) {
          logger.warn('Recording already in daily summary, skipping', {
            conversationId,
            recordingId,
            date: dateStr,
          });
          return;
        }
        
        // Append recording
        const updatedRecordings = [...existingDaily.recordings, recordingSummary];
        
        // Update aggregates
        const updatedTopicsSet = Array.from(
          new Set([...existingDaily.topicsSet, ...recordingSummary.topics])
        );
        
        transaction.update(dailySummaryRef, {
          recordings: updatedRecordings,
          totalDuration: admin.firestore.FieldValue.increment(recordingSummary.duration),
          totalWordCount: admin.firestore.FieldValue.increment(recordingSummary.wordCount),
          topicsSet: updatedTopicsSet,
          updatedAt: admin.firestore.Timestamp.now(),
        });
        
        logger.info('✅ Updated daily summary', {
          conversationId,
          date: dateStr,
          totalRecordings: updatedRecordings.length,
        });
      }
    });
    
    // Update transcript with summary reference
    await transcriptRef.update({
      summary: recordingSummary.highlights.join(' '),
      topics: recordingSummary.topics,
      qualityScore: recordingSummary.qualityScore,
      dailySummaryDate: dateStr,
    });
    
    logger.info('💾 Daily summary processing complete', {
      conversationId,
      recordingId,
      date: dateStr,
    });
    
  } catch (error: any) {
    logger.error('❌ Daily summary processing failed', {
      conversationId,
      recordingId,
      error: error.message,
      stack: error.stack,
    });
    
    // Don't throw - we want to handle gracefully
    return;
  }
}

/**
 * Update daily summary with message digest (SI-05B)
 * Called by scheduled message aggregator
 * 
 * @param conversationId - ID of the conversation
 * @param dateStr - Date in YYYY-MM-DD format
 */
export async function updateDailySummaryWithMessages(
  conversationId: string,
  dateStr: string
): Promise<void> {
  const db = admin.firestore();
  
  logger.info('📨 Updating daily summary with messages', { conversationId, dateStr });
  
  try {
    // Import here to avoid circular dependency
    const { aggregateMessagesForDate } = await import('./messageAggregator');
    
    // Fetch message digest for the day
    const messageDigest = await aggregateMessagesForDate(conversationId, dateStr);
    
    if (!messageDigest) {
      logger.info('No messages to add to daily summary', { conversationId, dateStr });
      return;
    }
    
    // Reference to daily summary document
    const dailySummaryRef = db
      .collection('summaries')
      .doc(conversationId)
      .collection('daily')
      .doc(dateStr);
    
    // Atomic update: add message digest
    await db.runTransaction(async (transaction) => {
      const dailyDoc = await transaction.get(dailySummaryRef);
      
      if (!dailyDoc.exists) {
        // Create new daily summary with only messages (no recordings)
        const newDaily: DailySummary = {
          conversationId,
          date: dateStr,
          recordings: [],
          messageDigest,
          totalDuration: 0,
          totalWordCount: 0,
          topicsSet: [],
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        };
        
        transaction.set(dailySummaryRef, newDaily);
        logger.info('✅ Created daily summary with messages only', {
          conversationId,
          dateStr,
          messageCount: messageDigest.messageCount,
        });
      } else {
        // Update existing daily summary with messages
        transaction.update(dailySummaryRef, {
          messageDigest,
          updatedAt: admin.firestore.Timestamp.now(),
        });
        
        logger.info('✅ Updated existing daily summary with messages', {
          conversationId,
          dateStr,
          messageCount: messageDigest.messageCount,
        });
      }
    });
    
  } catch (error: any) {
    logger.error('❌ Failed to update daily summary with messages', {
      conversationId,
      dateStr,
      error: error.message,
      stack: error.stack,
    });
    
    // Don't throw - we want to handle gracefully
    return;
  }
}

