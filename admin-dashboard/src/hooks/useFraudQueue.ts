import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, orderBy, limit as firestoreLimit, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { FraudItem, FraudQueueFilters, FraudAction } from '@/types/fraud';

/**
 * Fetch fraud queue items with optional filters
 */
async function fetchFraudQueue(filters?: FraudQueueFilters): Promise<FraudItem[]> {
  try {
    let q = query(
      collection(db, 'fraud_queue'),
      orderBy('createdAt', 'desc'),
      firestoreLimit(100)
    );

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    if (filters?.loopType) {
      q = query(q, where('loopType', '==', filters.loopType));
    }

    if (filters?.minScore !== undefined) {
      q = query(q, where('anomalyScore', '>=', filters.minScore));
    }

    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as FraudItem[];

    // Client-side date filtering if needed
    if (filters?.dateRange) {
      const { start, end } = filters.dateRange;
      return items.filter(item => {
        const itemDate = item.createdAt.toDate();
        return itemDate >= start && itemDate <= end;
      });
    }

    return items;
  } catch (error) {
    console.error('Error fetching fraud queue:', error);
    throw error;
  }
}

/**
 * Process fraud action (approve/reject)
 */
async function processFraudAction(action: FraudAction): Promise<void> {
  try {
    const batch = action.itemIds.map(async (itemId) => {
      const itemRef = doc(db, 'fraud_queue', itemId);
      await updateDoc(itemRef, {
        status: action.action === 'approve' ? 'approved' : 'rejected',
        reviewedBy: action.adminId,
        reviewedAt: Timestamp.now(),
        reviewReason: action.reason || '',
      });
    });

    await Promise.all(batch);

    // Log to admin audit log
    console.log(`Fraud action processed: ${action.action} for ${action.itemIds.length} items by ${action.adminId}`);
  } catch (error) {
    console.error('Error processing fraud action:', error);
    throw error;
  }
}

/**
 * Hook to fetch fraud queue with filters
 */
export function useFraudQueue(filters?: FraudQueueFilters) {
  return useQuery({
    queryKey: ['fraudQueue', filters],
    queryFn: () => fetchFraudQueue(filters),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

/**
 * Hook to process fraud actions (approve/reject)
 */
export function useFraudAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: processFraudAction,
    onSuccess: () => {
      // Invalidate fraud queue queries to refetch
      queryClient.invalidateQueries({ queryKey: ['fraudQueue'] });
    },
  });
}

