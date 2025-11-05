# PR20: Transcription & Agentic Actions - Implementation Plan

**Phase:** 4 - AI Pipeline  
**Week:** 3-4  
**Risk:** High  
**Effort:** Large (L)  
**Dependencies:** PR16 (Orchestrator), PR25 (Incentives)

---

## 🎯 Executive Summary

**Goal:** Transcribe tutoring sessions using Whisper, generate AI summaries, and automatically trigger 4+ viral growth actions based on session quality signals.

**Key Outcomes:**
- 📝 Transcription completes <10 min for 60-min sessions
- 🤖 AI summary generated <30s after transcription
- 🚀 ≥4 distinct actions identified per session type
- ⚡ Actions executed within 5 min of summary completion
- 💰 Cost <$0.50/session (Whisper + GPT-4o-mini)

**Kill-Switches:**
- `growth.transcription.enabled`
- `growth.agenticActions.enabled`
- Per-action flags: `tutorCard`, `progressReel`, `studyBuddy`, `prepPack`

---

## 📊 User Flow

### Happy Path: High-Quality Session

```
1. Tutor ends session → Recording uploaded to Storage
   ↓
2. Cloud Function triggered → Whisper transcription (5-10 min)
   ↓
3. Transcript stored → GPT-4o-mini summarization (20-30s)
   ↓
4. Action Analyzer detects:
   - 5★ rating → TutorCard opportunity
   - Progress made → ProgressReel (requires PR19)
   - New topic covered → PrepPack generation
   - Challenging concepts → StudyBuddy opportunity
   ↓
5. Orchestrator checks eligibility (cooldowns, consent, flags)
   ↓
6. Action Executor runs approved actions:
   - Generate TutorCard (if PR18 complete)
   - Schedule PrepPack email
   - Send push: "Session highlights ready!"
   ↓
7. User taps notification → Views summary + generated content
```

### Alternative Paths

**No recording:**
- Fallback: Generate summary from chat history only
- Reduced action opportunities (can still trigger PrepPack)

**Low-quality session:**
- Summary generated but no viral actions triggered
- Still send PrepPack (always valuable)

---

## 🏗️ Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────┐
│              Firebase Storage                       │
│  /recordings/{sessionId}/audio.m4a                 │
└────────────────┬────────────────────────────────────┘
                 │ (1) Upload complete
                 ↓
┌─────────────────────────────────────────────────────┐
│   Cloud Function: transcribeSession                 │
│   Trigger: onFinalize('/recordings/{sessionId}')   │
│   - Call OpenAI Whisper API                        │
│   - Store transcript in Firestore                  │
│   - Trigger: afterTranscript                       │
└────────────────┬────────────────────────────────────┘
                 │ (2) Transcript complete
                 ↓
┌─────────────────────────────────────────────────────┐
│   /transcripts/{sessionId}                          │
│   { text, duration, wordCount, language }           │
└────────────────┬────────────────────────────────────┘
                 │ (3) onCreate trigger
                 ↓
┌─────────────────────────────────────────────────────┐
│   Cloud Function: afterTranscript                   │
│   - Fetch session + messages + transcript          │
│   - Call sessionSummarizer (GPT-4o-mini)           │
│   - Store summary in Firestore                     │
│   - Trigger: afterSummary                          │
└────────────────┬────────────────────────────────────┘
                 │ (4) Summary complete
                 ↓
┌─────────────────────────────────────────────────────┐
│   /sessions/{sessionId}/summary                     │
│   { highlights, topics, progress, nextSteps }       │
└────────────────┬────────────────────────────────────┘
                 │ (5) onCreate trigger
                 ↓
┌─────────────────────────────────────────────────────┐
│   Cloud Function: afterSummary                      │
│   - actionAnalyzer: Identify opportunities         │
│   - loopOrchestrator: Check eligibility            │
│   - actionExecutor: Run approved actions           │
│   - sendNotification: Alert users                  │
└─────────────────────────────────────────────────────┘
                 │ (6) Actions complete
                 ↓
