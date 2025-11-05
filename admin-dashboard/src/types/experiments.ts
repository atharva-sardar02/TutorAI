import { Timestamp } from 'firebase/firestore';

export interface Variant {
  id: string;
  name: string;
  description: string;
  weight: number;
  config?: Record<string, any>;
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  active: boolean;
  startDate: Timestamp;
  endDate?: Timestamp;
  variants: Variant[];
  targetAudience: {
    roles?: ('tutor' | 'parent')[];
    minAge?: number;
    maxAge?: number;
    percentage?: number;
  };
  metrics: {
    name: string;
    type: 'conversion' | 'engagement' | 'retention' | 'revenue';
    goal: 'maximize' | 'minimize';
  }[];
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface ExperimentMetrics {
  experimentId: string;
  variantId: string;
  totalUsers: number;
  conversions: number;
  conversionRate: number;
  avgEngagement: number;
  retention: {
    day1: number;
    day7: number;
    day30: number;
  };
  revenue?: number;
  lastUpdated: Timestamp;
}

export interface ExperimentEvent {
  id: string;
  experimentId: string;
  variantId: string;
  userId: string;
  eventType: 'exposure' | 'conversion' | 'engagement';
  metadata?: Record<string, any>;
  timestamp: Timestamp;
}

export interface ExperimentFilters {
  status?: 'active' | 'inactive' | 'all';
  role?: 'tutor' | 'parent' | 'all';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

