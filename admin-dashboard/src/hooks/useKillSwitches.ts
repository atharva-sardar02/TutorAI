import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { KillSwitch } from '@/types/system';

/**
 * Fetch all feature flags (kill switches)
 */
async function fetchKillSwitches(): Promise<KillSwitch[]> {
  try {
    const flagsSnapshot = await getDocs(collection(db, 'feature_flags'));
    const killSwitches: KillSwitch[] = [];

    flagsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Convert feature flags to kill switch format
      if (data && typeof data === 'object') {
        Object.entries(data).forEach(([key, value]: [string, any]) => {
          if (typeof value === 'object' && 'enabled' in value) {
            killSwitches.push({
              id: `${doc.id}.${key}`,
              name: key,
              description: getFeatureDescription(key),
              enabled: value.enabled,
              category: getFeatureCategory(key),
              impact: getFeatureImpact(key),
              updatedAt: Timestamp.now(),
              updatedBy: 'system',
            });
          }
        });
      }
    });

    return killSwitches;
  } catch (error) {
    console.error('Error fetching kill switches:', error);
    throw error;
  }
}

/**
 * Toggle a kill switch (feature flag)
 */
async function toggleKillSwitch(
  switchId: string,
  enabled: boolean,
  adminId: string
): Promise<void> {
  try {
    // Parse switchId: "doc.field"
    const [docId, fieldPath] = switchId.split('.');
    
    const flagRef = doc(db, 'feature_flags', docId);
    await updateDoc(flagRef, {
      [`${fieldPath}.enabled`]: enabled,
    });

    console.log(`Kill switch ${switchId} ${enabled ? 'enabled' : 'disabled'} by ${adminId}`);
  } catch (error) {
    console.error('Error toggling kill switch:', error);
    throw error;
  }
}

/**
 * Get feature description
 */
function getFeatureDescription(featureName: string): string {
  const descriptions: Record<string, string> = {
    activityFeed: 'Show active sessions by subject in real-time',
    transcription: 'Convert audio sessions to text using Whisper API',
    agenticActions: 'AI-driven actions triggered by session analysis',
    prepPack: 'AI-generated session preparation materials',
    tutorCard: 'Shareable tutor profile cards for referrals',
    progressReel: 'Privacy-compliant progress story carousels',
    studyBuddy: 'Student-to-student peer challenge system',
    parentPod: 'Parent group invite links for communities',
    cohortRooms: 'Real-time social presence for groups',
    parentChildChallenge: 'Parent-child challenge variant',
    tutorPeer: 'Tutor-to-tutor referral system',
    'fraud.detectionEnabled': 'Fraud detection and anomaly scoring',
    'fraud.captchaEnabled': 'hCaptcha verification for suspicious signups',
  };
  return descriptions[featureName] || 'Feature toggle';
}

/**
 * Get feature category
 */
function getFeatureCategory(featureName: string): 'feature' | 'loop' | 'system' {
  if (featureName.startsWith('fraud.')) return 'system';
  if (['studyBuddy', 'parentPod', 'tutorPeer', 'parentChildChallenge'].includes(featureName)) {
    return 'loop';
  }
  return 'feature';
}

/**
 * Get feature impact level
 */
function getFeatureImpact(featureName: string): 'low' | 'medium' | 'high' | 'critical' {
  const criticalFeatures = ['fraud.detectionEnabled', 'transcription'];
  const highFeatures = ['agenticActions', 'progressReel', 'studyBuddy'];
  const mediumFeatures = ['tutorCard', 'prepPack', 'parentPod', 'tutorPeer'];
  
  if (criticalFeatures.includes(featureName)) return 'critical';
  if (highFeatures.includes(featureName)) return 'high';
  if (mediumFeatures.includes(featureName)) return 'medium';
  return 'low';
}

/**
 * Hook to fetch kill switches
 */
export function useKillSwitches() {
  return useQuery({
    queryKey: ['killSwitches'],
    queryFn: fetchKillSwitches,
    refetchInterval: 60000, // Refresh every 60 seconds
  });
}

/**
 * Hook to toggle kill switch
 */
export function useToggleKillSwitch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ switchId, enabled, adminId }: { switchId: string; enabled: boolean; adminId: string }) =>
      toggleKillSwitch(switchId, enabled, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['killSwitches'] });
    },
  });
}

