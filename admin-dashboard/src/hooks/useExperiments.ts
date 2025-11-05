import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Experiment, ExperimentFilters, ExperimentMetrics } from '@/types/experiments';

/**
 * Fetch experiments with optional filters
 */
async function fetchExperiments(filters?: ExperimentFilters): Promise<Experiment[]> {
  try {
    let q = query(
      collection(db, 'experiments'),
      orderBy('createdAt', 'desc')
    );

    if (filters?.status === 'active') {
      q = query(q, where('active', '==', true));
    } else if (filters?.status === 'inactive') {
      q = query(q, where('active', '==', false));
    }

    const snapshot = await getDocs(q);
    let experiments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Experiment[];

    // Client-side filtering for role
    if (filters?.role && filters.role !== 'all') {
      experiments = experiments.filter(exp => 
        exp.targetAudience.roles?.includes(filters.role as 'tutor' | 'parent')
      );
    }

    // Client-side filtering for date range
    if (filters?.dateRange) {
      const { start, end } = filters.dateRange;
      experiments = experiments.filter(exp => {
        const expDate = exp.createdAt.toDate();
        return expDate >= start && expDate <= end;
      });
    }

    return experiments;
  } catch (error) {
    console.error('Error fetching experiments:', error);
    throw error;
  }
}

/**
 * Fetch metrics for a specific experiment
 */
async function fetchExperimentMetrics(experimentId: string): Promise<ExperimentMetrics[]> {
  try {
    const metricsQuery = query(
      collection(db, 'experiments', experimentId, 'metrics'),
      orderBy('lastUpdated', 'desc')
    );

    const snapshot = await getDocs(metricsQuery);
    return snapshot.docs.map(doc => ({
      experimentId,
      ...doc.data(),
    })) as ExperimentMetrics[];
  } catch (error) {
    console.error('Error fetching experiment metrics:', error);
    throw error;
  }
}

/**
 * Toggle experiment active status
 */
async function toggleExperiment(experimentId: string, active: boolean, adminId: string): Promise<void> {
  try {
    const experimentRef = doc(db, 'experiments', experimentId);
    await updateDoc(experimentRef, {
      active,
      updatedAt: Timestamp.now(),
      updatedBy: adminId,
    });

    console.log(`Experiment ${experimentId} ${active ? 'activated' : 'deactivated'} by ${adminId}`);
  } catch (error) {
    console.error('Error toggling experiment:', error);
    throw error;
  }
}

/**
 * Hook to fetch experiments with filters
 */
export function useExperiments(filters?: ExperimentFilters) {
  return useQuery({
    queryKey: ['experiments', filters],
    queryFn: () => fetchExperiments(filters),
    refetchInterval: 60000, // Auto-refresh every 60 seconds
  });
}

/**
 * Hook to fetch metrics for a specific experiment
 */
export function useExperimentMetrics(experimentId: string) {
  return useQuery({
    queryKey: ['experimentMetrics', experimentId],
    queryFn: () => fetchExperimentMetrics(experimentId),
    enabled: !!experimentId,
  });
}

/**
 * Hook to toggle experiment status
 */
export function useToggleExperiment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ experimentId, active, adminId }: { experimentId: string; active: boolean; adminId: string }) =>
      toggleExperiment(experimentId, active, adminId),
    onSuccess: () => {
      // Invalidate experiments queries to refetch
      queryClient.invalidateQueries({ queryKey: ['experiments'] });
    },
  });
}

