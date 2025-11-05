import { useQuery } from '@tanstack/react-query';
import { collection, query, where, orderBy, limit as firestoreLimit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AuditLogEntry, AuditLogFilters } from '@/types/system';

/**
 * Fetch audit log entries with optional filters
 */
async function fetchAuditLog(filters?: AuditLogFilters): Promise<AuditLogEntry[]> {
  try {
    let q = query(
      collection(db, 'admin_audit_log'),
      orderBy('timestamp', 'desc'),
      firestoreLimit(100)
    );

    if (filters?.adminId) {
      q = query(q, where('adminId', '==', filters.adminId));
    }

    if (filters?.action) {
      q = query(q, where('action', '==', filters.action));
    }

    if (filters?.resource) {
      q = query(q, where('resource', '==', filters.resource));
    }

    if (filters?.status && filters.status !== 'all') {
      q = query(q, where('status', '==', filters.status));
    }

    const snapshot = await getDocs(q);
    const entries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as AuditLogEntry[];

    // Client-side date filtering if needed
    if (filters?.dateRange) {
      const { start, end } = filters.dateRange;
      return entries.filter(entry => {
        const entryDate = entry.timestamp.toDate();
        return entryDate >= start && entryDate <= end;
      });
    }

    return entries;
  } catch (error) {
    console.error('Error fetching audit log:', error);
    throw error;
  }
}

/**
 * Hook to fetch audit log with filters
 */
export function useAuditLog(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: ['auditLog', filters],
    queryFn: () => fetchAuditLog(filters),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