┌─────────────────────────────────────────────────────┐
│   Frontend: Session Detail Screen                  │
│   - Display summary                                │
│   - Show generated content (TutorCard, PrepPack)   │
│   - Share buttons for viral content                │
└─────────────────────────────────────────────────────┘
```

---

## 📝 Technical Specification

### 1. Whisper Transcription Service

**File:** `functions/src/transcription/transcribeSession.ts`

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { OpenAI } from 'openai';
import { storage } from '../admin';
import * as logger from 'firebase-functions/logger';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface TranscriptMetadata {
  sessionId: string;
  text: string;
  duration: number;
  wordCount: number;
  language: string;
  model: 'whisper-1';
  createdAt: admin.firestore.Timestamp;
  status: 'processing' | 'complete' | 'failed';
  error?: string;
}

/**
 * Triggered when recording is uploaded to Storage
 * Path: /recordings/{sessionId}/audio.m4a
 */
export const transcribeSession = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes (Whisper can take time)
    memory: '1GB',
  })
  .storage
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name;
    
    // Only process audio files in /recordings/{sessionId}/
    if (!filePath || !filePath.startsWith('recordings/') || !filePath.endsWith('.m4a')) {
      logger.info('Skipping non-audio file:', filePath);
      return;
    }
    
    const pathParts = filePath.split('/');
    if (pathParts.length !== 3) {
      logger.warn('Invalid recording path structure:', filePath);
      return;
    }
    
    const sessionId = pathParts[1];
    
    logger.info('🎙️ Starting transcription', { sessionId, filePath });
    
    const db = admin.firestore();
    const transcriptRef = db.collection('transcripts').doc(sessionId);
    
    try {
      // Mark as processing
      await transcriptRef.set({
        sessionId,
        status: 'processing',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // Download audio file from Storage
      const bucket = storage.bucket(object.bucket);
      const file = bucket.file(filePath);
      const [audioBuffer] = await file.download();
      
      logger.info('📥 Downloaded audio', {
        sessionId,
        sizeKB: (audioBuffer.length / 1024).toFixed(2),
      });
      
      // Call Whisper API
      const startTime = Date.now();
      const transcription = await openai.audio.transcriptions.create({
        file: new File([audioBuffer], 'audio.m4a', { type: 'audio/m4a' }),
        model: 'whisper-1',
        language: 'en', // Can detect automatically if omitted
        response_format: 'verbose_json', // Get metadata
      });
      
      const duration = Date.now() - startTime;
      const wordCount = transcription.text.split(/\s+/).length;
      
      logger.info('✅ Transcription complete', {
        sessionId,
        durationMs: duration,
        wordCount,
        language: transcription.language,
      });
      
      // Store transcript
      await transcriptRef.set({
        sessionId,
        text: transcription.text,
        duration: transcription.duration,
        wordCount,
        language: transcription.language || 'en',
        model: 'whisper-1',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'complete',
      });
      
      // Update session with transcript flag
      await db.collection('sessions').doc(sessionId).update({
        hasTranscript: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
    } catch (error: any) {
      logger.error('❌ Transcription failed', {
        sessionId,
        error: error.message,
        stack: error.stack,
      });
      
      await transcriptRef.set({
        sessionId,
        status: 'failed',
        error: error.message,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      throw error;
    }
  });
```

**Acceptance Criteria:**
- ✅ Transcription completes <10 min for 60-min sessions
- ✅ Handles audio files up to 100MB
- ✅ Stores transcript in Firestore with metadata
- ✅ Gracefully handles failures (stores error state)
- ✅ Cost <$0.10/session (Whisper pricing: $0.006/min)

---

### 2. Session Summarizer

**File:** `functions/src/ai/sessionSummarizer.ts`

```typescript
import { OpenAI } from 'openai';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    
    // Fetch session metadata
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    const session = sessionDoc.data()!;
    
    // Fetch recent chat messages (for context)
    const messagesSnapshot = await db
      .collection('conversations')
      .doc(session.conversationId)
      .collection('messages')
      .orderBy('serverTimestamp', 'desc')
      .limit(20)
      .get();
    
    const messages = messagesSnapshot.docs
      .map(doc => {
        const msg = doc.data();
        return `${msg.senderName}: ${msg.text}`;
      })
      .reverse()
      .join('\n');
    
    // Build prompt
    const prompt = SUMMARIZER_PROMPT
      .replace('{transcript}', transcript.text.slice(0, 8000)) // Limit to ~2000 tokens
      .replace('{duration}', String(session.duration || 'unknown'))
      .replace('{participants}', session.participants?.join(', ') || 'unknown')
      .replace('{subject}', session.subject || 'unknown')
      .replace('{messages}', messages.slice(0, 2000)); // Limit context
    
    const startTime = Date.now();
    
    // Call GPT-4o-mini
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert tutor assistant.' },
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
    });
    
    // Parse response
    const summary = JSON.parse(completion.choices[0].message.content || '{}');
    
    const result: SessionSummary = {
      sessionId,
      highlights: summary.highlights || [],
      topics: summary.topics || [],
      studentProgress: summary.studentProgress || {
        strengths: [],
        improvements: [],
        nextSteps: [],
      },
      sentiment: summary.sentiment || 'neutral',
      qualityScore: summary.qualityScore || 50,
      viralSignals: summary.viralSignals || {
        hasBigWin: false,
        hasProgress: false,
        hasTestTopic: false,
        hasPositiveFeedback: false,
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
```

