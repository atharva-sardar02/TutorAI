import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useDeadlines } from '@/hooks/useDeadlines';
import DeadlineList, { Deadline } from '@/components/DeadlineList';
import DeadlineCreateModal from '@/components/DeadlineCreateModal';
import FAB from '@/components/FAB';
import LoadingSpinner from '@/components/LoadingSpinner';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types/index';

export default function TasksScreen() {
  const { user } = useAuth();
  const { deadlines: allDeadlines, loading, addDeadline, toggleComplete, deleteDeadline } = useDeadlines(user?.uid || null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);

  // Fetch user role data
  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setUserData(userDoc.data() as User);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user]);

  // Filter deadlines based on role
  const deadlines = useMemo(() => {
    if (!userData?.role) return allDeadlines;

    // Tutors: Show 'topic' type tasks (priority topics for students)
    // Parents: Show 'homework' type tasks (assignments for their child)
    if (userData.role === 'tutor') {
      // Show all tasks for tutors (or filter by type: 'topic')
      return allDeadlines.filter((d) => !d.type || d.type === 'topic');
    } else {
      // Show homework tasks for parents
      return allDeadlines.filter((d) => !d.type || d.type === 'homework');
    }
  }, [allDeadlines, userData]);

  const handleCreateDeadline = (deadline: {
    title: string;
    dueDate: Date;
    assigneeId?: string;
    assigneeName?: string;
  }) => {
    addDeadline({
      title: deadline.title,
      dueDate: deadline.dueDate,
      assignee: deadline.assigneeId,
      assigneeName: deadline.assigneeName,
    });
  };

  const handleMarkComplete = (deadlineId: string) => {
    toggleComplete(deadlineId, user?.displayName || 'Student');
  };

  const handleDelete = (deadlineId: string) => {
    deleteDeadline(deadlineId);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner text="Loading tasks..." size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Test button for Micro-FVM (PR26) */}
      <TouchableOpacity
        style={styles.testButton}
        onPress={() => router.push('/testMicroFVM')}
      >
        <Text style={styles.testButtonText}>🎯 Test Micro-FVM (PR26)</Text>
      </TouchableOpacity>

      {/* Deadline list with sections */}
      <DeadlineList
        deadlines={deadlines}
        onMarkComplete={handleMarkComplete}
        onDelete={handleDelete}
      />

      {/* Create deadline modal */}
      <DeadlineCreateModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateDeadline}
      />

      {/* Floating action button */}
      <FAB
        onPress={() => setShowCreateModal(true)}
        icon="+"
        label={userData?.role === 'tutor' ? 'Add Topic' : 'Add Task'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  testButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

