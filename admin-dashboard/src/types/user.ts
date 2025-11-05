import { Timestamp } from 'firebase/firestore';

export interface AdminUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'admin' | 'analyst' | 'support';
  createdAt: Timestamp;
  lastLogin?: Timestamp;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'tutor' | 'parent';
  age?: number;
  subjects?: string[];
  createdAt: Timestamp;
  lastActive?: Timestamp;
  
  // Stats
  stats?: {
    totalSessions: number;
    totalMessages: number;
    totalReferrals: number;
    xpBalance: number;
    monthlyXp: number;
    monthlyPercentile: number;
  };
  
  // Flags
  banned?: boolean;
  bannedAt?: Timestamp;
  bannedBy?: string;
  banReason?: string;
  
  // Linked accounts
  linkedTutorIds?: string[];
  linkedParentIds?: string[];
}

export interface UserSearchFilters {
  role?: 'tutor' | 'parent' | 'all';
  banned?: boolean;
  searchQuery?: string; // email or displayName
  minXp?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface UserAction {
  action: 'ban' | 'unban' | 'set_admin' | 'export_data' | 'delete_account';
  userId: string;
  adminId: string;
  reason?: string;
  metadata?: Record<string, any>;
}

