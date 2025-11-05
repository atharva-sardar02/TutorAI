import * as FileSystem from 'expo-file-system';

export interface CompressionResult {
  uri: string;
  sizeBytes: number;
  duration: number;
}

/**
 * Compress video to target size
 * 
 * MVP: Pass-through implementation (no compression)
 * Future: Integrate expo-video-thumbnails or FFmpeg for actual compression
 * 
 * @param uri - Local file URI
 * @param targetSizeMB - Target size in megabytes (default: 50MB)
 * @returns Compression result with URI and metadata
 */
export async function compressVideo(uri: string, targetSizeMB: number = 50): Promise<CompressionResult> {
  console.log('ℹ️ Video compression not implemented, using original file');
  console.log(`   Target size: ${targetSizeMB}MB (future enhancement)`);
  
  try {
    // Get file size
    const fileInfo = await FileSystem.getInfoAsync(uri);
    const sizeBytes = fileInfo.exists ? (fileInfo.size || 0) : 0;
    
    console.log(`   Original size: ${(sizeBytes / 1024 / 1024).toFixed(2)}MB`);
    
    // Check if file exceeds target
    if (sizeBytes > targetSizeMB * 1024 * 1024) {
      console.warn(`⚠️ File exceeds ${targetSizeMB}MB target. Compression not yet implemented.`);
    }
    
    return {
      uri,
      sizeBytes,
      duration: 0, // Duration should be extracted in lectureService instead
    };
  } catch (error) {
    console.error('❌ Failed to get file info:', error);
    // Return original URI even on error
    return {
      uri,
      sizeBytes: 0,
      duration: 0,
    };
  }
}

/**
 * Compress audio to target size
 * 
 * MVP: Pass-through implementation (no compression)
 * Future: Integrate audio compression library
 * 
 * @param uri - Local file URI
 * @param targetSizeMB - Target size in megabytes (default: 50MB)
 * @returns Compression result with URI and metadata
 */
export async function compressAudio(uri: string, targetSizeMB: number = 50): Promise<CompressionResult> {
  console.log('ℹ️ Audio compression not implemented, using original file');
  
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    const sizeBytes = fileInfo.exists ? (fileInfo.size || 0) : 0;
    
    return {
      uri,
      sizeBytes,
      duration: 0,
    };
  } catch (error) {
    console.error('❌ Failed to get file info:', error);
    return {
      uri,
      sizeBytes: 0,
      duration: 0,
    };
  }
}

