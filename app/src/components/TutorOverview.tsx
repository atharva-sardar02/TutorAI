import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share } from 'react-native';
import { router } from 'expo-router';
import { User } from '@/types/index';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import { useDeadlines } from '@/hooks/useDeadlines';
import { useConversations } from '@/hooks/useConversations';
import InsightCard from '@/components/InsightCard';
import InsightsGrid from '@/components/InsightsGrid';
import ConversationListItem from '@/components/ConversationListItem';
import EmptyState from '@/components/EmptyState';
import { PercentileCard } from '@/components/profile/PercentileCard';
import dayjs from 'dayjs';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TutorOverviewProps {
  userData: User;
}

export default function TutorOverview({ userData }: TutorOverviewProps) {
  const { user } = useAuth();
  const { events } = useEvents(user?.uid || null);
  const { deadlines } = useDeadlines(user?.uid || null);
  const { conversations } = useConversations(user?.uid);
  const [parentData, setParentData] = useState<Record<string, User>>({});

  // Get parent conversations (direct chats only)
  const parentConversations = conversations.filter((c) => 
    c.type === 'direct' && c.participants.length === 2
  );

  // Fetch parent user data for all conversations
  useEffect(() => {
    if (!user || parentConversations.length === 0) return;

    const fetchParentData = async () => {
      const parentDataMap: Record<string, User> = {};

      for (const conversation of parentConversations) {
        const otherUserId = conversation.participants.find(
          (uid) => uid !== user.uid
        );

        if (otherUserId && !parentDataMap[otherUserId]) {
          try {
            const parentRef = doc(db, 'users', otherUserId);
            const parentDoc = await getDoc(parentRef);
            
            if (parentDoc.exists()) {
              parentDataMap[otherUserId] = parentDoc.data() as User;
            }
          } catch (error) {
            console.error('Error fetching parent data:', error);
          }
        }
      }

      setParentData(parentDataMap);
    };

    fetchParentData();
  }, [user, conversations]);


  // Calculate tutor-specific insights
  const insights = useMemo(() => {
    const now = dayjs();
    const threeDaysFromNow = now.add(3, 'day');

    // Upcoming sessions in next 3 days
    const upcomingSessions = events.filter((e) =>
      dayjs(e.startTime).isAfter(now) && dayjs(e.startTime).isBefore(threeDaysFromNow)
    ).length;

    // Pending RSVP from parents
    const pendingRSVP = events.filter((e) => e.status === 'pending').length;

    // Priority topics for students (tutor tasks)
    const priorityTopics = deadlines.filter((d) => 
      !d.completed && d.type === 'topic'
    ).length;

    // Active parent conversations
    const activeParents = conversations.filter((c) => 
      c.type === 'direct' && c.participants.length === 2
    ).length;

    return {
      upcomingSessions,
      pendingRSVP,
      priorityTopics,
      activeParents,
    };
  }, [events, deadlines, conversations]);

  const handleCopyCode = async () => {
    if (userData.tutorCode) {
      await Clipboard.setStringAsync(userData.tutorCode);
      Alert.alert('Copied!', 'Tutor code copied to clipboard');
    }
  };

  const handleShareCode = async () => {
    if (!userData.tutorCode) return;

    try {
      await Share.share({
        message: `Join my tutoring sessions! Use code: ${userData.tutorCode}\n\nDownload MessageAI and enter this code to connect.`,
        title: 'My Tutor Code',
      });
    } catch (error) {
      console.error('Error sharing code:', error);
    }
  };

  // Empty state if no parents yet
  if (parentConversations.length === 0) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.emptyScrollContent}>
          {/* Tutor Code Card */}
          <View style={styles.tutorCodeCard}>
            <Text style={styles.tutorCodeLabel}>Your Tutor Code</Text>
            <Text style={styles.tutorCode}>{userData.tutorCode || 'N/A'}</Text>
            <View style={styles.codeActions}>
              <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
                <Ionicons name="copy-outline" size={20} color="#007AFF" />
                <Text style={styles.copyButtonText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareButton} onPress={handleShareCode}>
                <Ionicons name="share-outline" size={20} color="#fff" />
                <Text style={styles.shareButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>

          <EmptyState
            icon="👨‍🏫"
            title="No active parents yet"
            subtitle="Share your tutor code with parents to start connecting and scheduling lessons"
            actionLabel="Share Tutor Code"
            onAction={handleShareCode}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Tutor Code */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Your Parents</Text>
          <View style={styles.tutorCodeBadge}>
            <Text style={styles.tutorCodeSmall}>{userData.tutorCode}</Text>
            <TouchableOpacity onPress={handleCopyCode} style={styles.copyIcon}>
              <Ionicons name="copy-outline" size={16} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Percentile Card */}
        <PercentileCard role="tutor" />

        {/* Insights Grid */}
        <View style={styles.insightsSection}>
          <InsightsGrid columns={2}>
            <InsightCard
              icon="📚"
              title="Upcoming (3 days)"
              value={insights.upcomingSessions}
              subtitle="Sessions scheduled"
              color="#007AFF"
            />
            <InsightCard
              icon="📩"
              title="Awaiting RSVP"
              value={insights.pendingRSVP}
              subtitle="Need confirmation"
              color="#FF9800"
            />
            <InsightCard
              icon="👥"
              title="Active Parents"
              value={insights.activeParents}
              subtitle="Connected"
              color="#4CAF50"
            />
            <InsightCard
              icon="📝"
              title="Priority Topics"
              value={insights.priorityTopics}
              subtitle="To cover"
              color="#9C27B0"
            />
          </InsightsGrid>
        </View>

        {/* Parent Conversations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parent Conversations</Text>
          {parentConversations.map((conversation) => {
            const otherUserId = conversation.participants.find(
              (uid) => uid !== user?.uid
            );
            
            // Get parent user data
            const parent = otherUserId ? parentData[otherUserId] : null;
            const parentName = parent?.displayName || parent?.email || 'Parent';
            const studentContext = parent?.studentContext || null;
            
            return (
              <TouchableOpacity
                key={conversation.id}
                style={styles.parentCard}
                onPress={() => {
                  if (otherUserId) {
                    router.push(`/profile/${otherUserId}`);
                  }
                }}
              >
                <View style={styles.parentAvatar}>
                  <Ionicons name="person" size={24} color="#34C759" />
                </View>
                <View style={styles.parentInfo}>
                  <Text style={styles.parentName}>
                    {parentName}
                  </Text>
                  {studentContext ? (
                    <Text style={styles.parentLastMessage} numberOfLines={1}>
                      Parent of {studentContext}
                    </Text>
                  ) : conversation.lastMessage ? (
                    <Text style={styles.parentLastMessage} numberOfLines={1}>
                      {conversation.lastMessage.text}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={24} color="#ccc" />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/newGroup')}
          >
            <Ionicons name="people-outline" size={24} color="#007AFF" />
            <Text style={styles.actionButtonText}>Create Parent Group</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleShareCode}
          >
            <Ionicons name="share-social-outline" size={24} color="#007AFF" />
            <Text style={styles.actionButtonText}>Share Tutor Code</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer} />
      </ScrollView>

      {/* FAB - Invite Parent */}
      <TouchableOpacity style={styles.fab} onPress={handleShareCode}>
        <Ionicons name="person-add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyScrollContent: {
    flexGrow: 1,
    paddingTop: 20,
  },
  header: {
    padding: 20,
    paddingTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  tutorCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  tutorCodeSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  copyIcon: {
    padding: 2,
  },
  tutorCodeCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tutorCodeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  tutorCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 2,
    marginBottom: 20,
  },
  codeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 8,
  },
  copyButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    gap: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  insightsSection: {
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  parentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  parentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  parentInfo: {
    flex: 1,
  },
  parentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  parentLastMessage: {
    fontSize: 14,
    color: '#666',
  },
  quickActions: {
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  footer: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

