/**
 * Subject Presence Aggregation Service
 * PR21: Activity Feed
 * 
 * Aggregates currently active sessions by subject
 * Runs every 5 minutes via scheduled Cloud Function
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { extractSubjectFromTitle } from '../utils/subjectMapping';

const getDb = () => admin.firestore();

export interface SubjectPresence {
  subject: string;
  activeCount: number;
  activeTutorIds: string[]; // For potential detail view
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Compute active sessions by subject
 * Active = startTime <= now <= endTime
 */
export async function computeSubjectPresence(): Promise<number> {
  const db = getDb();
  const now = new Date();
  const nowTimestamp = admin.firestore.Timestamp.fromDate(now);
  
  try {
    // Query events that have started (startTime <= now)
    // Then filter by endTime in memory (Firestore doesn't allow range queries on multiple fields)
    const activeEventsSnapshot = await db
      .collection('events')
      .where('startTime', '<=', nowTimestamp)
      .orderBy('startTime', 'desc')
      .get();
    
    // Filter for events that are currently active (endTime >= now)
    const activeEvents = activeEventsSnapshot.docs.filter((doc) => {
      const event = doc.data();
      const endTime = event.endTime as admin.firestore.Timestamp;
      return endTime && endTime.toDate() >= now;
    });
    
    if (activeEvents.length === 0) {
      logger.info('📊 No active sessions found');
      // Clear all subject presence (set to 0)
      await clearSubjectPresence();
      return 0;
    }
    
    // Group by subject
    const subjectCounts = new Map<string, Set<string>>(); // subject -> Set<tutorId>
    
    activeEvents.forEach((doc) => {
      const event = doc.data();
      const subject = extractSubjectFromTitle(event.title || '');
      const tutorId = event.tutorId || event.createdBy;
      
      if (!subjectCounts.has(subject)) {
        subjectCounts.set(subject, new Set());
      }
      subjectCounts.get(subject)!.add(tutorId);
    });
    
    // Write aggregates to /presence/subjects
    const batch = db.batch();
    const timestamp = admin.firestore.Timestamp.now();
    
    for (const [subject, tutorIds] of subjectCounts.entries()) {
      const presenceRef = db.collection('presence').doc('subjects').collection('active').doc(subject);
      
      const data: SubjectPresence = {
        subject,
        activeCount: tutorIds.size,
        activeTutorIds: Array.from(tutorIds),
        updatedAt: timestamp,
      };
      
      batch.set(presenceRef, data);
    }
    
    await batch.commit();
    
    logger.info('✅ Subject presence computed', {
      subjects: Array.from(subjectCounts.keys()),
      totalActive: activeEvents.length,
    });
    
    return activeEvents.length;
    
  } catch (error: any) {
    logger.error('❌ Failed to compute subject presence', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Clear all subject presence (sets activeCount to 0)
 * Called when no active sessions
 */
async function clearSubjectPresence(): Promise<void> {
  const db = getDb();
  const presenceSnapshot = await db
    .collection('presence')
    .doc('subjects')
    .collection('active')
    .get();
  
  if (presenceSnapshot.empty) return;
  
  const batch = db.batch();
  const timestamp = admin.firestore.Timestamp.now();
  
  presenceSnapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      activeCount: 0,
      activeTutorIds: [],
      updatedAt: timestamp,
    });
  });
  
  await batch.commit();
}

