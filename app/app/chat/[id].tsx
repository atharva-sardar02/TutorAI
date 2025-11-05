import React, { useEffect, useState, useMemo, useRef } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { newMessageId } from "@/utils/messageId";
import { Message, MessageStatus } from "@/types/message";
import {
  sendMessage,
  sendMessageWithRetry,
  subscribeToMessages,
  markMessagesAsRead,
  updateMessageStatus,
} from "@/lib/messageService";
import { auth, db } from "@/lib/firebase";
import { Timestamp, doc, getDoc, onSnapshot } from "firebase/firestore";
import { router } from "expo-router";
import MessageBubble from "@/components/MessageBubble";
import MessageInput from "@/components/MessageInput";
import ConnectionBanner from "@/components/ConnectionBanner";
import OnlineIndicator from "@/components/OnlineIndicator";
import TypingIndicator from "@/components/TypingIndicator";
import ImageUploadProgress from "@/components/ImageUploadProgress";
import LoadingSpinner from "@/components/LoadingSpinner";
import { usePresence } from "@/hooks/usePresence";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useMarkAsRead } from "@/hooks/useMarkAsRead";
import { useMessages } from "@/hooks/useMessages";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useThreadStatus } from "@/hooks/useThreadStatus";
import { uploadImage } from "@/services/mediaService";
import { Conversation } from "@/types/index";
import StatusChip from "@/components/StatusChip";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [otherUserName, setOtherUserName] = useState<string>('');
  const [otherUserData, setOtherUserData] = useState<any>(null); // Store full user data for role context
  const [currentUserData, setCurrentUserData] = useState<any>(null); // Current user's role data
  const [uploadingImages, setUploadingImages] = useState<Map<string, number>>(new Map()); // messageId -> progress
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]); // Local queue for offline messages
  const [showRetryBanner, setShowRetryBanner] = useState(false);
  const previousOnlineStatus = useRef<boolean>(true);
  const retryBannerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashListRef = useRef<any>(null);
  
  const conversationId = id || "demo-conversation-1";
  const currentUserId = auth.currentUser?.uid || "anonymous";

  // Track network status for auto-retry
  const { isOnline } = useNetworkStatus();

  // Track presence for this active conversation
  usePresence(conversationId);

  // Track typing indicator
  const { startTyping, stopTyping } = useTypingIndicator(conversationId, currentUserId);

  // Track read receipts
  const { onViewableItemsChanged, viewabilityConfig } = useMarkAsRead(conversationId, currentUserId);

  // Load messages with pagination
  const { messages, loading, hasMore, loadMore, loadingMore } = useMessages(conversationId, currentUserId);

  // Load optimistic messages from AsyncStorage on mount
  useEffect(() => {
    const loadOptimisticMessages = async () => {
      try {
        const key = `optimistic_messages_${conversationId}`;
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Convert timestamp objects back from JSON
          const messages = parsed.map((msg: any) => ({
            ...msg,
            clientTimestamp: msg.clientTimestamp ? Timestamp.fromMillis(msg.clientTimestamp) : Timestamp.now(),
            serverTimestamp: msg.serverTimestamp ? Timestamp.fromMillis(msg.serverTimestamp) : null,
          }));
          setOptimisticMessages(messages);
          console.log(`💾 Loaded ${messages.length} pending message(s) from storage:`, 
            messages.map((m: Message) => `${m.text.substring(0, 10)}...`));
        } else {
          console.log('💾 No pending messages in storage for this conversation');
        }
      } catch (error) {
        console.error('❌ Failed to load optimistic messages from storage:', error);
      }
    };

    loadOptimisticMessages();
  }, [conversationId]);

  // Save optimistic messages to AsyncStorage whenever they change
  useEffect(() => {
    const saveOptimisticMessages = async () => {
      try {
        const key = `optimistic_messages_${conversationId}`;
        if (optimisticMessages.length > 0) {
          // Convert to plain objects for JSON storage
          const toStore = optimisticMessages.map(msg => ({
            ...msg,
            clientTimestamp: msg.clientTimestamp.toMillis(),
            serverTimestamp: msg.serverTimestamp?.toMillis() || null,
          }));
          await AsyncStorage.setItem(key, JSON.stringify(toStore));
          const pendingCount = optimisticMessages.filter(m => m.status === 'sending').length;
          console.log(`💾 Saved ${optimisticMessages.length} message(s) to storage (${pendingCount} pending)`);
        } else {
          // Clear storage if no pending messages
          await AsyncStorage.removeItem(key);
          console.log('💾 Cleared storage - all messages synced');
        }
      } catch (error) {
        console.error('❌ Failed to save optimistic messages to storage:', error);
      }
    };

    saveOptimisticMessages();
  }, [optimisticMessages, conversationId]);

  // Merge Firestore messages with optimistic local messages
  const allMessages = useMemo(() => {
    // Get IDs of messages already in Firestore
    const firestoreIds = new Set(messages.map(m => m.id));
    
    // Filter out optimistic messages that are now in Firestore
    const pendingOptimistic = optimisticMessages.filter(m => !firestoreIds.has(m.id));
    
    // Merge: Firestore messages + pending optimistic messages
    const merged = [...messages, ...pendingOptimistic];
    
    // Filter out system action messages (they're processed by backend, not shown to user)
    const filtered = merged.filter(m => !m.meta?.action);
    
    // Sort by timestamp (clientTimestamp for optimistic, serverTimestamp for synced)
    filtered.sort((a, b) => {
      const aTimestamp = a.serverTimestamp || a.clientTimestamp;
      const bTimestamp = b.serverTimestamp || b.clientTimestamp;
      
      // Handle null timestamps gracefully
      if (!aTimestamp) return 1; // Put at end
      if (!bTimestamp) return -1; // Put at end
      
      const aTime = aTimestamp.toMillis();
      const bTime = bTimestamp.toMillis();
      return bTime - aTime; // Newest first (descending)
    });
    
    if (pendingOptimistic.length > 0) {
      console.log(`📦 Showing ${pendingOptimistic.length} optimistic message(s) in UI`);
    }
    
    return filtered;
  }, [messages, optimisticMessages]);

  // Derive thread status for RSVP chip (must be after allMessages is computed)
  const threadStatus = useThreadStatus(allMessages, currentUserId);

  // Clean up optimistic messages when they appear in Firestore
  useEffect(() => {
    const firestoreIds = new Set(messages.map(m => m.id));
    const stillPending = optimisticMessages.filter(m => !firestoreIds.has(m.id));
    
    if (stillPending.length !== optimisticMessages.length) {
      const syncedCount = optimisticMessages.length - stillPending.length;
      console.log(`✅ ${syncedCount} optimistic message(s) synced to Firestore, removing from local queue`);
      setOptimisticMessages(stillPending);
    }
  }, [messages, optimisticMessages]);

  // Delayed retry banner visibility (only show if messages stuck for 3+ seconds)
  useEffect(() => {
    const pendingCount = optimisticMessages.filter(m => m.status === 'sending').length;

    // Clear any existing timeout
    if (retryBannerTimeout.current) {
      clearTimeout(retryBannerTimeout.current);
      retryBannerTimeout.current = null;
    }

    if (pendingCount > 0 && isOnline) {
      // Delay showing banner for 3 seconds
      retryBannerTimeout.current = setTimeout(() => {
        // Check again if there are still pending messages
        setOptimisticMessages(current => {
          const stillPending = current.filter(m => m.status === 'sending').length;
          if (stillPending > 0) {
            console.log(`⚠️ ${stillPending} message(s) stuck in sending state, showing retry banner`);
            setShowRetryBanner(true);
          }
          return current;
        });
      }, 3000);
    } else {
      // Hide banner if no pending messages
      setShowRetryBanner(false);
    }

    // Cleanup timeout on unmount
    return () => {
      if (retryBannerTimeout.current) {
        clearTimeout(retryBannerTimeout.current);
      }
    };
  }, [optimisticMessages, isOnline]);

  // Auto-retry pending messages when connection is restored (offline → online transition)
  useEffect(() => {
    const wasOffline = !previousOnlineStatus.current;
    const isNowOnline = isOnline;
    
    // Update previous status first
    previousOnlineStatus.current = isOnline;
    
    // Only retry when transitioning from offline to online
    if (!wasOffline || !isNowOnline) return;
    
    // Get current pending messages at the time of reconnection
    setOptimisticMessages(currentOptimistic => {
      const pendingCount = currentOptimistic.filter(m => m.status === 'sending').length;
      
      if (pendingCount === 0) {
        console.log('📡 Connection restored, but no pending messages to retry');
        return currentOptimistic;
      }
      
      console.log(`🔄 Connection restored! Retrying ${pendingCount} pending message(s)...`);
      
      // Retry messages asynchronously (don't block state update)
      const retryPendingMessages = async () => {
        for (const msg of currentOptimistic) {
          if (msg.status === 'sending') {
            console.log(`  🔄 Retrying message: ${msg.id.substring(0, 8)} - "${msg.text}"`);
            
            try {
              const result = await sendMessageWithRetry(conversationId, msg);
              
              if (result.success) {
                console.log(`  ✅ Retry successful: ${msg.id.substring(0, 8)}`);
                // Will be cleaned up by the Firestore listener effect
              } else if (!result.isOffline) {
                console.warn(`  ⚠️ Retry failed: ${msg.id.substring(0, 8)}`);
                // Update to failed status
                setOptimisticMessages(prev =>
                  prev.map(m => m.id === msg.id ? { ...m, status: "failed" as MessageStatus } : m)
                );
              } else {
                console.log(`  📦 Still offline, message remains queued: ${msg.id.substring(0, 8)}`);
              }
            } catch (error) {
              console.error(`  ❌ Error retrying: ${msg.id.substring(0, 8)}`, error);
              setOptimisticMessages(prev =>
                prev.map(m => m.id === msg.id ? { ...m, status: "failed" as MessageStatus } : m)
              );
            }
            
            // Small delay between retries to avoid overwhelming Firestore
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      };
      
      retryPendingMessages();
      return currentOptimistic; // Return unchanged for now, retries will update as they complete
    });
  }, [isOnline, conversationId]); // Only isOnline and conversationId in deps

  // Fetch current user's role data
  useEffect(() => {
    const fetchCurrentUserData = async () => {
      try {
        const userRef = doc(db, 'users', currentUserId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setCurrentUserData(userDoc.data());
        }
      } catch (error) {
        console.error('Error fetching current user data:', error);
      }
    };

    fetchCurrentUserData();
  }, [currentUserId]);

  // Set initial navigation options
  useEffect(() => {
    navigation.setOptions({
      headerBackTitle: 'Chats',
    });
  }, [navigation]);

  // Listen to conversation changes (including deletion)
  useEffect(() => {
    const conversationRef = doc(db, 'conversations', conversationId);
    
    const unsubscribe = onSnapshot(
      conversationRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          // Conversation was deleted
          console.log('⚠️ Conversation deleted, navigating back');
          Alert.alert(
            'Conversation Deleted',
            'This conversation has been deleted.',
            [
              {
                text: 'OK',
                onPress: () => router.back(),
              },
            ],
            { cancelable: false }
          );
        } else {
          const conv = { id: snapshot.id, ...snapshot.data() } as Conversation;
          setConversation(conv);
          
          // Fetch other user's name and role data for direct chats
          if (conv.type === 'direct') {
            const otherUserId = conv.participants.find(uid => uid !== currentUserId);
            if (otherUserId) {
              try {
                const userDoc = await getDoc(doc(db, 'users', otherUserId));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  setOtherUserName(userData.displayName || 'User');
                  setOtherUserData(userData); // Store full user data for role context
                } else {
                  setOtherUserName('User');
                  setOtherUserData(null);
                }
              } catch (error) {
                console.error('Error fetching other user data:', error);
                setOtherUserName('User');
                setOtherUserData(null);
              }
            }
          }
        }
      },
      (error) => {
        console.error('Error listening to conversation:', error);
      }
    );

    return () => unsubscribe();
  }, [conversationId, currentUserId]);

  // Auto-scroll to bottom when messages load or new messages arrive
  // Track the last message ID to ensure we scroll on actual new messages
  const lastMessageId = useRef<string | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!loading && allMessages.length > 0 && flashListRef.current) {
      const newestMessage = allMessages[0]; // First item is newest (sorted descending)
      const isNewMessage = newestMessage.id !== lastMessageId.current;
      
      // Clear any pending scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Only scroll if we have a genuinely new message or initial load
      if (isNewMessage || lastMessageId.current === null) {
        lastMessageId.current = newestMessage.id;
        
        console.log('📜 Auto-scrolling to newest message:', {
          messageId: newestMessage.id.substring(0, 8),
          isAssistant: newestMessage.senderId === 'assistant',
          hasConflict: !!newestMessage.meta?.conflict,
          messageCount: allMessages.length,
        });
        
        // Use scrollToOffset for more reliable scrolling to the very top
        // FlashList displays messages in reverse, so offset 0 = newest message
        scrollTimeoutRef.current = setTimeout(() => {
          try {
            flashListRef.current?.scrollToOffset({
              offset: 0,
              animated: false,
            });
          } catch (error) {
            console.warn('Scroll failed, retrying with scrollToIndex:', error);
            // Fallback to scrollToIndex if scrollToOffset fails
            setTimeout(() => {
              flashListRef.current?.scrollToIndex({ 
                index: 0, 
                animated: false,
                viewPosition: 0,
              });
            }, 50);
          }
        }, 150) as any; // Increased delay for complex assistant messages with cards
      }
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [loading, allMessages]);

  // Update header with conversation name and online indicator
  useEffect(() => {
    if (conversation) {
      let title: string | (() => React.ReactElement) = 'Chat';
      let headerRight;

      if (conversation.type === 'direct') {
        const otherUserId = conversation.participants.find(uid => uid !== currentUserId);
        
        // Use fetched display name or fallback
        title = otherUserName || 'Chat';
        
        // For direct chats, show online indicator and tappable name
        if (otherUserId) {
          headerRight = () => (
            <View style={{ marginRight: 15 }}>
              <OnlineIndicator userId={otherUserId} size={12} />
            </View>
          );
          
          // Make the name tappable to view profile, add status chip if active invite
          if (otherUserName) {
            // Get role-aware subtitle
            let subtitle = '';
            if (currentUserData?.role === 'tutor' && otherUserData?.role === 'parent') {
              // Tutor viewing parent: show student context if available
              subtitle = otherUserData.studentContext 
                ? `Parent of ${otherUserData.studentContext}` 
                : 'Parent';
            } else if (currentUserData?.role === 'parent' && otherUserData?.role === 'tutor') {
              // Parent viewing tutor: show subjects
              subtitle = otherUserData.subjects && otherUserData.subjects.length > 0
                ? otherUserData.subjects.join(', ')
                : 'Tutor';
            }

            title = () => (
              <TouchableOpacity
                onPress={() => router.push(`/profile/${otherUserId}`)}
                style={{ alignItems: 'center' }}
              >
                <Text style={{ fontSize: 17, fontWeight: '600', color: '#000' }}>
                  {otherUserName}
                </Text>
                {/* Show subtitle with role context */}
                {subtitle && (
                  <Text style={{ fontSize: 12, color: '#666' }}>
                    {subtitle}
                  </Text>
                )}
                {/* Show status chip if there's an active invite */}
                {threadStatus.hasActiveInvite && threadStatus.status && (
                  <StatusChip 
                    variant={threadStatus.status}
                    text={threadStatus.eventTitle || undefined}
                  />
                )}
              </TouchableOpacity>
            );
          }
        }
      } else {
        // For group chats, make the title tappable
        const groupName = conversation.name || 'Group Chat';
        const memberCount = conversation.participants?.length || 0;
        
        title = () => (
          <TouchableOpacity
            onPress={() => router.push(`/groupInfo/${conversationId}`)}
            style={{ alignItems: 'center' }}
          >
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#000' }}>
              {groupName}
            </Text>
            {/* Show status chip if there's an active invite */}
            {threadStatus.hasActiveInvite && threadStatus.status ? (
              <StatusChip 
                variant={threadStatus.status}
                text={threadStatus.eventTitle || undefined}
              />
            ) : (
              <Text style={{ fontSize: 12, color: '#666' }}>
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </Text>
            )}
          </TouchableOpacity>
        );

        // Add info icon to header right for groups
        headerRight = () => (
          <TouchableOpacity
            onPress={() => router.push(`/groupInfo/${conversationId}`)}
            style={{ marginRight: 15 }}
          >
            <Text style={{ fontSize: 24, color: '#007AFF' }}>ⓘ</Text>
          </TouchableOpacity>
        );
      }

      navigation.setOptions({
        headerTitle: title,
        headerRight,
        headerBackTitle: 'Chats',
      });
    }
  }, [conversation, otherUserName, otherUserData, currentUserData, currentUserId, navigation, conversationId, threadStatus]);

  // NOTE: Push notifications are now handled by Firebase Cloud Functions
  // When a message is created, the Cloud Function automatically sends
  // remote push notifications via Expo Push Service → APNs/FCM
  // No client-side notification triggering needed

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const messageId = newMessageId();
    const newMessage: Message = {
      id: messageId,
      conversationId,
      senderId: currentUserId,
      type: "text",
      text: text.trim(),
      clientTimestamp: Timestamp.now(),
      serverTimestamp: null,
      status: "sending",
      retryCount: 0,
      readBy: [currentUserId],
      readCount: 1,
    };

    // Add to optimistic state IMMEDIATELY (shows in UI right away)
    setOptimisticMessages(prev => [...prev, newMessage]);
    console.log('📤 Added message to optimistic queue:', messageId.substring(0, 8));

    // Send to Firestore (will queue if offline)
    const result = await sendMessageWithRetry(conversationId, newMessage);
    
    if (result.isOffline) {
      console.log('📦 Message queued offline by Firestore - will auto-sync when connection restored');
      console.log('   Message visible in UI via optimistic state');
    } else if (result.success) {
      console.log('✅ Message sent successfully - will appear via Firestore listener');
      // Message will be removed from optimistic state when Firestore listener fires
    } else {
      console.warn('⚠️ Message send failed after retries');
      // Update optimistic message to "failed" status
      setOptimisticMessages(prev => 
        prev.map(m => m.id === messageId ? { ...m, status: "failed" as MessageStatus } : m)
      );
    }
  };

  const handleSendImage = async (imageUri: string) => {
    const messageId = newMessageId();
    
    console.log('🖼️ Sending image message:', messageId.substring(0, 8));

    // Create optimistic image message
    const newMessage: Message = {
      id: messageId,
      conversationId,
      senderId: currentUserId,
      type: "image",
      text: "", // Can add caption support later
      media: {
        status: "uploading",
        url: imageUri, // Temporary local URI
        width: 0,
        height: 0,
      },
      clientTimestamp: Timestamp.now(),
      serverTimestamp: null,
      status: "sending",
      retryCount: 0,
      readBy: [currentUserId],
      readCount: 1,
    };

    // Add to optimistic state IMMEDIATELY (shows in UI right away)
    setOptimisticMessages(prev => [...prev, newMessage]);
    setUploadingImages(new Map(uploadingImages.set(messageId, 0)));
    console.log('📤 Added image message to optimistic queue:', messageId.substring(0, 8));

    try {
      // Upload image to Storage
      const uploadResult = await uploadImage(
        imageUri,
        conversationId,
        messageId,
        (progress) => {
          setUploadingImages(new Map(uploadingImages.set(messageId, progress.progress)));
        }
      );

      console.log('✅ Image uploaded successfully');

      // Update message with upload result
      const messageWithImage: Message = {
        ...newMessage,
        media: {
          status: "ready",
          url: uploadResult.url,
          width: uploadResult.width,
          height: uploadResult.height,
        },
      };

      // Real-time listener will update with the uploaded image

      // Update optimistic message with uploaded image URL
      setOptimisticMessages(prev =>
        prev.map(m => m.id === messageId ? messageWithImage : m)
      );

      // Send to Firestore
      const result = await sendMessageWithRetry(conversationId, messageWithImage);
      
      if (result.isOffline) {
        console.log('📦 Image message queued offline - will send when connection restored');
        console.log('   Message visible in UI via optimistic state');
      } else if (result.success) {
        console.log('✅ Image message sent successfully - will appear via Firestore listener');
        // Message will be removed from optimistic state when Firestore listener fires
      } else {
        console.warn('⚠️ Image message send failed after retries');
        // Update optimistic message to "failed" status
        setOptimisticMessages(prev => 
          prev.map(m => m.id === messageId ? { ...m, status: "failed" as MessageStatus } : m)
        );
      }

      // Clean up upload progress
      const newMap = new Map(uploadingImages);
      newMap.delete(messageId);
      setUploadingImages(newMap);
    } catch (error: any) {
      console.error('❌ Image upload/send failed:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload image. Please try again.');

      // Update optimistic message to "failed" status
      setOptimisticMessages(prev => 
        prev.map(m => m.id === messageId ? { ...m, status: "failed" as MessageStatus } : m)
      );

      // Clean up upload progress
      const newMap = new Map(uploadingImages);
      newMap.delete(messageId);
      setUploadingImages(newMap);
    }
  };

  const handleRetry = async (messageId: string) => {
    // Check both Firestore messages and optimistic messages
    const failedMessage = allMessages.find(m => m.id === messageId);
    if (!failedMessage) return;

    console.log(`🔄 Manual retry for message ${messageId.substring(0, 8)}`);
    
    // Update optimistic status to "sending"
    setOptimisticMessages(prev => 
      prev.map(m => m.id === messageId ? { ...m, status: "sending" as MessageStatus } : m)
    );
    
    const result = await sendMessageWithRetry(conversationId, failedMessage);
    
    if (result.isOffline) {
      console.log('📦 Retry queued offline - will send when connection restored');
      console.log('   Message visible in UI via optimistic state');
    } else if (result.success) {
      console.log('✅ Retry successful - will appear via Firestore listener');
      // Message will be removed from optimistic state when Firestore listener fires
    } else {
      console.warn('⚠️ Retry failed after attempts');
      // Update back to "failed" status
      setOptimisticMessages(prev => 
        prev.map(m => m.id === messageId ? { ...m, status: "failed" as MessageStatus } : m)
      );
    }
  };

  const handleRetryAll = async () => {
    const pendingMessages = optimisticMessages.filter(m => m.status === 'sending');
    if (pendingMessages.length === 0) return;

    // Hide banner immediately when user taps retry
    setShowRetryBanner(false);

    console.log(`🔄 Manual retry all: ${pendingMessages.length} pending message(s)`);
    
    for (const msg of pendingMessages) {
      console.log(`  🔄 Retrying: ${msg.id.substring(0, 8)} - "${msg.text}"`);
      
      try {
        const result = await sendMessageWithRetry(conversationId, msg);
        
        if (result.success) {
          console.log(`  ✅ Success: ${msg.id.substring(0, 8)}`);
        } else if (!result.isOffline) {
          console.warn(`  ⚠️ Failed: ${msg.id.substring(0, 8)}`);
          setOptimisticMessages(prev =>
            prev.map(m => m.id === msg.id ? { ...m, status: "failed" as MessageStatus } : m)
          );
        }
      } catch (error) {
        console.error(`  ❌ Error: ${msg.id.substring(0, 8)}`, error);
      }
      
      // Delay between retries
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ConnectionBanner />

      {/* Show retry banner only if messages stuck for 3+ seconds */}
      {showRetryBanner && isOnline && (
        <TouchableOpacity style={styles.retryAllBanner} onPress={handleRetryAll}>
          <Text style={styles.retryAllText}>
            {optimisticMessages.filter(m => m.status === 'sending').length} message(s) waiting to send
          </Text>
          <Text style={styles.retryAllAction}>Tap to retry →</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner text="Loading messages..." size="large" />
        </View>
      ) : (
        <FlashList
          ref={flashListRef}
          data={[...allMessages].reverse()}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwn={item.senderId === currentUserId}
              showSenderName={conversation?.type === 'group'}
              conversationType={conversation?.type}
              totalParticipants={conversation?.participants.length}
              onRetry={handleRetry}
            />
          )}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          keyExtractor={(item) => item.id}
          extraData={allMessages}
          onEndReached={() => {
            // Auto-load more when scrolling to bottom
            if (hasMore && !loadingMore) {
              console.log('🔄 Auto-loading more messages...');
              loadMore();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasMore ? (
              <View style={styles.loadMoreContainer}>
                {loadingMore ? (
                  <LoadingSpinner text="Loading older messages..." />
                ) : (
                  <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
                    <Text style={styles.loadMoreText}>Load Older Messages</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : allMessages.length > 0 ? (
              <View style={styles.endOfMessages}>
                <Text style={styles.endOfMessagesText}>— Beginning of conversation —</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No messages yet</Text>
              <Text style={styles.emptyStateSubtext}>Send a message to start the conversation</Text>
            </View>
          }
        />
      )}

      {/* Show upload progress */}
      {Array.from(uploadingImages.entries()).map(([messageId, progress]) => (
        <ImageUploadProgress key={messageId} progress={progress} />
      ))}

      <TypingIndicator conversationId={conversationId} currentUserId={currentUserId} />

      <MessageInput 
        onSend={handleSend}
        onSendImage={handleSendImage}
        onTyping={startTyping}
        onStopTyping={stopTyping}
        disabled={uploadingImages.size > 0}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  endOfMessages: {
    padding: 20,
    alignItems: 'center',
  },
  endOfMessagesText: {
    color: '#999',
    fontSize: 13,
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  retryAllBanner: {
    backgroundColor: '#FFD60A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#FFCC00',
  },
  retryAllText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  retryAllAction: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