**Acceptance Criteria:**
- ✅ Summary generated <30s after transcription
- ✅ JSON output with all required fields
- ✅ Viral signals correctly identified (>90% accuracy on test set)
- ✅ Cost <$0.40/session (GPT-4o-mini: $0.15/1M input, $0.60/1M output)

---

### 3. Action Analyzer

**File:** `functions/src/growth/actionAnalyzer.ts`

```typescript
import * as logger from 'firebase-functions/logger';
import { SessionSummary } from '../ai/sessionSummarizer';
import { isGrowthFeatureEnabled } from '../utils/featureFlags';

export type ActionType = 
  | 'tutorCard'      // PR18 - Shareable tutor testimonial
  | 'progressReel'   // PR19 - Video highlights (requires consent)
  | 'studyBuddy'     // PR23 - Challenge a friend
  | 'prepPack'       // PR20 - Email study materials
  | 'parentPod';     // PR24 - Group invite

export interface ActionOpportunity {
  type: ActionType;
  priority: number; // 1-10 (10 = highest)
  reason: string;
  metadata: Record<string, any>;
}

/**
 * Analyze session summary and identify viral action opportunities
 */
export async function analyzeActions(
  sessionId: string,
  summary: SessionSummary,
  sessionData: any
): Promise<ActionOpportunity[]> {
  
  const opportunities: ActionOpportunity[] = [];
  
  logger.info('🔍 Analyzing action opportunities', {
    sessionId,
    qualityScore: summary.qualityScore,
    viralSignals: summary.viralSignals,
  });
  
  // 1. TutorCard: High-quality session with positive feedback
  if (
    isGrowthFeatureEnabled('tutorCard') &&
    summary.qualityScore >= 80 &&
    summary.viralSignals.hasPositiveFeedback &&
    summary.sentiment === 'positive'
  ) {
    opportunities.push({
      type: 'tutorCard',
      priority: 9,
      reason: 'High-quality session with 5★ feedback',
      metadata: {
        rating: sessionData.rating || 5,
        highlights: summary.highlights.slice(0, 2),
        topics: summary.topics,
      },
    });
  }
  
  // 2. ProgressReel: Big win or breakthrough moment
  if (
    isGrowthFeatureEnabled('progressReel') &&
    (summary.viralSignals.hasBigWin || summary.viralSignals.hasProgress) &&
    summary.qualityScore >= 70
  ) {
    opportunities.push({
      type: 'progressReel',
      priority: 8,
      reason: 'Student showed breakthrough or significant progress',
      metadata: {
        hasConsent: sessionData.videoConsent || false, // Check consent
        highlights: summary.highlights,
        progress: summary.studentProgress.improvements,
      },
    });
  }
  
  // 3. StudyBuddy: Test prep or challenging topic
  if (
    isGrowthFeatureEnabled('studyBuddy') &&
    summary.viralSignals.hasTestTopic &&
    summary.topics.length > 0
  ) {
    opportunities.push({
      type: 'studyBuddy',
      priority: 7,
      reason: 'Challenging topic covered - student can challenge friends',
      metadata: {
        topics: summary.topics,
        difficulty: 'hard',
      },
    });
  }
  
  // 4. PrepPack: ALWAYS generate (universal value)
  if (isGrowthFeatureEnabled('prepPack')) {
    opportunities.push({
      type: 'prepPack',
      priority: 6, // Lower priority but always run
      reason: 'Universal: Generate study materials for next session',
      metadata: {
        topics: summary.topics,
        nextSteps: summary.studentProgress.nextSteps,
      },
    });
  }
  
  // 5. ParentPod: First session or milestone achieved
  if (
    isGrowthFeatureEnabled('parentPod') &&
    (sessionData.sessionCount === 1 || summary.qualityScore >= 90)
  ) {
    opportunities.push({
      type: 'parentPod',
      priority: 5,
      reason: sessionData.sessionCount === 1 
        ? 'First session - invite other parents'
        : 'Milestone achieved - share success',
      metadata: {
        isFirstSession: sessionData.sessionCount === 1,
        highlights: summary.highlights,
      },
    });
  }
  
  // Sort by priority (highest first)
  opportunities.sort((a, b) => b.priority - a.priority);
  
  logger.info('✅ Action analysis complete', {
    sessionId,
    opportunityCount: opportunities.length,
    actions: opportunities.map(o => o.type),
  });
  
  return opportunities;
}
```

