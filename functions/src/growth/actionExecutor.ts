/**
 * Action Executor
 * PR20: Transcription & Agentic Actions
 * 
 * Executes approved viral actions after eligibility checks
 * Integrates with Loop Orchestrator (PR16) for cooldowns and limits
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { ActionOpportunity } from './actionAnalyzer';
import { generatePrepPack } from './generatePrepPack';
import { generateProgressReel } from './generateProgressReel';
import { checkConsent } from './consentManager';
import { generateStudyBuddyChallenge } from './studyBuddyService';

export interface ExecutionResult {
  action: string;
  status: 'success' | 'skipped' | 'failed';
  reason?: string;
  output?: any;
}

/**
 * Execute approved actions after eligibility check
 * 
 * @param sessionId - Session ID
 * @param opportunities - List of action opportunities
 * @param sessionData - Session metadata
 * @returns Array of execution results
 */
export async function executeActions(
  sessionId: string,
  opportunities: ActionOpportunity[],
  sessionData: any
): Promise<ExecutionResult[]> {
  
  const results: ExecutionResult[] = [];
  const db = admin.firestore();
  
  logger.info('⚡ Starting action execution', {
    sessionId,
    actionCount: opportunities.length,
    actions: opportunities.map(o => o.type),
  });
  
  for (const opportunity of opportunities) {
    const { type, metadata } = opportunity;
    
    try {
      // Step 1: Check eligibility
      // For now, simple checks - can integrate with PR16 orchestrator later
      const eligible = await checkSimpleEligibility(
        sessionData.tutorId || sessionData.createdBy,
        type,
        sessionId
      );
      
      if (!eligible.isEligible) {
        results.push({
          action: type,
          status: 'skipped',
          reason: eligible.reason,
        });
        
        logger.info(`⏭️ Skipped ${type}`, {
          sessionId,
          reason: eligible.reason,
        });
        
        continue;
      }
      
      // Step 2: Execute action
      let output: any;
      
      switch (type) {
        case 'tutorCard':
          // PR18: Generate shareable tutor card
          // TODO: Implement when PR18 is complete
          logger.info('TutorCard generation pending PR18 implementation');
          output = { status: 'pending_pr18', metadata };
          break;
        
        case 'progressReel':
          // PR19: Generate progress reel (requires consent)
          output = await executeProgressReel(sessionId, opportunity, sessionData);
          break;
        
        case 'studyBuddy':
          // PR23: Create study buddy challenge
          output = await executeStudyBuddy(sessionId, opportunity, sessionData);
          break;
        
        case 'prepPack':
          // PR20: Generate study materials
          output = await generatePrepPack(sessionId, {
            topics: metadata.topics,
            nextSteps: metadata.nextSteps,
          });
          break;
        
        case 'parentPod':
          // PR24: Generate group invite link
          logger.info('ParentPod generation pending PR24 implementation');
          output = { status: 'pending_pr24', metadata };
          break;
        
        default:
          throw new Error(`Unknown action type: ${type}`);
      }
      
      // Step 3: Record success
      results.push({
        action: type,
        status: 'success',
        output,
      });
      
      // Step 4: Log exposure for metrics (PR17)
      await db.collection('loop_exposures').add({
        userId: sessionData.tutorId || sessionData.createdBy,
        loopType: type,
        context: { sessionId },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        result: 'executed',
      });
      
      logger.info(`✅ Executed ${type}`, {
        sessionId,
        hasOutput: !!output,
      });
      
    } catch (error: any) {
      results.push({
        action: type,
        status: 'failed',
        reason: error.message,
      });
      
      logger.error(`❌ Failed ${type}`, {
        sessionId,
        error: error.message,
        stack: error.stack,
      });
      
      // Continue with other actions even if one fails
    }
  }
  
  // Step 5: Send notification to user (if any actions succeeded)
  const successActions = results.filter(r => r.status === 'success');
  if (successActions.length > 0) {
    await sendSessionNotification(sessionData, successActions);
  }
  
  logger.info('✅ Action execution complete', {
    sessionId,
    results: results.map(r => ({ action: r.action, status: r.status })),
    successCount: successActions.length,
  });
  
  return results;
}

/**
 * Execute progress reel generation
 * PR19: Progress Reels
 */
async function executeProgressReel(
  sessionId: string,
  opportunity: ActionOpportunity,
  sessionData: any
): Promise<ExecutionResult> {
  try {
    // Check consent
    const userId = sessionData.tutorId || sessionData.userId;
    const hasConsent = await checkConsent(userId, 'progressSharing');
    
    if (!hasConsent) {
      return {
        action: 'progressReel',
        status: 'skipped',
        reason: 'User has not granted consent for progress sharing',
      };
    }
    
    // Check if video consent is required (from metadata)
    if (opportunity.metadata.hasConsent === false) {
      return {
        action: 'progressReel',
        status: 'skipped',
        reason: 'Video consent not granted',
      };
    }
    
    // Generate reel
    const reelId = await generateProgressReel({
      sessionId,
      userId,
      summary: opportunity.metadata,
    });
    
    // Queue notification
    await queueNotification(userId, {
      type: 'progress_reel_ready',
      title: 'Your Progress Reel is Ready! 🎥',
      body: 'Share your student\'s achievements with friends',
      data: {
        type: 'progress_reel',
        reelId,
        sessionId,
      },
    });
    
    return {
      action: 'progressReel',
      status: 'success',
      output: { reelId },
    };
  } catch (error: any) {
    return {
      action: 'progressReel',
      status: 'failed',
      reason: error.message,
    };
  }
}

