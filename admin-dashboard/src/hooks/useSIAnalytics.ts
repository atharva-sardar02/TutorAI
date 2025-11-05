import { useQuery } from '@tanstack/react-query';
import { getSIAnalytics } from '@/services/sessionIntelService';

export function useSIAnalytics(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ['siAnalytics', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: () => getSIAnalytics(startDate, endDate),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
  });
}

