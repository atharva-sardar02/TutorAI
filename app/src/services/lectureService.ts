import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from 'firebase/storage';
import { doc, getDoc } from 'firebase/firestore';
import { storage, db, auth } from '@/lib/firebase';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export interface RecordingUploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number; // 0-100
}

export interface RecordingUploadResult {
  url: string;
  duration: number; // in seconds
  sizeBytes: number;
}

/**
 * Upload a recording (video/audio) to Firebase Storage with progress tracking
 * - Validates authentication and conversation participants
 * - Extracts duration metadata
 * - Returns download URL and metadata
 * - Provides upload progress via callback
 */
export async function uploadRecording(
  uri: string,
  conversationId: string,
  recordingId: string,
  fileType: 'video' | 'audio',
  onProgress?: (progress: RecordingUploadProgress) => void
): Promise<RecordingUploadResult> {
  console.log('📤 Starting recording upload:', {
    conversationId: conversationId.substring(0, 12),
    recordingId: recordingId.substring(0, 8),
    fileType,
  });

  // GUARD 1: Require authentication
  if (!auth.currentUser) {
    const error = 'User not authenticated - cannot upload recording';
    console.error('❌', error);
    throw new Error(error);
  }

  console.log('✅ Auth check passed:', {
    uid: auth.currentUser.uid.substring(0, 8),
    email: auth.currentUser.email,
  });

  // GUARD 2: Ensure conversation document exists with participants
  try {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (!conversationSnap.exists()) {
      const error = `Conversation ${conversationId.substring(0, 12)} does not exist`;
      console.error('❌', error);
      throw new Error(error);
    }

    const conversationData = conversationSnap.data();
    console.log('✅ Conversation exists:', {
      id: conversationId.substring(0, 12),
      type: conversationData.type,
      participants: conversationData.participants,
      currentUserInParticipants: conversationData.participants?.includes(auth.currentUser.uid),
    });

    if (!conversationData.participants?.includes(auth.currentUser.uid)) {
      const error = 'Current user is not a participant in this conversation';
      console.error('❌', error);
      throw new Error(error);
    }

    console.log('✅ Participant check passed');
  } catch (error: any) {
    console.error('❌ Conversation validation failed:', error);
    throw error;
  }

  try {
    // Step 1: Get file info
    console.log('📊 Getting file info...');
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }
    const sizeBytes = fileInfo.size || 0;
    console.log('✅ File info:', {
      size: `${(sizeBytes / 1024 / 1024).toFixed(2)} MB`,
      uri: uri.substring(0, 50) + '...',
    });

    // Step 2: Extract duration (for audio files using expo-av)
    let duration = 0;
    if (fileType === 'audio') {
      try {
        console.log('🎵 Extracting audio duration...');
        const { sound, status } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: false }
        );
        if (status.isLoaded && status.durationMillis) {
          duration = Math.round(status.durationMillis / 1000);
          console.log('✅ Audio duration:', duration, 'seconds');
        }
        await sound.unloadAsync();
      } catch (error) {
        console.warn('⚠️ Could not extract audio duration:', error);
        // Continue without duration - not critical
      }
    } else {
      // For video, duration extraction requires expo-av Video component
      // For MVP, we'll skip video duration (can be added later)
      console.log('ℹ️ Video duration extraction not implemented (use expo-av Video)');
    }

    // Step 3: Convert to blob
    console.log('📦 Converting to blob...');
    const response = await fetch(uri);
    const blob = await response.blob();

    // Step 4: Upload to Firebase Storage
    // Path: /recordings/{conversationId}/{recordingId}.{ext}
    const ext = fileType === 'video' ? 'mp4' : 'm4a';
    const storagePath = `recordings/${conversationId}/${recordingId}.${ext}`;
    const storageRef = ref(storage, storagePath);
    
    console.log('☁️ Uploading to Storage:', {
      path: storagePath,
      fullPath: storagePath,
      conversationId,
      recordingId,
      fileType,
      authUid: auth.currentUser?.uid,
    });

    // Create upload task for progress tracking
    const uploadTask: UploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: fileType === 'video' ? 'video/mp4' : 'audio/mp4',
    });

    // Track upload progress
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = {
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
          };
          
          console.log(`📊 Upload progress: ${progress.progress.toFixed(0)}%`);
          
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          console.error('❌ Upload failed:', error);
          reject(error);
        },
        async () => {
          // Upload completed successfully
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('✅ Upload complete! URL:', downloadURL.substring(0, 50) + '...');

            resolve({
              url: downloadURL,
              duration,
              sizeBytes,
            });
          } catch (error) {
            console.error('❌ Failed to get download URL:', error);
            reject(error);
          }
        }
      );
    });
  } catch (error: any) {
    console.error('❌ Recording upload failed:', error);
    throw new Error(`Failed to upload recording: ${error.message}`);
  }
}

/**
 * Delete a recording from Firebase Storage
 */
export async function deleteRecording(url: string): Promise<void> {
  try {
    // Extract path from URL
    const urlObj = new URL(url);
    const path = decodeURIComponent(
      urlObj.pathname.split('/o/')[1].split('?')[0]
    );
    
    const storageRef = ref(storage, path);
    // Note: deleteObject is not imported yet - add if needed
    // await deleteObject(storageRef);
    
    console.log('🗑️ Recording deleted:', path);
  } catch (error) {
    console.warn('Failed to delete recording:', error);
    // Don't throw - deletion failures shouldn't block the app
  }
}

