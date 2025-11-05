/**
 * Session Transcription Service
 * PR20: Transcription & Agentic Actions
 * 
 * Transcribes tutoring session recordings using OpenAI Whisper API
 * Triggered automatically when audio files are uploaded to Storage
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { OpenAI } from 'openai';
import * as logger from 'firebase-functions/logger';

// Lazy-load OpenAI client to avoid initialization errors during deployment
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
  }
  return openaiClient;
}

export interface TranscriptMetadata {
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
 * Cloud Function triggered when recording is uploaded to Storage
 * Path: /recordings/{sessionId}/audio.m4a
 * 
 * @param object - Storage object metadata
 */
export const transcribeSession = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes (Whisper can take time for long recordings)
    memory: '1GB',
  })
  .storage
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name;
    
    // Only process audio files in /recordings/{sessionId}/ directory
    if (!filePath || !filePath.startsWith('recordings/')) {
      logger.info('Skipping non-recording file:', filePath);
      return;
    }
    
    // Support multiple audio formats
    const supportedFormats = ['.m4a', '.mp3', '.wav', '.mp4'];
    const hasValidFormat = supportedFormats.some(format => filePath.endsWith(format));
    
    if (!hasValidFormat) {
      logger.info('Skipping non-audio file:', filePath);
      return;
    }
    
    // Extract sessionId from path: recordings/{sessionId}/audio.m4a
    const pathParts = filePath.split('/');
    if (pathParts.length !== 3) {
      logger.warn('Invalid recording path structure:', filePath);
      return;
    }
    
    const sessionId = pathParts[1];
    
    logger.info('🎙️ Starting transcription', { 
      sessionId, 
      filePath,
      fileSize: object.size,
    });
    
    const db = admin.firestore();
    const transcriptRef = db.collection('transcripts').doc(sessionId);
    
    try {
      // Check if transcript already exists (avoid duplicate processing)
      const existingTranscript = await transcriptRef.get();
      if (existingTranscript.exists && existingTranscript.data()?.status === 'complete') {
        logger.info('Transcript already exists, skipping', { sessionId });
        return;
      }
      
      // Mark as processing
      await transcriptRef.set({
        sessionId,
        status: 'processing',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // Download audio file from Storage
      const bucket = admin.storage().bucket(object.bucket);
      const file = bucket.file(filePath);
      
      logger.info('📥 Downloading audio...', { sessionId });
      const [audioBuffer] = await file.download();
      
      logger.info('📥 Downloaded audio', {
        sessionId,
        sizeKB: (audioBuffer.length / 1024).toFixed(2),
      });
      
      // Prepare file for Whisper API
      // OpenAI SDK expects a File-like object or readable stream
      const fileExtension = filePath.split('.').pop() || 'm4a';
      const filename = `audio.${fileExtension}`;
      
      // Create a File object from Buffer
      // Cast Buffer to any to bypass type checking - OpenAI SDK handles it
      const audioFile = new File([audioBuffer as any], filename, {
        type: `audio/${fileExtension}`,
      }) as any;
      
      // Call Whisper API
      const startTime = Date.now();
      logger.info('🔄 Calling Whisper API...', { sessionId });
      
      const openai = getOpenAI();
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en', // Can detect automatically if omitted
        response_format: 'verbose_json', // Get metadata including duration
      });
      
      const duration = Date.now() - startTime;
      const wordCount = transcription.text.split(/\s+/).filter(w => w.length > 0).length;
      
      logger.info('✅ Transcription complete', {
        sessionId,
        durationMs: duration,
        wordCount,
        language: transcription.language,
        audioDuration: transcription.duration,
      });
      
      // Store transcript in Firestore
      const transcriptData: TranscriptMetadata = {
        sessionId,
        text: transcription.text,
        duration: transcription.duration || 0,
        wordCount,
        language: transcription.language || 'en',
        model: 'whisper-1',
        createdAt: admin.firestore.Timestamp.now(),
        status: 'complete',
      };
      
      await transcriptRef.set(transcriptData);
      
      // Update session document with transcript flag
      const sessionRef = db.collection('sessions').doc(sessionId);
      const sessionDoc = await sessionRef.get();
      
      if (sessionDoc.exists) {
        await sessionRef.update({
          hasTranscript: true,
          transcriptWordCount: wordCount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        logger.warn('Session document not found', { sessionId });
      }
      
      logger.info('💾 Transcript stored in Firestore', { sessionId });
      
    } catch (error: any) {
      logger.error('❌ Transcription failed', {
        sessionId,
        error: error.message,
        stack: error.stack,
      });
      
      // Store error state
      await transcriptRef.set({
        sessionId,
        status: 'failed',
        error: error.message,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // Don't throw - we want to handle gracefully
      return;
    }
  });

