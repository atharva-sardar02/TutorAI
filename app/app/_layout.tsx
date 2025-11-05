import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { AuthProvider } from '@/contexts/AuthContext';
import { usePresence } from '@/hooks/usePresence';
import { useAuth } from '@/hooks/useAuth';
import { registerForPushNotifications, setupNotificationTapHandler } from '@/services/notificationService';
import { handleDeepLink } from '@/services/growth/referralService';

function AppContent() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  // Initialize presence tracking ONLY when user is authenticated
  // Pass undefined to skip when user is null (prevents permission errors)
  usePresence(user ? null : undefined);

  // Setup remote push notifications when user is authenticated
  useEffect(() => {
    if (user) {
      const setupNotifications = async () => {
        // Register for remote push notifications (gets and stores Expo push token)
        const pushToken = await registerForPushNotifications(user.uid);

        if (pushToken) {
          // Setup tap handler for when notifications are tapped
          setupNotificationTapHandler();
          console.log('✅ Remote push notifications initialized');
          console.log('   Device registered with Expo Push Service');
          console.log('   Cloud Functions will send notifications via APNs/FCM');
        } else {
          console.warn('⚠️ Push notifications not available (simulator or permissions denied)');
        }
      };

      setupNotifications();
    }
  }, [user]);

  // Handle deep links for referral attribution (PR15)
  useEffect(() => {
    // Listen for deep links (app opened from link)
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      console.log('🔗 Deep link received:', url);
      await handleDeepLink(url);
    });

    // Check initial URL (cold start - app opened from link)
    Linking.getInitialURL().then(async (url) => {
      if (url) {
        console.log('🔗 Initial URL detected:', url);
        await handleDeepLink(url);
      }
    });

    return () => subscription.remove();
  }, []);

  // Minimal auth guard
  useEffect(() => {
    if (loading) return; // Don't redirect while checking auth state

    // Wait for navigation to be ready
    if (!segments || segments.length < 1) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const currentPath = segments.join('/');

    console.log('🛡️ _layout auth guard:', {
      hasUser: !!user,
      currentPath,
      inAuthGroup,
    });

    // Redirect unauthenticated users to login
    if (!user && !inAuthGroup) {
      console.log('🔒 _layout: Not authenticated, redirecting to login');
      router.replace('/(auth)/login');
    }
    
    // Redirect authenticated users from auth screens to index (which will check role)
    if (user && inAuthGroup) {
      console.log('✅ _layout: Authenticated user in auth group, redirecting to index for role check');
      router.replace('/');
    }
  }, [user, loading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="selectRole" 
        options={{ 
          headerShown: false,
          gestureEnabled: false, // Prevent back swipe
        }} 
      />
      <Stack.Screen 
        name="joinTutor" 
        options={{ 
          title: 'Connect with Tutor',
          headerShown: true,
          presentation: 'modal'
        }} 
      />
      <Stack.Screen 
        name="users" 
        options={{ 
          title: 'Select User',
          headerShown: true,
          presentation: 'modal'
        }} 
      />
      <Stack.Screen 
        name="newGroup" 
        options={{ 
          title: 'New Group',
          headerShown: true,
          presentation: 'modal'
        }} 
      />
      <Stack.Screen 
        name="chat/[id]" 
        options={{ 
          title: 'Chat', 
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="profile" 
        options={{ 
          title: 'Profile', 
          headerShown: true,
          headerBackTitle: 'Back'
        }} 
      />
      <Stack.Screen 
        name="profile/[id]" 
        options={{ 
          title: 'Profile', 
          headerShown: true,
          headerBackTitle: 'Back'
        }} 
      />
      <Stack.Screen 
        name="groupInfo/[id]" 
        options={{ 
          title: 'Group Info', 
          headerShown: true 
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
