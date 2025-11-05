import { getFunctions, httpsCallable } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as Device from 'expo-device';
import type {
  CreateReferralLinkRequest,
  CreateReferralLinkResponse,
  TrackReferralClickRequest,
  ReferralContext,
} from '@/types/growthTypes';

const functions = getFunctions();
const REFERRAL_STORAGE_KEY = '@messageai_referral_context';

/**
 * Track progress reel events
 * PR19: Progress Reels Analytics
 * 
 * @param event - Event type
 * @param metadata - Event metadata
 */
export async function trackReelEvent(
  event: 'reel_generated' | 'reel_shared' | 'reel_viewed' | 'consent_granted' | 'consent_revoked',
  metadata: {
    reelId?: string;
    sessionId?: string;
    userId?: string;
    consentType?: string;
  }
): Promise<void> {
  // TODO: Implement analytics tracking (PR17 integration)
  console.log('📊 Analytics event:', event, metadata);
}

/**
 * Create referral link (called when user shares)
 * 
 * Usage:
 * const { url, referralId } = await createReferralLink({
 *   loopType: 'tutor_card',
 *   targetType: 'parent',
 *   metadata: { channel: 'whatsapp' }
 * });
 */
export async function createReferralLink(
  params: CreateReferralLinkRequest
): Promise<CreateReferralLinkResponse> {
  const createFn = httpsCallable<CreateReferralLinkRequest, CreateReferralLinkResponse>(
    functions,
    'createReferralLink'
  );
  
  const result = await createFn(params);
  const data = result.data;
  
  console.log('✅ Referral link created:', {
    referralId: data.referralId.substring(0, 8),
    provider: data.provider,
  });
  
  return {
    referralId: data.referralId,
    url: data.url,
    provider: data.provider,
  };
}

/**
 * Handle incoming deep link (first app open or link click)
 * 
 * Called from: app/_layout.tsx on app launch
 * 
 * Flow:
 * 1. Parse referral params from URL
 * 2. Store context in AsyncStorage (install-deferred)
 * 3. Track click event to backend
 */
export async function handleDeepLink(url: string): Promise<void> {
  console.log('🔗 Handling deep link:', url);
  
  const parsed = Linking.parse(url);
  
  // Check if this is a referral link
  // Format: messageai://r/{referralId}?sig={signature}&loop={loopType}
  if (parsed.path?.startsWith('r/')) {
    const referralId = parsed.path.replace('r/', '');
    const signature = parsed.queryParams?.sig as string;
    const loopType = parsed.queryParams?.loop as string;
    const experimentId = parsed.queryParams?.exp as string | undefined;
    const variantId = parsed.queryParams?.var as string | undefined;
    
    if (referralId && signature && loopType) {
      // Store referral context for later (install-deferred attribution)
      const context: ReferralContext = {
        referralId,
        loopType,
        signature,
        clickedAt: Date.now(),
        experimentId,
        variantId,
      };
      
      await AsyncStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(context));
      console.log('💾 Referral context stored:', {
        referralId: referralId.substring(0, 8),
        loopType,
      });
      
      // Track click event
      await trackReferralClickInternal(context);
    } else {
      console.warn('⚠️ Invalid referral link format:', { referralId, signature, loopType });
    }
  }
}

/**
 * Track referral click (internal)
 * 
 * Sends click event to backend for attribution tracking
 */
async function trackReferralClickInternal(context: ReferralContext): Promise<void> {
  try {
    const trackFn = httpsCallable<TrackReferralClickRequest, { success: boolean }>(
      functions,
      'trackReferralClick'
    );
    
    // Collect device hints for fraud detection
    const deviceHints = {
      deviceId: Device.osBuildId || Device.modelId || 'unknown',
      userAgent: `${Device.osName}/${Device.osVersion}`,
      platform: Device.osName?.toLowerCase().includes('ios') ? 'ios' as const : 'android' as const,
    };
    
    await trackFn({
      referralId: context.referralId,
      loopType: context.loopType,
      signature: context.signature,
      deviceHints,
    });
    
    console.log('✅ Referral click tracked:', {
      referralId: context.referralId.substring(0, 8),
    });
  } catch (error: any) {
    console.error('❌ Failed to track referral click:', error.message);
    // Don't throw - allow app to continue even if tracking fails
  }
}