/**
 * Queue notification for progress reel ready
 */
async function queueNotification(
  userId: string,
  notification: {
    type: string;
    title: string;
    body: string;
    data: any;
  }
): Promise<void> {
  const db = admin.firestore();
  
  await db.collection('notifications').add({
    userId,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  logger.info('📬 Notification queued', {
    userId: userId.substring(0, 8),
    type: notification.type,
  });
}

/**
 * Execute study buddy challenge creation
 * PR23: Study Buddy Challenge
 */
async function executeStudyBuddy(
  sessionId: string,
  opportunity: ActionOpportunity,
  sessionData: any
): Promise<ExecutionResult> {
  try {
    const userId = sessionData.tutorId || sessionData.userId;
    const { subject, topic, difficulty } = opportunity.metadata;
    
    // Check cooldown (48h per subject)
    const cooldownKey = `studyBuddy_${subject}`;
    const db = admin.firestore();
    const cooldownRef = db
      .collection('cooldowns')
      .doc(userId)
      .collection('loops')
      .doc(cooldownKey);
    
    const cooldownDoc = await cooldownRef.get();
    if (cooldownDoc.exists) {
      const lastCreated = cooldownDoc.data()?.lastCreatedAt;
      if (lastCreated) {
        const hoursSince = (Date.now() - lastCreated.toMillis()) / (1000 * 60 * 60);
        if (hoursSince < 48) {
          return {
            action: 'studyBuddy',
            status: 'skipped',
            reason: `Cooldown active (${Math.round(48 - hoursSince)}h remaining)`,
          };
        }
      }
    }
    
    // Generate challenge
    const challenge = await generateStudyBuddyChallenge(
      userId,
      subject,
      topic,
      difficulty || 'medium'
    );
    
    // PR30: Determine if this is a parent-child challenge
    const userDoc = await db.collection('users').doc(userId).get();
    const userRole = userDoc.data()?.userType;
    
    // Set cooldown
    await cooldownRef.set({
      loopType: 'studyBuddy',
      subject,
      lastCreatedAt: admin.firestore.Timestamp.now(),
    });
    
    // PR30: Queue notification with parent-specific messaging
    await queueNotification(userId, {
      type: 'study_buddy_ready',
      title: userRole === 'parent' ? 'Challenge Your Child! 👨‍👩‍👧‍👦' : 'Challenge Your Friends! 🎯',
      body: userRole === 'parent' 
        ? `Challenge your child to practice ${subject} together`
        : `Share your ${subject} quiz and earn rewards together`,
      data: {
        type: 'study_buddy',
        challengeId: challenge.challengeId,
        subject,
      },
    });
    
    return {
      action: 'studyBuddy',
      status: 'success',
      output: { 
        challengeId: challenge.challengeId,
        shareUrl: `https://messageai.app/studyBuddy?challengeId=${challenge.challengeId}&ref=${challenge.referralId}`,
      },
    };
  } catch (error: any) {
    return {
      action: 'studyBuddy',
      status: 'failed',
      reason: error.message,
    };
  }
}

/**
 * Simple eligibility check (placeholder for PR16 orchestrator integration)
 */
async function checkSimpleEligibility(
  userId: string,
  actionType: string,
  sessionId: string
): Promise<{ isEligible: boolean; reason?: string }> {
  
  // For now, always allow (can integrate with PR16 later for cooldowns, limits, etc.)
  return { isEligible: true };
}

/**
 * Send push notification when session highlights are ready
 */
async function sendSessionNotification(
  sessionData: any,
  successActions: ExecutionResult[]
): Promise<void> {
  
  const userId = sessionData.tutorId || sessionData.createdBy;
  if (!userId) {
    logger.warn('No userId found for notification');
    return;
  }
  
  const title = '✨ Session Highlights Ready!';
  const actionCount = successActions.length;
  const body = `Your session summary and ${actionCount} insight${actionCount > 1 ? 's' : ''} are ready to view.`;
  
  // Store notification in Firestore (will be picked up by push notification service)
  const db = admin.firestore();
  await db.collection('notifications').add({
    userId,
    title,
    body,
    data: {
      type: 'session_summary',
      sessionId: sessionData.sessionId || sessionData.id,
      actions: successActions.map(a => a.action).join(','),
    },
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  logger.info('📬 Notification queued', {
    userId,
    sessionId: sessionData.sessionId,
    actionCount,
  });
}

