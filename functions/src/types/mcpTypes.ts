/**
 * MCP (Model Context Protocol) types for agent communication
 * 
 * These types define the standard format for:
 * - Agent-to-agent communication
 * - Decision logging
 * - Replay/debugging
 */

export type AgentName = 'orchestrator' | 'personalization' | 'incentives' | 'fraud' | 'experimentation';

export type OperationType = 
  | 'decide'
  | 'personalize'
  | 'issue_reward'
  | 'check_fraud'
  | 'allocate_variant';

/**
 * Standard MCP message format
 */
export interface MCPMessage {
  agentName: AgentName;
  operation: OperationType;
  input: any;
  output: any;
  rationale: string;       // ≤240 chars
  featuresUsed: string[];
  latency: number;
  timestamp: FirebaseFirestore.Timestamp;
  userId?: string;
  metadata?: { [key: string]: any };
}

/**
 * Persisted agent log
 */
export interface AgentLog extends MCPMessage {
  logId: string;
  loopType?: string;
  experimentId?: string;
  variantId?: string;
}

