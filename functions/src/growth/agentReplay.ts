import * as logger from 'firebase-functions/logger';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { queryAgentLogs } from '../utils/agentLogger';
import { AgentName, OperationType } from '../types/mcpTypes';

/**
 * Admin endpoint to replay/debug agent decisions for a user
 * 
 * Usage:
 * ```typescript
 * const logs = await getAgentReplay({
 *   targetUserId: 'user123',
 *   agentName: 'orchestrator', // optional
 *   loopType: 'tutor_card',    // optional
 *   limit: 20
 * });
 * ```
 */
export const getAgentReplay = onCall(
  {
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request) => {
    const { auth, data } = request;
    
    // Require authentication
    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    // Require admin token
    if (!auth.token.admin) {
      throw new HttpsError('permission-denied', 'Only admins can replay agent logs');
    }
    
    const {
      targetUserId,
      agentName,
      operation,
      loopType,
      startDate,
      endDate,
      limit,
    } = data;
    
    if (!targetUserId) {
      throw new HttpsError('invalid-argument', 'targetUserId is required');
    }
    
    try {
      logger.info('🔄 Agent replay requested', {
        admin: auth.uid.substring(0, 8),
        targetUser: targetUserId.substring(0, 8),
        agentName,
        loopType,
      });
      
      // Query logs
      const logs = await queryAgentLogs(targetUserId, {
        agentName: agentName as AgentName | undefined,
        operation: operation as OperationType | undefined,
        loopType,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: limit || 50,
      });
      
      // Format response
      return {
        success: true,
        userId: targetUserId,
        logs,
        count: logs.length,
        filters: {
          agentName: agentName || 'all',
          operation: operation || 'all',
          loopType: loopType || 'all',
        },
      };
    } catch (error: any) {
      logger.error('❌ Agent replay failed', {
        error: error.message,
        targetUser: targetUserId.substring(0, 8),
      });
      
      throw new HttpsError('internal', `Failed to replay agent logs: ${error.message}`);
    }
  }
);

