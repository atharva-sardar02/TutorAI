import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

/**
 * Configure how notifications are displayed in foreground
 */
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;
    const conversationId = data?.conversationId as string | undefined;

    // Check if user is currently viewing this conversation
    const shouldSuppress = await shouldSuppressNotification(conversationId);

    console.log('🔔 Notification received:', {
      conversationId: conversationId?.substring(0, 12),
      shouldSuppress,
      title: notification.request.content.title,
    });

    return {
      shouldShowAlert: !shouldSuppress,
      shouldPlaySound: !shouldSuppress,
      shouldSetBadge: false,
      shouldShowBanner: !shouldSuppress,
      shouldShowList: !shouldSuppress,
    };
  },
});

/**
 * Check if notification should be suppressed
 * Suppress if user is currently viewing the conversation
 */
async function shouldSuppressNotification(conversationId?: string): Promise<boolean> {
  if (!conversationId || !auth.currentUser) return false;

  try {
    // Get current user's presence to check activeConversationId
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const activeConversationId = userData.presence?.activeConversationId;

      // Suppress if user is currently viewing this conversation
      const suppress = activeConversationId === conversationId;

      if (suppress) {
        console.log('🔕 Notification suppressed - user viewing conversation');
      }

      return suppress;
    }
  } catch (error) {
    console.warn('Failed to check notification suppression:', error);
  }

  return false;
}

/**
 * Register device for remote push notifications
 * Gets Expo push token and stores in Firestore for Cloud Functions to use
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  try {
    // Check if physical device (push doesn't work on simulator)
    if (!Device.isDevice) {
      console.warn('⚠️ Push notifications require a physical device or dev build');
      console.warn('   Simulator/Expo Go will not receive remote push notifications');
      return null;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('⚠️ Push notification permissions denied');
      return null;
    }

    console.log('✅ Push notification permissions granted');

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'e0362f41-e619-4df8-ad3a-4dbcff0ce438', // From app.json extra.eas.projectId
    });

    const pushToken = tokenData.data;
    console.log('📱 Expo push token obtained:', pushToken.substring(0, 20) + '...');

    // Store token in Firestore (Cloud Functions will use this)
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      pushToken,
      pushTokenUpdatedAt: serverTimestamp(),
    });

    console.log('✅ Push token registered and stored in Firestore');
    console.log('   Cloud Functions will use this token to send remote push notifications');

    return pushToken;
  } catch (error) {
    console.error('❌ Failed to register for push notifications:', error);
    return null;
  }
}

/**
 * REMOVED: Local notification scheduling
 * 
 * Push notifications are now sent via Firebase Cloud Functions:
 * 1. Message created in Firestore
 * 2. Cloud Function (sendMessageNotification) triggers
 * 3. Function sends remote push via Expo Push API
 * 4. APNs/FCM delivers to device
 * 5. Foreground handler (setNotificationHandler above) displays notification
 * 
 * This provides true remote push notifications that work in foreground and background.
 */

/**
 * Setup notification tap handler
 * Navigates to the appropriate screen when user taps notification
 */
export function setupNotificationTapHandler(): void {
  // Handle notification tap when app is in foreground/background
  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    const notificationType = data?.type as string;
    
    console.log('📱 Notification tapped', { type: notificationType });
    
    // Handle different notification types
    if (notificationType === 'session_summary') {
      // PR20: Session summary notification
      const sessionId = data?.sessionId as string;
      if (sessionId) {
        console.log('📊 Navigating to session detail:', sessionId);
        router.push({
          pathname: '/sessionDetail',
          params: { sessionId },
        });
      }
    } else if (notificationType === 'progress_reel_ready') {
      // PR19: Progress reel ready notification
      const reelId = data?.reelId as string;
      if (reelId) {
        console.log('🎥 Navigating to progress reel:', reelId);
        router.push({
          pathname: '/progressReel',
          params: { reelId },
        });
      }
    } else {
      // Default: message notification
      const conversationId = data?.conversationId as string;
      if (conversationId) {
        console.log('💬 Navigating to conversation:', conversationId.substring(0, 12));
        router.push(`/chat/${conversationId}`);
      }
    }
  });

  console.log('✅ Notification tap handler setup complete');
}

/**
 * Cancel all pending notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('🔕 All notifications cancelled');
}

