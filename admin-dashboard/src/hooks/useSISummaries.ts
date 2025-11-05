import { useQuery } from '@tanstack/react-query';
import { getDailySummaries, getWeeklySummaries } from '@/services/sessionIntelService';

export function useDailySummaries(
  conversationId?: string,
  startDate?: Date,
  endDate?: Date,
  limitCount: number = 50
) {
  return useQuery({
    queryKey: ['dailySummaries', conversationId, startDate?.toISOString(), endDate?.toISOString(), limitCount],
    queryFn: () => getDailySummaries(conversationId, startDate, endDate, limitCount),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useWeeklySummaries(conversationId?: string, limitCount: number = 20) {
  return useQuery({
    queryKey: ['weeklySummaries', conversationId, limitCount],
    queryFn: () => getWeeklySummaries(conversationId, limitCount),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

