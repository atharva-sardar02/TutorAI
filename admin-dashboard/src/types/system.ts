import { Timestamp } from 'firebase/firestore';

export interface FunctionStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastRun?: Timestamp;
  errorRate: number;
  avgDuration: number;
  invocations24h: number;
}

export interface SystemHealth {
  functions: FunctionStatus[];
  firestore: {
    reads24h: number;
    writes24h: number;
    deletes24h: number;
    storageUsedMB: number;
  };
  storage: {
    usedGB: number;
    limitGB: number;
    percentUsed: number;
  };
  apiQuotas: {
    openai: {
      used: number;
      limit: number;
      percentUsed: number;
    };
    firebase: {
      used: number;
      limit: number;
      percentUsed: number;
    };
  };
  scheduledJobs: {
    name: string;
    schedule: string;
    lastRun: Timestamp;
    nextRun: Timestamp;
    status: 'success' | 'failed' | 'pending';
  }[];
  lastUpdated: Timestamp;
}

export interface KillSwitch {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'feature' | 'loop' | 'system';
  impact: 'low' | 'medium' | 'high' | 'critical';
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  status: 'success' | 'failed';
  details?: Record<string, any>;
  timestamp: Timestamp;
  ipAddress?: string;
}

export interface AuditLogFilters {
  adminId?: string;
  action?: string;
  resource?: string;
  status?: 'success' | 'failed' | 'all';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

