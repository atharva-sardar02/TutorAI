import { useQuery } from '@tanstack/react-query';
import { getRetentionMetrics } from '@/services/metricsService';

export function useRetentionMetrics() {
  return useQuery({
    queryKey: ['retentionMetrics'],
    queryFn: () => getRetentionMetrics(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

