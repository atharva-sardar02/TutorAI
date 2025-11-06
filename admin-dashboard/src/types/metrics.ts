// Growth Metrics Types for Admin Dashboard

export interface KFactorMetrics {
  overall: number;
  byLoop: {
    loopType: string;
    kFactor: number;
    invitesSent: number;
    conversions: number;
    conversionRate: number;
  }[];
  trend: {
    date: string;
    kFactor: number;
  }[];
  startDate: string;
  endDate: string;
  isRealData?: boolean; // Flag to indicate if this is real data (true) or demo data (false)
}

export interface FunnelMetrics {
  stages: {
    stage: string;
    count: number;
    conversionRate: number;
    dropoffRate: number;
  }[];
  totalEntered: number;
  totalConverted: number;
  overallConversionRate: number;
  avgTimeToConvert?: number; // in days
}

export interface RetentionMetrics {
  cohorts: {
    cohortDate: string;
    size: number;
    retention: {
      day: number;
      retained: number;
      retentionRate: number;
    }[];
  }[];
  overallRetention: {
    day: number;
    avgRetentionRate: number;
  }[];
}

export interface PercentileStats {
  distribution: {
    percentile: number; // 0-100
    count: number;
    role: 'tutor' | 'parent';
  }[];
  summary: {
    role: 'tutor' | 'parent';
    totalUsers: number;
    avgXp: number;
    medianXp: number;
    top10PercentXp: number;
  }[];
  xpTrends: {
    date: string;
    avgXp: number;
    role: 'tutor' | 'parent';
  }[];
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export type LoopType = 'referral' | 'challenge' | 'parent_pod' | 'tutor_peer' | 'all';

export interface ExportOptions {
  format: 'csv' | 'json';
  filename: string;
  data: any[];
  columns?: string[];
}

