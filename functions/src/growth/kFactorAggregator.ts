/**
 * K-Factor Aggregation Service
 * 
 * Aggregates experiment-level K-Factor data into a simplified 
 * k_factor_metrics collection for faster admin dashboard queries
 * 
 * Runs daily after computeKFactor completes
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';

const getDb = () => admin.firestore();

/**
 * Aggregate K-Factor metrics
 * Runs every day at 3am UTC (1 hour after computeKFactor)
 */
export const aggregateKFactorMetrics = onSchedule(
  {
    schedule: 'every day 03:00',
    timeZone: 'UTC',
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async () => {
    const startTime = Date.now();
    logger.info('📊 Starting K-Factor aggregation...');
    
    try {
      const db = getDb();
      
      // Get yesterday's date (what was computed by computeKFactor at 2am)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const dateStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Get all active experiments
      const experimentsSnapshot = await db
        .collection('experiments')
        .where('status', '==', 'active')
        .get();
      
      if (experimentsSnapshot.empty) {
        logger.info('✅ No active experiments, skipping aggregation');
        return;
      }
      
      logger.info(`📈 Aggregating K-Factor for ${experimentsSnapshot.size} experiments`);
      
      // Aggregate by loop type
      const loopAggregates = new Map<string, {
        totalKFactor: number;
        count: number;
        totalInvites: number;
        totalJoins: number;
        totalUsers: number;
      }>();
      
      for (const expDoc of experimentsSnapshot.docs) {
        const expData = expDoc.data();
        const experimentId = expData.experimentId || expDoc.id;
        const loopType = expData.loopType || 'unknown';
        const variants = expData.variants || [];
        
        for (const variant of variants) {
          const variantId = variant.variantId;
          
          try {
            // Get yesterday's metrics for this variant
            const metricsDoc = await db
              .collection('experiment_metrics')
              .doc(experimentId)
              .collection('variants')
              .doc(variantId)
              .collection('daily')
              .doc(dateStr)
              .get();
            
            if (!metricsDoc.exists) {
              continue;
            }
            
            const metrics = metricsDoc.data();
            if (!metrics) continue;
            
            // Aggregate by loop type
            if (!loopAggregates.has(loopType)) {
              loopAggregates.set(loopType, {
                totalKFactor: 0,
                count: 0,
                totalInvites: 0,
                totalJoins: 0,
                totalUsers: 0,
              });
            }
            
            const agg = loopAggregates.get(loopType)!;
            agg.totalKFactor += metrics.kFactor || 0;
            agg.count += 1;
            agg.totalInvites += metrics.stats?.invites || 0;
            agg.totalJoins += metrics.stats?.joins || 0;
            agg.totalUsers += metrics.stats?.users || 0;
            
          } catch (error: any) {
            logger.error(`❌ Error aggregating ${experimentId}/${variantId}:`, {
              error: error.message,
            });
          }
        }
      }
      
      // Write aggregated metrics to k_factor_metrics collection
      const batch = db.batch();
      let writeCount = 0;
      
      loopAggregates.forEach((agg, loopType) => {
        const avgKFactor = agg.count > 0 ? agg.totalKFactor / agg.count : 0;
        const conversionRate = agg.totalInvites > 0 
          ? (agg.totalJoins / agg.totalInvites) * 100 
          : 0;
        
        const docRef = db
          .collection('k_factor_metrics')
          .doc(`${dateStr}_${loopType}`);
        
        batch.set(docRef, {
          date: admin.firestore.Timestamp.fromDate(yesterday),
          loopType,
          kFactor: avgKFactor,
          invitesSent: agg.totalInvites,
          conversions: agg.totalJoins,
          conversionRate,
          users: agg.totalUsers,
          variantCount: agg.count,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        writeCount++;
        
        logger.info(`✅ ${loopType}: K-Factor=${avgKFactor.toFixed(2)}, invites=${agg.totalInvites}, joins=${agg.totalJoins}`);
      });
      
      await batch.commit();
      
      const duration = Date.now() - startTime;
      logger.info(`✅ K-Factor aggregation complete: ${writeCount} loop types aggregated in ${duration}ms`);
      
    } catch (error: any) {
      logger.error('❌ K-Factor aggregation failed', {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

/**
 * Manual aggregation for a specific date range (admin utility)
 */
export async function aggregateKFactorForDateRange(
  startDate: Date,
  endDate: Date
): Promise<{ success: boolean; daysProcessed: number }> {
  const db = getDb();
  let daysProcessed = 0;
  
  // Iterate through each day
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    
    logger.info(`Processing ${dateStr}...`);
    
    // Get all active experiments
    const experimentsSnapshot = await db
      .collection('experiments')
      .where('status', '==', 'active')
      .get();
    
    const loopAggregates = new Map<string, {
      totalKFactor: number;
      count: number;
      totalInvites: number;
      totalJoins: number;
      totalUsers: number;
    }>();
    
    for (const expDoc of experimentsSnapshot.docs) {
      const expData = expDoc.data();
      const experimentId = expData.experimentId || expDoc.id;
      const loopType = expData.loopType || 'unknown';
      const variants = expData.variants || [];
      
      for (const variant of variants) {
        const variantId = variant.variantId;
        
        try {
          const metricsDoc = await db
            .collection('experiment_metrics')
            .doc(experimentId)
            .collection('variants')
            .doc(variantId)
            .collection('daily')
            .doc(dateStr)
            .get();
          
          if (!metricsDoc.exists) continue;
          
          const metrics = metricsDoc.data();
          if (!metrics) continue;
          
          if (!loopAggregates.has(loopType)) {
            loopAggregates.set(loopType, {
              totalKFactor: 0,
              count: 0,
              totalInvites: 0,
              totalJoins: 0,
              totalUsers: 0,
            });
          }
          
          const agg = loopAggregates.get(loopType)!;
          agg.totalKFactor += metrics.kFactor || 0;
          agg.count += 1;
          agg.totalInvites += metrics.stats?.invites || 0;
          agg.totalJoins += metrics.stats?.joins || 0;
          agg.totalUsers += metrics.stats?.users || 0;
        } catch (error: any) {
          logger.warn(`Error aggregating ${experimentId}/${variantId} for ${dateStr}:`, error.message);
        }
      }
    }
    
    // Write aggregated metrics
    const batch = db.batch();
    
    loopAggregates.forEach((agg, loopType) => {
      const avgKFactor = agg.count > 0 ? agg.totalKFactor / agg.count : 0;
      const conversionRate = agg.totalInvites > 0 
        ? (agg.totalJoins / agg.totalInvites) * 100 
        : 0;
      
      const docRef = db
        .collection('k_factor_metrics')
        .doc(`${dateStr}_${loopType}`);
      
      batch.set(docRef, {
        date: admin.firestore.Timestamp.fromDate(currentDate),
        loopType,
        kFactor: avgKFactor,
        invitesSent: agg.totalInvites,
        conversions: agg.totalJoins,
        conversionRate,
        users: agg.totalUsers,
        variantCount: agg.count,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    
    await batch.commit();
    daysProcessed++;
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return { success: true, daysProcessed };
}

