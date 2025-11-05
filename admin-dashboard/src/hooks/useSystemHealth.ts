import { useQuery } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import type { SystemHealth } from '@/types/system';
import { Timestamp } from 'firebase/firestore';

/**
 * Fetch system health data from Cloud Function
 */
async function fetchSystemHealth(): Promise<SystemHealth> {
  try {
    const getSystemHealthFn = httpsCallable(functions, 'getSystemHealth');
    const result = await getSystemHealthFn();
    const data = result.data as any;

    // Transform backend response to frontend format
    return {
      functions: data.functions.map((fn: any) => ({
        name: fn.name,
        status: fn.status,
        lastRun: Timestamp.now(), // Backend doesn't track lastRun per function
        errorRate: fn.errorRate,
        avgDuration: fn.avgDuration,
        invocations24h: fn.invocations24h,
      })),
      firestore: {
        reads24h: data.firestoreUsage.reads,
        writes24h: data.firestoreUsage.writes,
        deletes24h: data.firestoreUsage.deletes,
        storageUsedMB: Math.round(data.firestoreUsage.storageSize / (1024 * 1024)),
      },
      storage: {
        usedGB: Math.round((data.quotas.storageUsed / (1024 * 1024 * 1024)) * 10) / 10,
        limitGB: Math.round((data.quotas.storageLimit / (1024 * 1024 * 1024)) * 10) / 10,
        percentUsed: Math.round((data.quotas.storageUsed / data.quotas.storageLimit) * 1000) / 10,
      },
      apiQuotas: {
        openai: {
          used: data.quotas.openAIUsed,
          limit: data.quotas.openAIQuota,
          percentUsed: Math.round((data.quotas.openAIUsed / data.quotas.openAIQuota) * 1000) / 10,
        },
        firebase: {
          used: data.quotas.firebaseUsed,
          limit: data.quotas.firebaseQuota,
          percentUsed: Math.round((data.quotas.firebaseUsed / data.quotas.firebaseQuota) * 1000) / 10,
        },
      },
      scheduledJobs: data.scheduledJobs.map((job: any) => ({
        name: job.name,
        schedule: job.schedule,
        lastRun: job.lastRun ? new Timestamp(job.lastRun._seconds, job.lastRun._nanoseconds) : Timestamp.now(),
        nextRun: job.nextRun ? new Timestamp(job.nextRun._seconds, job.nextRun._nanoseconds) : Timestamp.fromDate(new Date(Date.now() + 86400000)),
        status: job.status,
      })),
      lastUpdated: new Timestamp(data.timestamp._seconds, data.timestamp._nanoseconds),
    };
  } catch (error) {
    console.error('Error fetching system health:', error);
    throw error;
  }
}

/**
 * Hook to fetch system health data
 */
export function useSystemHealth() {
  return useQuery({
    queryKey: ['systemHealth'],
    queryFn: fetchSystemHealth,
    refetchInterval: 120000, // Refresh every 2 minutes
  });
}

