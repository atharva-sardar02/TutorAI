/**
 * Global Picker State Manager
 * 
 * Prevents concurrent picker calls (image/video/audio/document)
 * Manages a shared mutex-like lock for all picker operations
 */

import { Alert } from 'react-native';

type PickerType = 'camera' | 'gallery' | 'video' | 'audio' | 'document';

interface PickerState {
  isPickerActive: boolean;
  currentPickerType: PickerType | null;
  listeners: Set<(isActive: boolean) => void>;
}

const state: PickerState = {
  isPickerActive: false,
  currentPickerType: null,
  listeners: new Set(),
};

/**
 * Subscribe to picker state changes
 */
export function subscribeToPickerState(callback: (isActive: boolean) => void): () => void {
  state.listeners.add(callback);
  return () => state.listeners.delete(callback);
}

/**
 * Notify all listeners of state change
 */
function notifyListeners(isActive: boolean) {
  state.listeners.forEach(callback => callback(isActive));
}

/**
 * Try to acquire picker lock
 * Returns true if lock acquired, false if another picker is active
 */
export function acquirePickerLock(pickerType: PickerType): boolean {
  if (state.isPickerActive) {
    console.warn(
      `⚠️ Picker already in progress (${state.currentPickerType}), ` +
      `ignoring ${pickerType} request`
    );
    showPickerBusyMessage(state.currentPickerType || 'unknown');
    return false;
  }

  console.log(`🔒 Acquired picker lock for: ${pickerType}`);
  state.isPickerActive = true;
  state.currentPickerType = pickerType;
  notifyListeners(true);
  return true;
}

/**
 * Release picker lock
 */
export function releasePickerLock() {
  if (state.isPickerActive) {
    console.log(`🔓 Released picker lock (was ${state.currentPickerType})`);
    state.isPickerActive = false;
    state.currentPickerType = null;
    notifyListeners(false);
  }
}

/**
 * Check if any picker is currently active
 */
export function isPickerActive(): boolean {
  return state.isPickerActive;
}

/**
 * Get current picker type
 */
export function getCurrentPickerType(): PickerType | null {
  return state.currentPickerType;
}

/**
 * Show user-friendly message when picker is busy
 */
function showPickerBusyMessage(pickerType: string) {
  const typeMap: Record<string, string> = {
    camera: '📸 Camera',
    gallery: '🖼️ Gallery',
    video: '🎥 Video Picker',
    audio: '🎤 Audio Picker',
    document: '📄 Document Picker',
  };

  const displayName = typeMap[pickerType] || 'File Picker';

  // Silently ignore instead of showing alert to prevent UI spam
  console.info(`⏳ Please wait, ${displayName} is already open`);
}

/**
 * Safely execute a picker operation with automatic lock management
 * 
 * @param pickerType - Type of picker to execute
 * @param pickerFn - Async function that launches the picker
 * @returns Result from pickerFn or null if lock not acquired
 */
export async function executePickerWithLock<T>(
  pickerType: PickerType,
  pickerFn: () => Promise<T>
): Promise<T | null> {
  if (!acquirePickerLock(pickerType)) {
    return null;
  }

  try {
    // Add small delay to ensure UI is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log(`▶️ Executing picker: ${pickerType}`);
    const result = await pickerFn();
    
    console.log(`✅ Picker completed: ${pickerType}`);
    return result;
  } catch (error: any) {
    console.error(`❌ Picker error (${pickerType}):`, error);
    
    // Don't show alert for cancelled picks
    if (!error.message?.includes('User cancelled')) {
      // Alert.alert('Picker Error', `Failed to open ${pickerType}. Please try again.`);
    }
    
    throw error;
  } finally {
    releasePickerLock();
  }
}