**Acceptance Criteria:**
- ✅ Identifies ≥4 distinct action types per session
- ✅ Priority ranking is correct (TutorCard > ProgressReel > StudyBuddy > PrepPack)
- ✅ Feature flags respected
- ✅ Metadata includes all fields needed by executors

---

### 4. Action Executor

**File:** `functions/src/growth/actionExecutor.ts`

```typescript
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { ActionOpportunity } from './actionAnalyzer';
import { checkEligibility } from '../orchestrator/loopOrchestrator';
import { generateTutorCard } from './generateTutorCard'; // PR18
import { generatePrepPack } from './generatePrepPack'; // PR20
import { sendPushNotification } from '../notifications/pushService';

export interface ExecutionResult {
  action: string;
  status: 'success' | 'skipped' | 'failed';
  reason?: string;
  output?: any;
}

/**
 * Execute approved actions after eligibility check
 */
export async function executeActions(
  sessionId: string,
  opportunities: ActionOpportunity[],
  sessionData: any
): Promise<ExecutionResult[]> {
  
  const results: ExecutionResult[] = [];
  const db = admin.firestore();
  
  logger.info('⚡ Starting action execution', {
    sessionId,
    actionCount: opportunities.length,
  });
  
  for (const opportunity of opportunities) {
    const { type, metadata } = opportunity;
    
    try {
      // Step 1: Check eligibility via orchestrator (PR16)
      const eligible = await checkEligibility({
        userId: sessionData.tutorId,
        loopType: type,
        context: { sessionId, ...metadata },
      });
      
      if (!eligible.isEligible) {
        results.push({
          action: type,
          status: 'skipped',
          reason: eligible.reason,
        });
        
        logger.info(`⏭️ Skipped ${type}`, {
          sessionId,
          reason: eligible.reason,
        });
        
        continue;
      }
      
      // Step 2: Execute action
      let output: any;
      
      switch (type) {
        case 'tutorCard':
          // PR18: Generate shareable tutor card
          output = await generateTutorCard(sessionData.tutorId, {
            sessionId,
            highlights: metadata.highlights,
            rating: metadata.rating,
          });
          break;
        
        case 'progressReel':
          // PR19: Generate video highlight (requires consent)
          if (!metadata.hasConsent) {
            throw new Error('Video consent required');
          }
          // TODO: Implement in PR19
          output = { status: 'pending_pr19' };
          break;
        
        case 'studyBuddy':
          // PR23: Create challenge link
          // TODO: Implement in PR23
          output = { status: 'pending_pr23' };
          break;
        
        case 'prepPack':
          // PR20: Generate study materials
          output = await generatePrepPack(sessionId, {
            topics: metadata.topics,
            nextSteps: metadata.nextSteps,
          });
          break;
        
        case 'parentPod':
          // PR24: Generate group invite link
          // TODO: Implement in PR24
          output = { status: 'pending_pr24' };
          break;
        
        default:
          throw new Error(`Unknown action type: ${type}`);
      }
      
      // Step 3: Record success
      results.push({
        action: type,
        status: 'success',
        output,
      });
      
      // Step 4: Log exposure for metrics (PR17)
      await db.collection('loop_exposures').add({
        userId: sessionData.tutorId,
        loopType: type,
        context: { sessionId },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        result: 'executed',
      });
      
      logger.info(`✅ Executed ${type}`, {
        sessionId,
        output,
      });
      
    } catch (error: any) {
      results.push({
        action: type,
        status: 'failed',
        reason: error.message,
      });
      
      logger.error(`❌ Failed ${type}`, {
        sessionId,
        error: error.message,
      });
    }
  }
  
  // Step 5: Send notification to user
  await sendSessionNotification(sessionData, results);
  
  logger.info('✅ Action execution complete', {
    sessionId,
    results: results.map(r => ({ action: r.action, status: r.status })),
  });
  
  return results;
}

async function sendSessionNotification(
  sessionData: any,
  results: ExecutionResult[]
): Promise<void> {
  const successActions = results.filter(r => r.status === 'success');
  
  if (successActions.length === 0) return;
  
  const title = '✨ Session Highlights Ready!';
  const body = `Your session summary and ${successActions.length} insights are ready to view.`;
  
  await sendPushNotification({
    userId: sessionData.tutorId,
    title,
    body,
    data: {
      type: 'session_summary',
      sessionId: sessionData.sessionId,
      actions: successActions.map(a => a.action).join(','),
    },
  });
}
```

