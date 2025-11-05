import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { MCPMessage, AgentLog, AgentName, OperationType } from '../types/mcpTypes';
import { redactPII } from '../ai/piiRedaction';

const getDb = () => admin.firestore();

/**
 * Generate unique log ID
 */
function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Truncate rationale to 240 characters
 */
function truncateRationale(rationale: string): string {
  if (rationale.length <= 240) {
    return rationale;
  }
  return rationale.substring(0, 237) + '...';
}

/**
 * Log agent decision
 * 
 * Usage:
 * ```typescript
 * const result = await logAgentCall(
 *   'orchestrator',
 *   'decide',
 *   { userRole, sessionContext },
 *   async () => {
 *     // Your agent logic here
 *     return decision;
 *   },
 *   userId,
 *   ['role', 'sessions', 'cooldown']
 * );
 * ```
 */
export async function logAgentCall<T>(
  agentName: AgentName,
  operation: OperationType,
  input: any,
  agentFn: () => Promise<T>,
  userId: string,
  featuresUsed: string[],
  metadata?: { [key: string]: any }
): Promise<T> {
  const startTime = Date.now();
  
  try {
    // Execute agent logic
    const output = await agentFn();
    const latency = Date.now() - startTime;
    
    // Extract rationale from output if available
    let rationale = 'No rationale provided';
    if (typeof output === 'object' && output !== null) {
      rationale = (output as any).rationale || rationale;
    }
    
    // Truncate and redact rationale
    const sanitizedRationale = redactPII(truncateRationale(rationale));
    
    // Create MCP message
    const mcpMessage: MCPMessage = {
      agentName,
      operation,
      input: sanitizeInput(input), // Remove PII from input
      output: sanitizeOutput(output), // Remove PII from output
      rationale: sanitizedRationale,
      featuresUsed,
      latency,
      timestamp: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      userId,
      metadata,
    };
    
    // Log to Firestore (async, don't block return)
    persistLog(userId, mcpMessage).catch((error) => {
      logger.error('❌ Failed to persist agent log', {
        error: error.message,
        agentName,
        operation,
        userId: userId.substring(0, 8),
      });
    });
    
    // Log to Cloud Functions logs
    logger.info(`🤖 Agent call: ${agentName}.${operation}`, {
      userId: userId.substring(0, 8),
      latency,
      featuresUsed,
      rationale: sanitizedRationale.substring(0, 100),
    });
    
    return output;
  } catch (error: any) {
    const latency = Date.now() - startTime;
    
    // Log error
    logger.error(`❌ Agent call failed: ${agentName}.${operation}`, {
      error: error.message,
      userId: userId.substring(0, 8),
      latency,
    });
    
    // Still try to log the failure
    const mcpMessage: MCPMessage = {
      agentName,
      operation,
      input: sanitizeInput(input),
      output: { error: error.message },
      rationale: `Error: ${error.message}`,
      featuresUsed,
      latency,
      timestamp: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      userId,
      metadata: { ...metadata, failed: true },
    };
    
    persistLog(userId, mcpMessage).catch(() => {
      // Silent fail on log persistence error
    });
    
    throw error;
  }
}

/**
 * Persist log to Firestore
 */
async function persistLog(userId: string, mcpMessage: MCPMessage): Promise<void> {
  const db = getDb();
  const logId = generateLogId();
  
  const agentLog: any = {
    logId,
    ...mcpMessage,
    // Extract loop/experiment metadata if present
    loopType: mcpMessage.metadata?.loopType,
    experimentId: mcpMessage.metadata?.experimentId,
    variantId: mcpMessage.metadata?.variantId,
  };
  
  // Remove ALL undefined values recursively (Firestore doesn't accept them)
  const cleanedLog = removeUndefined(agentLog);
  
  await db
    .collection('agent_logs')
    .doc(userId)
    .collection('decisions')
    .doc(logId)
    .set(cleanedLog);
}

/**
 * Recursively remove undefined values from an object
 */
function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = removeUndefined(obj[key]);
      }
    }
    return cleaned;
  }
  
  return obj;
}

/**
 * Sanitize input to remove PII and undefined values
 */
function sanitizeInput(input: any): any {
  if (!input || typeof input !== 'object') {
    return input;
  }
  
  const sanitized = { ...input };
  
  // Remove sensitive fields
  delete sanitized.email;
  delete sanitized.phone;
  delete sanitized.name;
  delete sanitized.fullName;
  delete sanitized.displayName;
  
  // Remove undefined values (Firestore doesn't accept them)
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    }
  });
  
  // Redact text fields
  if (sanitized.text && typeof sanitized.text === 'string') {
    sanitized.text = redactPII(sanitized.text);
  }
  
  return sanitized;
}

/**
 * Sanitize output to remove PII and undefined values
 */
function sanitizeOutput(output: any): any {
  if (!output || typeof output !== 'object') {
    return output;
  }
  
  const sanitized = { ...output };
  
  // Keep decision-relevant fields only
  // Remove any user-identifiable information
  delete sanitized.email;
  delete sanitized.phone;
  delete sanitized.name;
  delete sanitized.displayName;
  
  // Remove undefined values (Firestore doesn't accept them)
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    }
  });
  
  return sanitized;
}

/**
 * Query agent logs for a user
 * Used by admin replay endpoint
 */
export async function queryAgentLogs(
  userId: string,
  options?: {
    agentName?: AgentName;
    operation?: OperationType;
    loopType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
): Promise<AgentLog[]> {
  const db = getDb();
  let query: admin.firestore.Query = db
    .collection('agent_logs')
    .doc(userId)
    .collection('decisions')
    .orderBy('timestamp', 'desc');
  
  if (options?.agentName) {
    query = query.where('agentName', '==', options.agentName);
  }
  
  if (options?.operation) {
    query = query.where('operation', '==', options.operation);
  }
  
  if (options?.loopType) {
    query = query.where('loopType', '==', options.loopType);
  }
  
  if (options?.startDate) {
    query = query.where('timestamp', '>=', admin.firestore.Timestamp.fromDate(options.startDate));
  }
  
  if (options?.endDate) {
    query = query.where('timestamp', '<=', admin.firestore.Timestamp.fromDate(options.endDate));
  }
  
  query = query.limit(options?.limit || 50);
  
  const snapshot = await query.get();
  return snapshot.docs.map((doc) => doc.data() as AgentLog);
}