/**
 * Track referral click (public export for deep link handlers)
 * 
 * @param referralId - Referral ID from URL
 * @param loopType - Type of viral loop
 * @param metadata - Additional metadata (optional)
 */
export async function trackReferralClick(
  referralId: string,
  loopType: string,
  metadata: Record<string, any>
): Promise<void> {
  try {
    const trackFn = httpsCallable<TrackReferralClickRequest, { success: boolean }>(
      functions,
      'trackReferralClick'
    );
    
    // Collect device hints for fraud detection
    const deviceHints = {
      deviceId: Device.osBuildId || Device.modelId || 'unknown',
      userAgent: `${Device.osName}/${Device.osVersion}`,
      platform: Device.osName?.toLowerCase().includes('ios') ? 'ios' as const : 'android' as const,
    };
    
    await trackFn({
      referralId,
      loopType,
      signature: '', // Not needed for non-link clicks
      deviceHints,
      ...metadata,
    });
    
    console.log('✅ Referral click tracked:', {
      referralId: referralId.substring(0, 8),
      loopType,
    });
  } catch (error: any) {
    console.error('❌ Failed to track referral click:', error.message);
    // Don't throw - allow app to continue even if tracking fails
  }
}

/**
 * Get stored referral context (for signup attribution)
 * 
 * Called during signup flow to associate new user with referral
 * 
 * Returns null if:
 * - No context stored
 * - Context expired (>30 days)
 */
export async function getReferralContext(): Promise<ReferralContext | null> {
  try {
    const stored = await AsyncStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!stored) {
      console.log('ℹ️ No referral context found');
      return null;
    }
    
    const context = JSON.parse(stored) as ReferralContext;
    
    // Check if context is still valid (within 30 days)
    const age = Date.now() - context.clickedAt;
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    if (age > maxAge) {
      console.log('⏰ Referral context expired');
      await AsyncStorage.removeItem(REFERRAL_STORAGE_KEY);
      return null;
    }
    
    console.log('✅ Referral context retrieved:', {
      referralId: context.referralId.substring(0, 8),
      age: Math.floor(age / (1000 * 60 * 60)), // hours
    });
    
    return context;
  } catch (error: any) {
    console.error('❌ Failed to get referral context:', error.message);
    return null;
  }
}

/**
 * Clear referral context (after signup)
 * 
 * Called after successful signup to clean up stored context
 */
export async function clearReferralContext(): Promise<void> {
  try {
    await AsyncStorage.removeItem(REFERRAL_STORAGE_KEY);
    console.log('🗑️ Referral context cleared');
  } catch (error: any) {
    console.error('❌ Failed to clear referral context:', error.message);
  }
}

/**
 * Share referral link via native share sheet
 * 
 * Usage:
 * await shareReferralLink({
 *   url: 'https://messageai.app/r/ref_123...',
 *   title: 'Join me on MessageAI!',
 *   message: 'Check out my tutoring profile'
 * });
 */
export async function shareReferralLink(params: {
  url: string;
  title?: string;
  message?: string;
}): Promise<{ shared: boolean; channel?: string }> {
  try {
    const { Share } = await import('react-native');
    
    const result = await Share.share({
      title: params.title || 'Join MessageAI',
      message: params.message
        ? `${params.message}\n\n${params.url}`
        : params.url,
      url: params.url, // iOS only
    });
    
    if (result.action === Share.sharedAction) {
      console.log('✅ Link shared successfully');
      return {
        shared: true,
        channel: result.activityType || 'unknown',
      };
    } else if (result.action === Share.dismissedAction) {
      console.log('ℹ️ Share sheet dismissed');
      return { shared: false };
    }
    
    return { shared: false };
  } catch (error: any) {
    console.error('❌ Share failed:', error.message);
    return { shared: false };
  }
}

/**
 * Copy referral link to clipboard
 * 
 * Fallback if native share fails
 */
export async function copyReferralLink(url: string): Promise<boolean> {
  try {
    const Clipboard = await import('expo-clipboard');
    await Clipboard.setStringAsync(url);
    console.log('✅ Link copied to clipboard');
    return true;
  } catch (error: any) {
    console.error('❌ Copy failed:', error.message);
    return false;
  }
}