**Acceptance Criteria:**
- ✅ Actions execute within 5 min of summary
- ✅ Orchestrator eligibility checked for each action
- ✅ Failed actions don't block others
- ✅ Notification sent with actionable content
- ✅ Exposures logged for metrics

---

### 5. Prep Pack Generator

**File:** `functions/src/growth/generatePrepPack.ts`

```typescript
import { OpenAI } from 'openai';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
      "content": "Problem 1: ...\nSolution: ..."
    },
    ...
  ],
  "estimatedTime": 30
}`;

export async function generatePrepPack(
  sessionId: string,
  options: {
    topics: string[];
    nextSteps: string[];
  }
): Promise<PrepPack> {
  
  logger.info('📚 Generating prep pack', { sessionId, ...options });
  
  const prompt = PREPPACK_PROMPT
    .replace('{topics}', options.topics.join(', '))
    .replace('{nextSteps}', options.nextSteps.join('\n- '));
  
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert tutor.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    });
    
    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    const prepPack: PrepPack = {
      sessionId,
      title: result.title || 'Study Materials',
      topics: options.topics,
      materials: result.materials || [],
      nextSteps: options.nextSteps,
      estimatedTime: result.estimatedTime || 30,
      createdAt: admin.firestore.Timestamp.now(),
    };
    
    // Store in Firestore
    await admin.firestore()
      .collection('sessions')
      .doc(sessionId)
      .collection('prepPacks')
      .add(prepPack);
    
    logger.info('✅ Prep pack generated', {
      sessionId,
      materialCount: prepPack.materials.length,
    });
    
    return prepPack;
    
  } catch (error: any) {
    logger.error('❌ Prep pack generation failed', {
      sessionId,
      error: error.message,
    });
    throw error;
  }
}
```

**Acceptance Criteria:**
- ✅ Prep pack generated for every session
- ✅ Includes 4 material types (problems, guide, flashcards, videos)
- ✅ Content is relevant to session topics
- ✅ Stored in Firestore under `/sessions/{id}/prepPacks`

---

### 6. Cloud Function Orchestration

**File:** `functions/src/index.ts` (additions)

```typescript
import * as functions from 'firebase-functions';
import { transcribeSession } from './transcription/transcribeSession';
import { summarizeSession } from './ai/sessionSummarizer';
import { analyzeActions } from './growth/actionAnalyzer';
import { executeActions } from './growth/actionExecutor';

// Export transcription function
export { transcribeSession };

/**
 * Triggered after transcript is created
 * Generates AI summary
 */
export const afterTranscript = functions.firestore
  .document('transcripts/{sessionId}')
  .onCreate(async (snap, context) => {
    const sessionId = context.params.sessionId;
    const transcript = snap.data();
    
    if (transcript.status !== 'complete') {
      return; // Skip if transcription failed
    }
    
    logger.info('📝 Transcript created, starting summarization', { sessionId });
    
    try {
      await summarizeSession(sessionId);
    } catch (error: any) {
      logger.error('❌ Summarization failed', {
        sessionId,
        error: error.message,
      });
    }
  });

/**
 * Triggered after summary is created
 * Analyzes and executes viral actions
 */
export const afterSummary = functions.firestore
  .document('sessions/{sessionId}/summary/latest')
  .onCreate(async (snap, context) => {
    const sessionId = context.params.sessionId;
    const summary = snap.data();
    
    logger.info('🤖 Summary created, analyzing actions', { sessionId });
    
    try {
      // Fetch session data
      const sessionDoc = await admin.firestore()
        .collection('sessions')
        .doc(sessionId)
        .get();
      
      if (!sessionDoc.exists) {
        throw new Error(`Session not found: ${sessionId}`);
      }
      
      const sessionData = sessionDoc.data()!;
      
      // Analyze opportunities
      const opportunities = await analyzeActions(sessionId, summary, sessionData);
      
      // Execute approved actions
      await executeActions(sessionId, opportunities, sessionData);
      
    } catch (error: any) {
      logger.error('❌ Action execution failed', {
        sessionId,
        error: error.message,
      });
    }
  });
