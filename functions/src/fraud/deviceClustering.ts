/**
 * Device Clustering - PR22
 * 
 * Tracks device-to-user mappings to detect multi-accounting
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { hashSensitive } from '../utils/crypto';

const getDb = () => admin.firestore();

export interface DeviceMapping {
  deviceHash: string;
  userId: string;
  firstSeenAt: admin.firestore.Timestamp;
  lastSeenAt: admin.firestore.Timestamp;
  userAgent?: string;
}

/**
 * Record device-to-user mapping
 * Called on: signup, login
 */
export async function recordDeviceMapping(
  userId: string,
  deviceId: string,
  userAgent?: string
): Promise<void> {
  const db = getDb();
  const deviceHash = hashSensitive(deviceId);
  const now = admin.firestore.Timestamp.now();
  
  const mappingId = `${deviceHash}_${userId}`;
  
  await db.collection('device_mappings').doc(mappingId).set({
    deviceHash,
    userId,
    firstSeenAt: now,
    lastSeenAt: now,
    userAgent,
  }, { merge: true });
  
  logger.info('📱 Device mapping recorded', {
    userId: userId.substring(0, 8),
    deviceHash: deviceHash.substring(0, 8),
  });
}

/**
 * Get all users associated with a device
 */
export async function getUsersForDevice(deviceId: string): Promise<string[]> {
  const db = getDb();
  const deviceHash = hashSensitive(deviceId);
  
  const snapshot = await db
    .collection('device_mappings')
    .where('deviceHash', '==', deviceHash)
    .get();
  
  return snapshot.docs.map(doc => doc.data().userId);
}

