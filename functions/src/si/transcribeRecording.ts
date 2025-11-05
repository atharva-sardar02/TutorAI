/**
 * Session Intelligence: Recording Transcription (SI-04)
 * 
 * Transcribes uploaded lecture recordings using OpenAI Whisper API
 * Triggered automatically when recordings are uploaded to Storage
 * Storage path: /recordings/{conversationId}/{recordingId}.{ext}
 * 
 * Reuses existing Whisper integration from PR20 (transcribeSession)
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { OpenAI } from 'openai';
import * as logger from 'firebase-functions/logger';
import { logSIEvent, startTimer, elapsedMs, categorizeError } from './analyticsLogger';

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

export interface TranscriptData {
  recordingId: string;
  conversationId: string;
  text: string;
  summary?: string; // Will be added later by summarizer
  wordCount: number;
  duration: number;
  language: string;
  processedAt: admin.firestore.Timestamp;
  status: 'processing' | 'complete' | 'failed';
  error?: string;
}

/**
 * Cloud Function triggered when recording is uploaded to Storage
 * Path: /recordings/{conversationId}/{recordingId}.{ext}
 * 
 * @param object - Storage object metadata
 */
export const transcribeRecording = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes (Whisper can be slow for long recordings)
    memory: '1GB',
  })
  .storage
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name;
    
    // Only process recordings in /recordings/{conversationId}/{recordingId}.{ext}
    if (!filePath || !filePath.startsWith('recordings/')) {
      logger.info('Skipping non-recording file:', filePath);
      return;
    }
    
    // Support multiple audio/video formats
    const supportedFormats = ['.m4a', '.mp3', '.wav', '.mp4', '.webm', '.mpeg'];
    const hasValidFormat = supportedFormats.some(format => filePath.toLowerCase().endsWith(format));
    
    if (!hasValidFormat) {
      logger.info('Skipping unsupported format:', filePath);
      return;
    }
    
    // Extract conversationId and recordingId from path
    // Expected: recordings/{conversationId}/{recordingId}.mp4
    const pathParts = filePath.split('/');
    if (pathParts.length !== 3) {
      logger.warn('Invalid recording path structure:', filePath);
      return;
    }
    
    const conversationId = pathParts[1];
    const fileNameWithExt = pathParts[2];
    const recordingId = fileNameWithExt.split('.')[0]; // Remove extension
    
    logger.info('🎙️ Starting recording transcription', { 
      conversationId,
      recordingId,
      filePath,
      fileSize: object.size,
    });
    
    const db = admin.firestore();
    // Store transcript at: /transcripts/{conversationId}/{recordingId}
    const transcriptRef = db.collection('transcripts').doc(conversationId).collection('recordings').doc(recordingId);
    
    try {
      // Check if transcript already exists (avoid duplicate processing)
      const existingTranscript = await transcriptRef.get();
      if (existingTranscript.exists && existingTranscript.data()?.status === 'complete') {
        logger.info('Transcript already exists, skipping', { conversationId, recordingId });
        return;
      }
      
      // Mark as processing
      await transcriptRef.set({
        recordingId,
        conversationId,
        status: 'processing',
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // Download audio/video file from Storage
      const bucket = admin.storage().bucket(object.bucket);
      const file = bucket.file(filePath);
      
      logger.info('📥 Downloading recording...', { conversationId, recordingId });
      const [audioBuffer] = await file.download();
      
      logger.info('📥 Downloaded recording', {
        conversationId,
        recordingId,
        sizeMB: (audioBuffer.length / 1024 / 1024).toFixed(2),
      });
      
      // Check file size (Whisper API has 25MB limit)
      const fileSizeMB = audioBuffer.length / 1024 / 1024;
      if (fileSizeMB > 25) {
        logger.warn('File too large for Whisper API', {
          conversationId,
          recordingId,
          sizeMB: fileSizeMB.toFixed(2),
        });
        
        await transcriptRef.set({
          recordingId,
          conversationId,
          status: 'failed',
          error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds Whisper API limit (25MB)`,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        return;
      }
      
      // Prepare file for Whisper API
      const fileExtension = filePath.split('.').pop() || 'm4a';
      const filename = `recording.${fileExtension}`;
      
      // Create a File object from Buffer
      // OpenAI SDK expects File-like object
      const audioFile = new File([audioBuffer as any], filename, {
        type: `audio/${fileExtension}`,
      }) as any;
      
      // Call Whisper API
      const startTime = Date.now();
      logger.info('🔄 Calling Whisper API...', { conversationId, recordingId });
      
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
        conversationId,
        recordingId,
        wordCount,
        durationSec: (duration / 1000).toFixed(1),
        audioDurationSec: transcription.duration || 0,
      });
      
      // Store transcript in Firestore
      const transcriptData: TranscriptData = {
        recordingId,
        conversationId,
        text: transcription.text,
        wordCount,
        duration: transcription.duration || 0,
        language: transcription.language || 'en',
        processedAt: admin.firestore.Timestamp.now(),
        status: 'complete',
      };
      
      await transcriptRef.set(transcriptData);
      
      // Update recording document with transcript flag
      const recordingRef = db.collection('recordings').doc(conversationId).collection('recordings').doc(recordingId);
      const recordingDoc = await recordingRef.get();
      
      if (recordingDoc.exists) {
        await recordingRef.update({
          transcriptId: recordingId,
          transcriptWordCount: wordCount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.info('📝 Updated recording document with transcript reference', { conversationId, recordingId });
      } else {
        logger.warn('Recording document not found, creating placeholder', { conversationId, recordingId });
        // Create recording document if it doesn't exist
        await recordingRef.set({
          id: recordingId,
          conversationId,
          storageUrl: `gs://${object.bucket}/${filePath}`,
          fileType: fileExtension === 'mp4' || fileExtension === 'webm' ? 'video' : 'audio',
          transcriptId: recordingId,
          transcriptWordCount: wordCount,
          uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      
      logger.info('💾 Transcript stored in Firestore', { conversationId, recordingId });
      
      // Log cost (Whisper pricing: $0.006 per minute)
      const audioDurationMin = (transcription.duration || 0) / 60;
      const estimatedCost = audioDurationMin * 0.006;
      logger.info('💰 Transcription cost', {
        conversationId,
        recordingId,
        durationMin: audioDurationMin.toFixed(2),
        costUSD: estimatedCost.toFixed(4),
      });
      
    } catch (error: any) {
      logger.error('❌ Transcription failed', {
        conversationId,
        recordingId,
        error: error.message,
        stack: error.stack,
      });
      
      // Store error state
      await transcriptRef.set({
        recordingId,
        conversationId,
        status: 'failed',
        error: error.message,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      // Don't throw - we want to handle gracefully
      return;
    }
  });