```

---

## 📱 Frontend Changes

### 1. Session Detail Screen

**File:** `app/src/screens/SessionDetailScreen.tsx` (new)

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function SessionDetailScreen() {
  const route = useRoute();
  const { sessionId } = route.params as { sessionId: string };
  
  const [summary, setSummary] = useState<any>(null);
  const [prepPack, setPrepPack] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadSessionData();
  }, [sessionId]);
  
  async function loadSessionData() {
    try {
      // Load summary
      const summaryDoc = await getDoc(
        doc(db, 'sessions', sessionId, 'summary', 'latest')
      );
      if (summaryDoc.exists()) {
        setSummary(summaryDoc.data());
      }
      
      // Load prep pack (most recent)
      const prepPackDoc = await getDoc(
        doc(db, 'sessions', sessionId, 'prepPacks', 'latest')
      );
      if (prepPackDoc.exists()) {
        setPrepPack(prepPackDoc.data());
      }
    } catch (error) {
      console.error('Error loading session data:', error);
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading session highlights...</Text>
      </View>
    );
  }
  
  if (!summary) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No summary available yet.</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      {/* Highlights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✨ Session Highlights</Text>
        {summary.highlights.map((highlight: string, i: number) => (
          <View key={i} style={styles.highlightCard}>
            <Text style={styles.highlightText}>{highlight}</Text>
          </View>
        ))}
      </View>
      
      {/* Topics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📚 Topics Covered</Text>
        <View style={styles.topicsList}>
          {summary.topics.map((topic: string, i: number) => (
            <View key={i} style={styles.topicChip}>
              <Text style={styles.topicText}>{topic}</Text>
            </View>
          ))}
        </View>
      </View>
      
      {/* Student Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Student Progress</Text>
        
        <Text style={styles.subsectionTitle}>Strengths:</Text>
        {summary.studentProgress.strengths.map((s: string, i: number) => (
          <Text key={i} style={styles.progressItem}>• {s}</Text>
        ))}
        
        <Text style={styles.subsectionTitle}>Improvements:</Text>
        {summary.studentProgress.improvements.map((s: string, i: number) => (
          <Text key={i} style={styles.progressItem}>• {s}</Text>
        ))}
        
        <Text style={styles.subsectionTitle}>Next Steps:</Text>
        {summary.studentProgress.nextSteps.map((s: string, i: number) => (
          <Text key={i} style={styles.progressItem}>• {s}</Text>
        ))}
      </View>
      
      {/* Prep Pack */}
      {prepPack && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Prep Pack for Next Session</Text>
          <Text style={styles.prepPackTitle}>{prepPack.title}</Text>
          <Text style={styles.estimatedTime}>
            ⏱️ Estimated time: {prepPack.estimatedTime} min
          </Text>
          
          {prepPack.materials.map((material: any, i: number) => (
            <TouchableOpacity key={i} style={styles.materialCard}>
              <Ionicons 
                name={getMaterialIcon(material.type)} 
                size={24} 
                color="#007AFF" 
              />
              <View style={styles.materialContent}>
                <Text style={styles.materialTitle}>{material.title}</Text>
                <Text style={styles.materialPreview}>
                  {material.content.slice(0, 100)}...
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      {/* Share Button */}
      <TouchableOpacity style={styles.shareButton}>
        <Ionicons name="share-outline" size={20} color="white" />
        <Text style={styles.shareButtonText}>Share Highlights</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function getMaterialIcon(type: string): any {
  switch (type) {
    case 'practice_problems': return 'calculator-outline';
    case 'study_guide': return 'book-outline';
    case 'flashcards': return 'layers-outline';
    case 'video_links': return 'play-circle-outline';
    default: return 'document-outline';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    marginBottom: 15,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  highlightCard: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  highlightText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  topicsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  topicChip: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  topicText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
    color: '#555',
  },
  progressItem: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
    lineHeight: 22,
  },
  prepPackTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  estimatedTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  materialCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  materialContent: {
    flex: 1,
    marginLeft: 12,
  },
  materialTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  materialPreview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  shareButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 15,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
```

---

### 2. Push Notification Handler

**File:** `app/src/services/notifications/pushHandler.ts` (update)

```typescript
import { router } from 'expo-router';

export function handleNotificationPress(notification: any) {
  const data = notification.request.content.data;
  
  switch (data.type) {
    case 'session_summary':
      // Navigate to session detail screen
      router.push({
        pathname: '/sessionDetail',
        params: { sessionId: data.sessionId },
      });
      break;
    
    // ... other notification types
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests

**File:** `functions/__tests__/transcription.test.ts`

```typescript
import { transcribeSession } from '../src/transcription/transcribeSession';
import { summarizeSession } from '../src/ai/sessionSummarizer';

