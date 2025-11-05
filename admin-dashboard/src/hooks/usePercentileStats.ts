import { useQuery } from '@tanstack/react-query';
import { getPercentileStats } from '@/services/metricsService';

export function usePercentileStats() {
  return useQuery({
    queryKey: ['percentileStats'],
    queryFn: () => getPercentileStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

