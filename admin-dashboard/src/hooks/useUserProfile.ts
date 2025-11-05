import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import type { UserProfile, UserSearchFilters } from '@/types/user';

/**
 * Fetch user profile via Cloud Function
 */
async function fetchUserProfile(userId: string): Promise<UserProfile> {
  try {
    const getUserProfileFn = httpsCallable(functions, 'getUserProfile');
    const result = await getUserProfileFn({ userId });
    return result.data as UserProfile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Search users with filters
 */
async function searchUsers(filters?: UserSearchFilters): Promise<UserProfile[]> {
  try {
    let q = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc'),
      firestoreLimit(50)
    );

    if (filters?.role && filters.role !== 'all') {
      q = query(q, where('role', '==', filters.role));
    }

    if (filters?.banned !== undefined) {
      q = query(q, where('banned', '==', filters.banned));
    }

    const snapshot = await getDocs(q);
    let users = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
    })) as UserProfile[];

    // Client-side filtering for search query
    if (filters?.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      users = users.filter(user => 
        user.email.toLowerCase().includes(searchLower) ||
        (user.displayName && user.displayName.toLowerCase().includes(searchLower))
      );
    }

    // Client-side filtering for XP
    if (filters?.minXp !== undefined) {
      users = users.filter(user => 
        user.stats && user.stats.xpBalance >= filters.minXp!
      );
    }

    // Client-side filtering for date range
    if (filters?.dateRange) {
      const { start, end } = filters.dateRange;
      users = users.filter(user => {
        const userDate = user.createdAt.toDate();
        return userDate >= start && userDate <= end;
      });
    }

    return users;
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
}

/**
 * Ban a user
 */
async function banUser(userId: string, reason: string, adminId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      banned: true,
      bannedAt: Timestamp.now(),
      bannedBy: adminId,
      banReason: reason,
    });

    console.log(`User ${userId} banned by ${adminId}`);
  } catch (error) {
    console.error('Error banning user:', error);
    throw error;
  }
}

/**
 * Unban a user
 */
async function unbanUser(userId: string, adminId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      banned: false,
      bannedAt: null,
      bannedBy: null,
      banReason: null,
    });

    console.log(`User ${userId} unbanned by ${adminId}`);
  } catch (error) {
    console.error('Error unbanning user:', error);
    throw error;
  }
}

/**
 * Hook to fetch user profile
 */
export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => fetchUserProfile(userId),
    enabled: !!userId,
  });
}

/**
 * Hook to search users
 */
export function useSearchUsers(filters?: UserSearchFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => searchUsers(filters),
    refetchInterval: 60000, // Refresh every 60 seconds
  });
}

/**
 * Hook to ban user
 */
export function useBanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, reason, adminId }: { userId: string; reason: string; adminId: string }) =>
      banUser(userId, reason, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });
}

/**
 * Hook to unban user
 */
export function useUnbanUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, adminId }: { userId: string; adminId: string }) =>
      unbanUser(userId, adminId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });
}