describe('Transcription Pipeline', () => {
  it('should transcribe audio file <10 min', async () => {
    // Mock 60-min audio file
    const mockAudio = generateMockAudio(60);
    const startTime = Date.now();
    
    const result = await transcribeSession('test_session_1', mockAudio);
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(10 * 60 * 1000); // <10 min
    expect(result.text).toBeDefined();
    expect(result.wordCount).toBeGreaterThan(100);
  });
  
  it('should generate summary <30s', async () => {
    const startTime = Date.now();
    
    const summary = await summarizeSession('test_session_1');
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(30000); // <30s
    expect(summary.highlights).toHaveLength(3);
    expect(summary.viralSignals).toBeDefined();
  });
  
  it('should identify ≥4 action opportunities', async () => {
    const mockSummary = {
      qualityScore: 85,
      viralSignals: {
        hasBigWin: true,
        hasProgress: true,
        hasTestTopic: true,
        hasPositiveFeedback: true,
      },
    };
    
    const opportunities = await analyzeActions('test_session_1', mockSummary, {});
    
    expect(opportunities.length).toBeGreaterThanOrEqual(4);
    expect(opportunities[0].type).toBe('tutorCard'); // Highest priority
  });
});
```

---

### Integration Tests

**File:** `functions/__tests__/integration/transcription-e2e.test.ts`

```typescript
describe('Transcription E2E', () => {
  it('should process full pipeline: recording → summary → actions', async () => {
    // 1. Upload recording
    const sessionId = 'e2e_test_session';
    await uploadMockRecording(sessionId);
    
    // 2. Wait for transcription (max 10 min)
    await waitForTranscript(sessionId, 10 * 60 * 1000);
    
    // 3. Wait for summary (max 30s)
    const summary = await waitForSummary(sessionId, 30000);
    expect(summary).toBeDefined();
    
    // 4. Wait for actions (max 5 min)
    const actions = await waitForActions(sessionId, 5 * 60 * 1000);
    expect(actions.length).toBeGreaterThanOrEqual(1);
    
    // 5. Verify notification sent
    const notification = await getNotification(sessionId);
    expect(notification.title).toContain('Session Highlights Ready');
  }, 20 * 60 * 1000); // 20-min timeout
});
```

---

### Manual Testing Checklist

```markdown
## Test 1: Happy Path (High-Quality Session)

**Setup:**
- [ ] Create test session with 60-min recording
- [ ] Ensure session has 5★ rating
- [ ] Ensure transcript contains "breakthrough" or "aha moment"

**Expected:**
- [ ] Transcription completes <10 min
- [ ] Summary generated <30s after transcript
- [ ] 4+ actions identified (TutorCard, ProgressReel, StudyBuddy, PrepPack)
- [ ] Actions execute within 5 min
- [ ] Push notification sent
- [ ] Session detail screen shows all content

**Verify:**
```bash
firebase functions:log --only transcribeSession
firebase functions:log --only afterSummary
```

---

## Test 2: Cost Verification

**Run 10 sessions:**
- [ ] Check OpenAI API dashboard
- [ ] Whisper cost: ~$0.10/session (60 min × $0.006/min)
- [ ] GPT-4o-mini cost: ~$0.40/session
- [ ] **Total: <$0.50/session** ✅

---

## Test 3: Failure Handling

**Scenarios:**
- [ ] Upload invalid audio file → graceful error
- [ ] OpenAI API timeout → retry logic works
- [ ] Missing session data → summary still generated
- [ ] Action executor failure → other actions continue

---

## Test 4: Feature Flags

**Toggle each flag:**
- [ ] `growth.transcription.enabled = false` → No transcription
- [ ] `growth.agenticActions.enabled = false` → Summary only
- [ ] `growth.tutorCard.enabled = false` → TutorCard skipped
- [ ] `growth.prepPack.enabled = false` → PrepPack skipped

---

## Test 5: Performance

