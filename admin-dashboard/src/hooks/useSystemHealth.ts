import { useQuery } from '@tanstack/react-query';
import type { SystemHealth } from '@/types/system';
import { Timestamp } from 'firebase/firestore';

/**
 * Fetch system health data
 * Note: This is mock data for now. In production, this would call a Cloud Function
 * that aggregates data from Cloud Monitoring, Firestore usage metrics, etc.
 */
async function fetchSystemHealth(): Promise<SystemHealth> {
  try {
    // TODO: Replace with actual Cloud Function call
    // const result = await httpsCallable(functions, 'getSystemHealth')();
    // return result.data as SystemHealth;

    // Mock data for now
    return {
      functions: [
        {
          name: 'transcribeSession',
          status: 'healthy',
          lastRun: Timestamp.now(),
          errorRate: 0.02,
          avgDuration: 3500,
          invocations24h: 1250,
        },
        {
          name: 'afterTranscript',
          status: 'healthy',
          lastRun: Timestamp.now(),
          errorRate: 0.01,
          avgDuration: 2100,
          invocations24h: 1230,
        },
        {
          name: 'computeKFactor',
          status: 'healthy',
          lastRun: Timestamp.now(),
          errorRate: 0.0,
          avgDuration: 8000,
          invocations24h: 24,
        },
        {
          name: 'aggregateDailyMessages',
          status: 'healthy',
          lastRun: Timestamp.now(),
          errorRate: 0.0,
          avgDuration: 5500,
          invocations24h: 48,
        },
        {
          name: 'computeMonthlyPercentiles',
          status: 'healthy',
          lastRun: Timestamp.fromDate(new Date(Date.now() - 86400000 * 5)),
          errorRate: 0.0,
          avgDuration: 45000,
          invocations24h: 1,
        },
      ],
      firestore: {
        reads24h: 125000,
        writes24h: 45000,
        deletes24h: 1200,
        storageUsedMB: 2450,
      },
      storage: {
        usedGB: 15.7,
        limitGB: 100,
        percentUsed: 15.7,
      },
      apiQuotas: {
        openai: {
          used: 245000,
          limit: 1000000,
          percentUsed: 24.5,
        },
        firebase: {
          used: 125000,
          limit: 500000,
          percentUsed: 25.0,
        },
      },
      scheduledJobs: [
        {
          name: 'computeKFactor',
          schedule: '0 3 * * *',
          lastRun: Timestamp.now(),
          nextRun: Timestamp.fromDate(new Date(Date.now() + 3600000 * 6)),
          status: 'success',
        },
        {
          name: 'aggregateDailyMessages',
          schedule: '0 2 * * *',
          lastRun: Timestamp.now(),
          nextRun: Timestamp.fromDate(new Date(Date.now() + 3600000 * 5)),
          status: 'success',
        },
        {
          name: 'aggregateWeeklySummaries',
          schedule: '0 4 * * 0',
          lastRun: Timestamp.fromDate(new Date(Date.now() - 86400000 * 3)),
          nextRun: Timestamp.fromDate(new Date(Date.now() + 86400000 * 4)),
          status: 'success',
        },
        {
          name: 'computeMonthlyPercentiles',
          schedule: '0 3 1 * *',
          lastRun: Timestamp.fromDate(new Date(Date.now() - 86400000 * 5)),
          nextRun: Timestamp.fromDate(new Date(Date.now() + 86400000 * 25)),
          status: 'success',
        },
      ],
      lastUpdated: Timestamp.now(),
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

