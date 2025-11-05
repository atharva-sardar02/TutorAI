import { useQuery } from '@tanstack/react-query';
import { getFunnelMetrics } from '@/services/metricsService';

export function useFunnelMetrics() {
  return useQuery({
    queryKey: ['funnelMetrics'],
    queryFn: () => getFunnelMetrics(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

