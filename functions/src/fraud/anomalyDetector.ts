/**
 * Anomaly Detector - PR22
 * 
 * Computes fraud risk scores for users and referrals
 * Scoring model: velocity (40%) + device (30%) + IP (20%) + behavioral (10%)
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { hashSensitive } from '../utils/crypto';

const getDb = () => admin.firestore();

export interface AnomalyScore {
  userId: string;
  score: number; // 0-100
  signals: {
    velocity: number;
    device: number;
    ip: number;
    behavioral: number;
  };
  reason: string[];
  timestamp: admin.firestore.Timestamp;
  autoBlock: boolean; // true if score >= 91
}

/**
 * Compute anomaly score for a user
 * Called on: signup, referral creation, reward claim
 */
export async function computeAnomalyScore(
  userId: string,
  context: {
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
    action: 'signup' | 'referral_create' | 'reward_claim';
  }
): Promise<AnomalyScore> {
  const db = getDb();
  const now = admin.firestore.Timestamp.now();
  const reasons: string[] = [];
  
  // Signal 1: Velocity (40%)
  const velocityScore = await computeVelocityScore(userId, context.action, reasons);
  
  // Signal 2: Device reuse (30%)
  const deviceScore = context.deviceId 
    ? await computeDeviceScore(context.deviceId, userId, reasons)
    : 0;
  
  // Signal 3: IP clustering (20%)
  const ipScore = context.ipAddress
    ? await computeIpScore(context.ipAddress, reasons)
    : 0;
  
  // Signal 4: Behavioral (10%)
  const behavioralScore = await computeBehavioralScore(userId, reasons);
  
  // Weighted sum
  const totalScore = Math.min(100, Math.round(
    velocityScore * 0.4 +
    deviceScore * 0.3 +
    ipScore * 0.2 +
    behavioralScore * 0.1
  ));
  
  const autoBlock = totalScore >= 91;
  
  const anomalyScore: AnomalyScore = {
    userId,
    score: totalScore,
    signals: {
      velocity: velocityScore,
      device: deviceScore,
      ip: ipScore,
      behavioral: behavioralScore,
    },
    reason: reasons,
    timestamp: now,
    autoBlock,
  };
  
  // Store score for analytics
  await db.collection('anomaly_scores').doc(userId).set(anomalyScore);
  
  logger.info('🔍 Anomaly score computed', {
    userId: userId.substring(0, 8),
    score: totalScore,
    autoBlock,
    reasons: reasons.join(', '),
  });
  
  return anomalyScore;
}

/**
 * Velocity scoring: Too many actions too fast
 */
async function computeVelocityScore(
  userId: string,
  action: string,
  reasons: string[]
): Promise<number> {
  const db = getDb();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  // Count referrals created in last 24h
  const referralsSnapshot = await db
    .collection('referrals')
    .where('referrerId', '==', userId)
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(oneDayAgo))
    .get();
  
  const referralsPerDay = referralsSnapshot.size;
  
  // Count signups from this user's referrals in last hour
  const signupsSnapshot = await db
    .collection('referrals')
    .where('referrerId', '==', userId)
    .where('signedUpAt', '>=', admin.firestore.Timestamp.fromDate(oneHourAgo))
    .get();
  
  const signupsPerHour = signupsSnapshot.size;
  
  let score = 0;
  
  // Thresholds
  if (referralsPerDay > 50) {
    score += 50;
    reasons.push(`High referral velocity: ${referralsPerDay}/day`);
  } else if (referralsPerDay > 20) {
    score += 30;
    reasons.push(`Moderate referral velocity: ${referralsPerDay}/day`);
  }
  
  if (signupsPerHour > 10) {
    score += 50;
    reasons.push(`Suspicious signup velocity: ${signupsPerHour}/hour`);
  } else if (signupsPerHour > 5) {
    score += 20;
    reasons.push(`High signup velocity: ${signupsPerHour}/hour`);
  }
  
  return Math.min(100, score);
}

/**
 * Device scoring: Multiple accounts from same device
 */
async function computeDeviceScore(
  deviceId: string,
  currentUserId: string,
  reasons: string[]
): Promise<number> {
  const db = getDb();
  const deviceHash = hashSensitive(deviceId);
  
  // Find all users with this device
  const usersSnapshot = await db
    .collection('device_mappings')
    .where('deviceHash', '==', deviceHash)
    .get();
  
  const userCount = usersSnapshot.size;
  
  let score = 0;
  
  if (userCount > 5) {
    score = 100;
    reasons.push(`Device reuse: ${userCount} accounts`);
  } else if (userCount > 3) {
    score = 70;
    reasons.push(`Multiple accounts: ${userCount} from device`);
  } else if (userCount > 1) {
    score = 30;
    reasons.push(`Shared device: ${userCount} accounts`);
  }
  
  return score;
}

/**
 * IP scoring: Subnet clustering
 */
async function computeIpScore(
  ipAddress: string,
  reasons: string[]
): Promise<number> {
  const db = getDb();
  
  // Extract /24 subnet (e.g., 192.168.1.x)
  const subnet = ipAddress.split('.').slice(0, 3).join('.');
  const subnetHash = hashSensitive(subnet);
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  // Count signups from this subnet in last hour
  const signupsSnapshot = await db
    .collection('ip_signups')
    .where('subnetHash', '==', subnetHash)
    .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(oneHourAgo))
    .get();
  
  const signupsFromSubnet = signupsSnapshot.size;
  
  let score = 0;
  
  if (signupsFromSubnet > 20) {
    score = 100;
    reasons.push(`IP cluster: ${signupsFromSubnet} signups from subnet`);
  } else if (signupsFromSubnet > 10) {
    score = 60;
    reasons.push(`High subnet activity: ${signupsFromSubnet} signups`);
  } else if (signupsFromSubnet > 5) {
    score = 30;
    reasons.push(`Moderate subnet activity: ${signupsFromSubnet} signups`);
  }
  
  return score;
}

/**
 * Behavioral scoring: Unnatural interaction patterns
 */
async function computeBehavioralScore(
  userId: string,
  reasons: string[]
): Promise<number> {
  const db = getDb();
  
  // Check user profile completeness
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();
  
  if (!userData) return 0;
  
  let score = 0;
  
  // Empty profile (common for bots)
  if (!userData.displayName || !userData.photoURL) {
    score += 40;
    reasons.push('Incomplete profile');
  }
  
  // Time to first action (too fast = bot)
  if (userData.createdAt) {
    const firstReferralSnapshot = await db
      .collection('referrals')
      .where('referrerId', '==', userId)
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get();
    
    if (!firstReferralSnapshot.empty) {
      const firstReferral = firstReferralSnapshot.docs[0].data();
      const timeToReferral = firstReferral.createdAt.toDate().getTime() - userData.createdAt.toDate().getTime();
      
      if (timeToReferral < 60000) { // < 1 minute
        score += 60;
        reasons.push('Instant referral creation (bot-like)');
      }
    }
  }
  
  return Math.min(100, score);
}

