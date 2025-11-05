/**
 * Prep Pack Generator
 * PR20: Transcription & Agentic Actions
 * 
 * Generates study materials for students to prepare for next session
 * Always runs after every session (universal value)
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

export interface PrepPack {
  sessionId: string;
  title: string;
  topics: string[];
  materials: {
    type: 'practice_problems' | 'study_guide' | 'flashcards' | 'video_links';
    title: string;
    content: string;
  }[];
  nextSteps: string[];
  estimatedTime: number; // minutes
  createdAt: admin.firestore.Timestamp;
}

const PREPPACK_PROMPT = `You are an expert tutor creating study materials for a student.

**Session Topics:**
{topics}

**Student's Next Steps:**
{nextSteps}

Generate a comprehensive prep pack for the student's next session. Include:

1. **Practice Problems** (3-5 problems with solutions)
2. **Study Guide** (Key concepts summary)
3. **Flashcards** (5-10 Q&A pairs)
4. **Video Links** (2-3 relevant Khan Academy/YouTube links)

Return JSON:
{
  "title": "Prep Pack Title",
  "materials": [
    {
      "type": "practice_problems",
      "title": "Practice Problems",
      "content": "Problem 1: ...\\nSolution: ..."
    },
    {
      "type": "study_guide",
      "title": "Key Concepts",
      "content": "..."
    },
    {
      "type": "flashcards",
      "title": "Flashcards",
      "content": "Q: ...\\nA: ..."
    },
    {
      "type": "video_links",
      "title": "Video Resources",
      "content": "Khan Academy: ...\\nYouTube: ..."
    }
  ],
  "estimatedTime": 30
}`;

/**
 * Generate a prep pack for a tutoring session
 * 
 * @param sessionId - Session ID
 * @param options - Topics and next steps
 * @returns PrepPack object
 */
export async function generatePrepPack(
  sessionId: string,
  options: {
    topics: string[];
    nextSteps: string[];
  }
): Promise<PrepPack> {
  
  logger.info('📚 Generating prep pack', { 
    sessionId, 
    topicCount: options.topics.length,
    nextStepsCount: options.nextSteps.length,
  });
  
  // Validate inputs
  if (!options.topics || options.topics.length === 0) {
    options.topics = ['General review'];
  }
  
  if (!options.nextSteps || options.nextSteps.length === 0) {
    options.nextSteps = ['Continue practicing the concepts covered'];
  }
  
  const prompt = PREPPACK_PROMPT
    .replace('{topics}', options.topics.join(', '))
    .replace('{nextSteps}', options.nextSteps.map(s => `- ${s}`).join('\n'));
  
  try {
    const startTime = Date.now();
    
    // Call GPT-4o-mini
    logger.info('🔄 Calling GPT-4o-mini for prep pack generation...', { sessionId });
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert tutor creating study materials.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    });
    
    const duration = Date.now() - startTime;
    const usage = completion.usage;
    
    logger.info('✅ Prep pack content generated', {
      sessionId,
      durationMs: duration,
      tokenCount: usage?.total_tokens || 0,
    });
    
    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    const prepPack: PrepPack = {
      sessionId,
      title: result.title || `Study Materials - ${options.topics[0]}`,
      topics: options.topics,
      materials: result.materials || [],
      nextSteps: options.nextSteps,
      estimatedTime: result.estimatedTime || 30,
      createdAt: admin.firestore.Timestamp.now(),
    };
    
    // Validate materials
    if (prepPack.materials.length === 0) {
      prepPack.materials = [{
        type: 'study_guide',
        title: 'Study Guide',
        content: 'Review the topics covered in today\'s session and practice the concepts.',
      }];
    }
    
    // Store in Firestore
    const db = admin.firestore();
    await db
      .collection('sessions')
      .doc(sessionId)
      .collection('prepPacks')
      .doc('latest') // Use fixed ID so we can easily fetch the latest
      .set(prepPack);
    
    logger.info('💾 Prep pack stored', {
      sessionId,
      materialCount: prepPack.materials.length,
      estimatedTime: prepPack.estimatedTime,
    });
    
    return prepPack;
    
  } catch (error: any) {
    logger.error('❌ Prep pack generation failed', {
      sessionId,
      error: error.message,
      stack: error.stack,
    });
    
    // Return a basic fallback prep pack
    const fallbackPack: PrepPack = {
      sessionId,
      title: 'Study Materials',
      topics: options.topics,
      materials: [{
        type: 'study_guide',
        title: 'Review Guide',
        content: `Review these topics from today's session:\n\n${options.topics.map(t => `- ${t}`).join('\n')}\n\nNext steps:\n${options.nextSteps.map(s => `- ${s}`).join('\n')}`,
      }],
      nextSteps: options.nextSteps,
      estimatedTime: 20,
      createdAt: admin.firestore.Timestamp.now(),
    };
    
    // Store fallback
    const db = admin.firestore();
    await db
      .collection('sessions')
      .doc(sessionId)
      .collection('prepPacks')
      .doc('latest')
      .set(fallbackPack);
    
    return fallbackPack;
  }
}

