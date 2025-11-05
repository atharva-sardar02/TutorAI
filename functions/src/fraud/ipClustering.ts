/**
 * IP Clustering - PR22
 * 
 * Tracks IP subnet activity to detect coordinated abuse
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { hashSensitive } from '../utils/crypto';

const getDb = () => admin.firestore();

export interface IpSignupEvent {
  ipHash: string;
  subnetHash: string;
  userId: string;
  timestamp: admin.firestore.Timestamp;
}

/**
 * Record IP signup event
 * Called on: user signup
 */
export async function recordIpSignup(
  userId: string,
  ipAddress: string
): Promise<void> {
  const db = getDb();
  const ipHash = hashSensitive(ipAddress);
  
  // Extract /24 subnet
  const subnet = ipAddress.split('.').slice(0, 3).join('.');
  const subnetHash = hashSensitive(subnet);
  
  const eventId = `${userId}_${Date.now()}`;
  
  await db.collection('ip_signups').doc(eventId).set({
    ipHash,
    subnetHash,
    userId,
    timestamp: admin.firestore.Timestamp.now(),
  });
  
  logger.info('🌐 IP signup recorded', {
    userId: userId.substring(0, 8),
    subnetHash: subnetHash.substring(0, 8),
  });
}

/**
 * Check if subnet is suspicious
 */
export async function isSubnetSuspicious(ipAddress: string): Promise<boolean> {
  const db = getDb();
  const subnet = ipAddress.split('.').slice(0, 3).join('.');
  const subnetHash = hashSensitive(subnet);
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const snapshot = await db
    .collection('ip_signups')
    .where('subnetHash', '==', subnetHash)
    .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(oneHourAgo))
    .get();
  
  return snapshot.size > 10;
}