**Metrics:**
- [ ] P50 transcription time: <5 min
- [ ] P95 transcription time: <10 min
- [ ] P95 summary time: <30s
- [ ] P95 action execution time: <5 min
- [ ] Notification delivery: <30s after actions
```

---

## 🚀 Deployment Plan

### Phase 1: Infrastructure (Week 1)

1. **OpenAI API Setup**
   ```bash
   cd functions
   firebase functions:config:set openai.api_key="sk-..."
   ```

2. **Deploy Transcription Service**
   ```bash
   cd functions
   npm run build
   firebase deploy --only functions:transcribeSession
   ```

3. **Test with Sample Audio**
   - Upload test recording to `/recordings/test_session_1/audio.m4a`
   - Monitor logs: `firebase functions:log --only transcribeSession`
   - Verify transcript stored in Firestore

### Phase 2: Summarization (Week 1)

1. **Deploy Summary Service**
   ```bash
   firebase deploy --only functions:afterTranscript
   ```

2. **Test End-to-End**
   - Trigger full pipeline with new recording
   - Verify summary in Firestore
   - Check cost in OpenAI dashboard

### Phase 3: Actions (Week 2)

1. **Deploy Action Services**
   ```bash
   firebase deploy --only functions:afterSummary
   ```

2. **Deploy Frontend**
   ```bash
   cd app
   npx expo publish
   ```

3. **Test Actions**
   - Verify PrepPack generation
   - Verify TutorCard generation (if PR18 complete)
   - Verify notifications sent

### Phase 4: Monitoring (Week 2)

1. **Set Up Alerts**
   - OpenAI API errors
   - Transcription timeouts
   - Summary failures

2. **Create Dashboard**
   - Track cost per session
   - Track action execution rate
   - Track user engagement with summaries

---

## 📊 Success Metrics

### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Transcription time (P95) | <10 min | - |
| Summary generation (P95) | <30s | - |
| Action execution (P95) | <5 min | - |
| Cost per session | <$0.50 | - |
| Actions triggered per session | ≥4 | - |

### Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| PrepPack open rate | >60% | Track clicks in notifications |
| TutorCard share rate | >20% | Track share button clicks |
| Session summary NPS | >8 | In-app survey |

---

## 🔧 Configuration

### Feature Flags

**File:** `functions/src/utils/featureFlags.ts`

```typescript
export const GROWTH_FEATURE_FLAGS = {
  // PR20: Transcription & Agentic Actions
  transcription: {
    enabled: true,
    maxAudioDuration: 120, // minutes
    retentionDays: 90,
  },
  agenticActions: {
    enabled: true,
    maxActionsPerSession: 5,
  },
  tutorCard: { enabled: true },    // PR18
  progressReel: { enabled: false }, // PR19 (requires consent)
  studyBuddy: { enabled: false },   // PR23
  prepPack: { enabled: true },      // PR20
  parentPod: { enabled: false },    // PR24
};
```

### Environment Variables

**File:** `functions/.env`

```bash
OPENAI_API_KEY=sk-...
WHISPER_MODEL=whisper-1
GPT_MODEL=gpt-4o-mini
MAX_TRANSCRIPT_TOKENS=8000
MAX_SUMMARY_TOKENS=1000
```

---

## 🚨 Risks & Mitigations

### Risk 1: High Cost

**Issue:** Whisper + GPT-4o-mini could exceed $0.50/session at scale

**Mitigation:**
- Set cost alerts in OpenAI dashboard
- Implement daily budget caps
- Consider batching multiple sessions
- Optimize prompt lengths

### Risk 2: Long Processing Time

**Issue:** Users may not wait 10+ minutes for highlights

**Mitigation:**
- Send notification when ready (don't block UI)
- Show "Processing..." state in app
- Generate partial summary from chat history immediately

### Risk 3: Low-Quality Transcriptions

**Issue:** Background noise, accents, or poor audio quality

**Mitigation:**
- Use Whisper's `prompt` parameter for domain-specific terms
- Fallback to chat-only summary if audio quality too low
- Add manual correction UI for tutors

### Risk 4: PII in Transcripts

**Issue:** Transcripts may contain student names, school info, etc.

**Mitigation:**
- Redact PII before storing (use regex + NER)
- Set 90-day retention policy
- Implement data export/delete (PR31)

---

## 📝 Documentation Updates

### For Developers

- Update `docs/AI-FEATURES-STATUS.md` with PR20 status
- Add "Transcription Pipeline" section to `docs/ARCHITECTURE_OVERVIEW.md`
- Document Whisper API integration in `docs/QUICK-REFERENCE.md`

### For Users

- Add "Session Highlights" guide to in-app help
- Create demo video showing prep pack usage
- Add FAQ: "How long does transcription take?"

---

## ✅ Acceptance Criteria Summary

### Backend
- [ ] Transcription completes <10 min for 60-min sessions
- [ ] Summary generated <30s after transcription
- [ ] ≥4 actions identified per session
- [ ] Actions execute within 5 min of summary
- [ ] Cost <$0.50/session
- [ ] Feature flags work correctly
- [ ] Failures handled gracefully

### Frontend
- [ ] Session detail screen displays summary
- [ ] PrepPack materials viewable and shareable
- [ ] Push notification opens correct screen
- [ ] Loading states shown during processing

### Testing
- [ ] Unit tests pass (>90% coverage)
- [ ] Integration tests pass (full pipeline)
- [ ] Manual testing checklist complete
- [ ] Cost verified across 10+ sessions

### Documentation
- [ ] API docs updated
- [ ] Architecture diagram updated
- [ ] User guide created
- [ ] Testing guide complete

---

**Status:** ⏳ READY FOR IMPLEMENTATION  
**Estimated Time:** 2 weeks  
**Next PR:** PR19 (Progress Reels) - depends on PR20 transcripts


