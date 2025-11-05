import { Timestamp } from 'firebase/firestore';

export interface AnomalyScore {
  referralId: string;
  userId: string;
  score: number;
  reasons: string[];
  createdAt: Timestamp;
}

export interface FraudItem {
  id: string;
  referralId: string;
  referrerId: string;
  refereeId: string;
  loopType: string;
  anomalyScore: number;
  reasons: string[];
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  createdAt: Timestamp;
  metadata: {
    deviceId?: string;
    ipAddress?: string;
    signupTime?: number;
    referralClicks?: number;
    [key: string]: any;
  };
}

export interface FraudQueueFilters {
  status?: 'pending' | 'approved' | 'rejected';
  loopType?: string;
  minScore?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface FraudAction {
  action: 'approve' | 'reject';
  itemIds: string[];
  adminId: string;
  reason?: string;
}

