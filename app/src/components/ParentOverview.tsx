import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import { User } from '@/types/index';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import { useDeadlines } from '@/hooks/useDeadlines';
import { useConversations } from '@/hooks/useConversations';
import InsightCard from '@/components/InsightCard';
import InsightsGrid from '@/components/InsightsGrid';
import EmptyState from '@/components/EmptyState';
import { PercentileCard } from '@/components/profile/PercentileCard';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ParentOverviewProps {
  userData: User;
}

export default function ParentOverview({ userData }: ParentOverviewProps) {
  const { user } = useAuth();
  const { events } = useEvents(user?.uid || null);
  const { deadlines } = useDeadlines(user?.uid || null);
  const { conversations } = useConversations(user?.uid);
  const [tutorData, setTutorData] = useState<Record<string, User>>({});

  // Get tutor conversations (direct chats only)
  const tutorConversations = conversations.filter((c) => 
    c.type === 'direct' && c.participants.length === 2
  );

  // Fetch tutor user data for all conversations
  useEffect(() => {
    if (!user || tutorConversations.length === 0) return;

    const fetchTutorData = async () => {
      const tutorDataMap: Record<string, User> = {};

      for (const conversation of tutorConversations) {
        const otherUserId = conversation.participants.find(
          (uid) => uid !== user.uid
        );

        if (otherUserId && !tutorDataMap[otherUserId]) {
          try {
            const tutorRef = doc(db, 'users', otherUserId);
            const tutorDoc = await getDoc(tutorRef);
            
            if (tutorDoc.exists()) {
              tutorDataMap[otherUserId] = tutorDoc.data() as User;
            }
          } catch (error) {
            console.error('Error fetching tutor data:', error);
          }
        }
      }

      setTutorData(tutorDataMap);
    };

    fetchTutorData();
  }, [user, conversations]);

  // Calculate parent-specific insights
  const insights = useMemo(() => {
    const now = dayjs();

    // Next upcoming lesson
    const nextLesson = events
      .filter((e) => dayjs(e.startTime).isAfter(now))
      .sort((a, b) => dayjs(a.startTime).diff(dayjs(b.startTime)))[0];

    // Homework due soon (next 3 days)
    const homeworkDueSoon = deadlines.filter((d) => {
      const dueDate = dayjs(d.dueDate);
      return (
        d.type === 'homework' &&
        !d.completed &&
        dueDate.isAfter(now) &&
        dueDate.diff(now, 'day') <= 3
      );
    }).length;

    // Pending invites (lessons awaiting confirmation)
    const pendingInvites = events.filter((e) => e.status === 'pending').length;

    // Overdue homework
    const overdueHomework = deadlines.filter((d) => {
      const dueDate = dayjs(d.dueDate);
      return d.type === 'homework' && !d.completed && dueDate.isBefore(now, 'day');
    }).length;

    // Completion rate
    const totalHomework = deadlines.filter((d) => d.type === 'homework').length;
    const completedHomework = deadlines.filter((d) => d.type === 'homework' && d.completed).length;
    const completionRate = totalHomework > 0 
      ? Math.round((completedHomework / totalHomework) * 100) 
      : 0;

    return {
      nextLesson,
      homeworkDueSoon,
      pendingInvites,
      overdueHomework,
      completionRate,
    };
  }, [events, deadlines]);

  const linkedTutorCount = userData.linkedTutorIds?.length || 0;

  // Empty state if no tutors connected
  if (linkedTutorCount === 0 && tutorConversations.length === 0) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.emptyScrollContent}>
          <EmptyState
            icon="📚"
            title="Connect with a tutor"
            subtitle="Enter a tutor code to start receiving lesson updates, homework reminders, and progress reports"
            actionLabel="Enter Tutor Code"
            onAction={() => router.push('/joinTutor')}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {userData.studentContext 
              ? `${userData.studentContext}'s Updates` 
              : 'Your Child\'s Updates'}
          </Text>
          <Text style={styles.subheading}>Stay informed and on track</Text>
        </View>

        {/* Percentile Card */}
        <PercentileCard role="parent" />

        {/* Next Lesson Card */}
        {insights.nextLesson && (
          <View style={styles.nextLessonCard}>
            <View style={styles.nextLessonHeader}>
              <Ionicons name="calendar" size={24} color="#007AFF" />
              <Text style={styles.nextLessonTitle}>Next Lesson</Text>
            </View>
            <Text style={styles.nextLessonTime}>
              {dayjs(insights.nextLesson.startTime).format('dddd, MMMM D [at] h:mm A')}
            </Text>
            <Text style={styles.nextLessonSubject}>{insights.nextLesson.title}</Text>
            {insights.nextLesson.status === 'pending' && (
              <View style={styles.rsvpContainer}>
                <Text style={styles.rsvpText}>RSVP Required</Text>
                <TouchableOpacity 
                  style={styles.rsvpButton}
                  onPress={() => router.push('/schedule')}
                >
                  <Text style={styles.rsvpButtonText}>Respond</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Insights Grid */}
        <View style={styles.insightsSection}>
          <InsightsGrid columns={2}>
            <InsightCard
              icon="📩"
              title="Pending Invites"
              value={insights.pendingInvites}
              subtitle="Need response"
              color="#FF9800"
            />
            <InsightCard
              icon="📝"
              title="Homework Due Soon"
              value={insights.homeworkDueSoon}
              subtitle="Next 3 days"
              color="#9C27B0"
            />
            <InsightCard
              icon="⚠️"
              title="Overdue Items"
              value={insights.overdueHomework}
              subtitle="Need attention"
              color="#FF3B30"
            />
            <InsightCard
              icon="✅"
              title="Completion Rate"
              value={`${insights.completionRate}%`}
              subtitle="Homework done"
              color="#4CAF50"
            />
          </InsightsGrid>
        </View>

        {/* Reminders Section */}
        {(insights.homeworkDueSoon > 0 || insights.overdueHomework > 0) && (
          <View style={styles.remindersSection}>
            <Text style={styles.sectionTitle}>Reminders</Text>
            {insights.homeworkDueSoon > 0 && (
              <View style={styles.reminderCard}>
                <Ionicons name="time-outline" size={20} color="#9C27B0" />
                <Text style={styles.reminderText}>
                  {insights.homeworkDueSoon} homework assignment{insights.homeworkDueSoon > 1 ? 's' : ''} due in the next 3 days
                </Text>
                <TouchableOpacity onPress={() => router.push('/tasks')}>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            )}
            {insights.overdueHomework > 0 && (
              <View style={[styles.reminderCard, styles.urgentReminder]}>
                <Ionicons name="alert-circle-outline" size={20} color="#FF3B30" />
                <Text style={styles.reminderText}>
                  {insights.overdueHomework} overdue assignment{insights.overdueHomework > 1 ? 's' : ''} need attention
                </Text>
                <TouchableOpacity onPress={() => router.push('/tasks')}>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Connected Tutors */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Tutors</Text>
          {tutorConversations.map((conversation) => {
            const otherUserId = conversation.participants.find(
              (uid) => uid !== user?.uid
            );
            
            // Get tutor user data
            const tutor = otherUserId ? tutorData[otherUserId] : null;
            const tutorName = tutor?.displayName || tutor?.email || 'Tutor';
            const tutorSubjects = tutor?.subjects && tutor.subjects.length > 0
              ? tutor.subjects.join(', ')
              : null;
            
            return (
              <TouchableOpacity
                key={conversation.id}
                style={styles.tutorCard}
                onPress={() => {
                  if (otherUserId) {
                    router.push(`/profile/${otherUserId}`);
                  }
                }}
              >
                <View style={styles.tutorAvatar}>
                  <Ionicons name="person" size={24} color="#007AFF" />
                </View>
                <View style={styles.tutorInfo}>
                  <Text style={styles.tutorName}>
                    {tutorName}
                  </Text>
                  {tutorSubjects ? (
                    <Text style={styles.tutorLastMessage} numberOfLines={1}>
                      {tutorSubjects}
                    </Text>
                  ) : conversation.lastMessage ? (
                    <Text style={styles.tutorLastMessage} numberOfLines={1}>
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
            onPress={() => router.push('/joinTutor')}
          >
            <Ionicons name="person-add-outline" size={24} color="#007AFF" />
            <Text style={styles.actionButtonText}>Connect with Another Tutor</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer} />
      </ScrollView>

      {/* FAB - Add Tutor */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push('/joinTutor')}
      >
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
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    padding: 20,
    paddingTop: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 16,
    color: '#666',
  },
  nextLessonCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextLessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  nextLessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  nextLessonTime: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  nextLessonSubject: {
    fontSize: 14,
    color: '#666',
  },
  rsvpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  rsvpText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
  },
  rsvpButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rsvpButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  insightsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  remindersSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#9C27B0',
  },
  urgentReminder: {
    borderLeftColor: '#FF3B30',
  },
  reminderText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tutorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tutorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tutorInfo: {
    flex: 1,
  },
  tutorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  tutorLastMessage: {
    fontSize: 14,
    color: '#666',
  },
  quickActions: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
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
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

