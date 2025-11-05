/**
 * Hook: Picker State Subscription
 * 
 * Subscribes to global picker state and triggers re-renders
 * Allows components to disable UI while a picker is active
 */

import { useState, useEffect } from 'react';
import { isPickerActive, subscribeToPickerState } from '@/utils/pickerState';

export interface UsePickerStateResult {
  isPickerActive: boolean;
}

/**
 * Subscribe to picker state changes
 * Re-renders component when any picker becomes active/inactive
 */
export function usePickerState(): UsePickerStateResult {
  const [pickerActive, setPickerActive] = useState(isPickerActive());

  useEffect(() => {
    const unsubscribe = subscribeToPickerState((isActive) => {
      setPickerActive(isActive);
    });

    return unsubscribe;
  }, []);

  return { isPickerActive: pickerActive };
}

