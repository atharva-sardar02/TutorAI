import { useQuery } from '@tanstack/react-query';
import { getKFactorMetrics } from '@/services/metricsService';
import type { LoopType, DateRange } from '@/types/metrics';

export function useKFactorMetrics(dateRange: DateRange, loopType: LoopType = 'all') {
  return useQuery({
    queryKey: ['kFactorMetrics', dateRange.startDate.toISOString(), dateRange.endDate.toISOString(), loopType],
    queryFn: () => getKFactorMetrics(dateRange.startDate, dateRange.endDate, loopType),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

