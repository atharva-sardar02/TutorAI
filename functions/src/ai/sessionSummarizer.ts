/**
 * Session Summarizer
 * PR20: Transcription & Agentic Actions
 * 
 * Generates AI-powered summaries of tutoring sessions using GPT-4o-mini
 * Identifies viral signals and action opportunities
 */

import { OpenAI } from 'openai';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

// Lazy-load OpenAI client to avoid initialization errors during deployment
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export interface SessionSummary {
  sessionId: string;
  highlights: string[]; // 3-5 key moments
  topics: string[]; // Main subjects covered
  studentProgress: {
    strengths: string[];
    improvements: string[];
    nextSteps: string[];
  };
  sentiment: 'positive' | 'neutral' | 'negative';
  qualityScore: number; // 0-100
  viralSignals: {
    hasBigWin: boolean; // "Aha moment", breakthrough
    hasProgress: boolean; // Clear improvement shown
    hasTestTopic: boolean; // Exam prep, challenging topic
    hasPositiveFeedback: boolean; // 5★ rating or praise
  };
  createdAt: admin.firestore.Timestamp;
  model: 'gpt-4o-mini';
  tokenCount: number;
}

const SUMMARIZER_PROMPT = `You are an AI tutor assistant analyzing a tutoring session.

**Transcript:**
{transcript}

**Session Metadata:**
- Duration: {duration} minutes
- Participants: {participants}
- Subject: {subject}

**Recent Chat Messages (context):**
{messages}

Analyze this session and provide a structured summary in JSON format:

{
  "highlights": ["Key moment 1", "Key moment 2", "Key moment 3"],
  "topics": ["Topic 1", "Topic 2"],
  "studentProgress": {
    "strengths": ["What the student did well"],
    "improvements": ["What the student improved on"],
    "nextSteps": ["What to practice next"]
  },
  "sentiment": "positive|neutral|negative",
  "qualityScore": 85,
  "viralSignals": {
    "hasBigWin": true,        // Did student have "aha moment" or breakthrough?
    "hasProgress": true,       // Was clear progress/improvement shown?
    "hasTestTopic": false,     // Was this exam prep or challenging standardized test topic?
    "hasPositiveFeedback": true // Was there 5-star rating or high praise in chat?
  }
}

**Guidelines:**
- Be specific and actionable
- Highlight concrete achievements
- Identify viral-worthy moments (breakthroughs, progress, challenges overcome)
- Keep highlights under 2 sentences each
- Quality score: 0-100 based on engagement, progress, and session structure`;

/**
 * Summarize a tutoring session using AI
 * 
 * @param sessionId - ID of the session to summarize
 * @returns SessionSummary object
 */
export async function summarizeSession(sessionId: string): Promise<SessionSummary> {
  const db = admin.firestore();
  
  logger.info('🤖 Starting session summarization', { sessionId });
  
  try {
    // Fetch transcript
    const transcriptDoc = await db.collection('transcripts').doc(sessionId).get();
    if (!transcriptDoc.exists) {
      throw new Error(`Transcript not found for session ${sessionId}`);
    }
    const transcript = transcriptDoc.data()!;
    
    if (transcript.status !== 'complete') {
      throw new Error(`Transcript not ready: ${transcript.status}`);
    }
    
    // Fetch session metadata
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
      logger.warn(`Session document not found: ${sessionId}, creating placeholder`);
    }
    
    const session = sessionDoc.exists ? sessionDoc.data()! : {};
    
    // Fetch recent chat messages (for context)
    let messages = '';
    if (session.conversationId) {
      try {
        const messagesSnapshot = await db
          .collectionGroup('messages')
          .where('conversationId', '==', session.conversationId)
          .orderBy('serverTimestamp', 'desc')
          .limit(20)
          .get();
        
        messages = messagesSnapshot.docs
          .map(doc => {
            const msg = doc.data();
            return `${msg.senderName || 'Unknown'}: ${msg.text || ''}`;
          })
          .filter(m => m.length > 2) // Remove empty messages
          .reverse()
          .join('\n');
      } catch (error) {
        logger.warn('Could not fetch messages, continuing without context', { error });
        messages = 'No chat context available';
      }
    } else {
      messages = 'No conversation linked to this session';
    }
    
    // Build prompt with available data
    const prompt = SUMMARIZER_PROMPT
      .replace('{transcript}', transcript.text.slice(0, 8000)) // Limit to ~2000 tokens
      .replace('{duration}', String(session.duration || transcript.duration || 'unknown'))
      .replace('{participants}', session.participants?.join(', ') || 'unknown')
      .replace('{subject}', session.subject || 'General tutoring')
      .replace('{messages}', messages.slice(0, 2000)); // Limit context
    
    const startTime = Date.now();
    
    // Call GPT-4o-mini
    logger.info('🔄 Calling GPT-4o-mini for summarization...', { sessionId });
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert tutor assistant analyzing tutoring sessions.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    const duration = Date.now() - startTime;
    const usage = completion.usage;
    
    logger.info('✅ Summary generated', {
      sessionId,
      durationMs: duration,
      tokenCount: usage?.total_tokens || 0,
      promptTokens: usage?.prompt_tokens || 0,
      completionTokens: usage?.completion_tokens || 0,
    });
    
    // Parse response
    const summary = JSON.parse(completion.choices[0].message.content || '{}');
    
    // Construct result with defaults for missing fields
    const result: SessionSummary = {
      sessionId,
      highlights: summary.highlights || ['Session completed successfully'],
      topics: summary.topics || ['General topics'],
      studentProgress: {
        strengths: summary.studentProgress?.strengths || [],
        improvements: summary.studentProgress?.improvements || [],
        nextSteps: summary.studentProgress?.nextSteps || ['Continue practicing'],
      },
      sentiment: summary.sentiment || 'neutral',
      qualityScore: summary.qualityScore || 50,
      viralSignals: {
        hasBigWin: summary.viralSignals?.hasBigWin || false,
        hasProgress: summary.viralSignals?.hasProgress || false,
        hasTestTopic: summary.viralSignals?.hasTestTopic || false,
        hasPositiveFeedback: summary.viralSignals?.hasPositiveFeedback || false,
      },
      createdAt: admin.firestore.Timestamp.now(),
      model: 'gpt-4o-mini',
      tokenCount: usage?.total_tokens || 0,
    };
    
    // Store summary
    await db
      .collection('sessions')
      .doc(sessionId)
      .collection('summary')
      .doc('latest')
      .set(result);
    
    logger.info('💾 Summary stored in Firestore', { 
      sessionId,
      qualityScore: result.qualityScore,
      highlightCount: result.highlights.length,
    });
    
    return result;
    
  } catch (error: any) {
    logger.error('❌ Summarization failed', {
      sessionId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

