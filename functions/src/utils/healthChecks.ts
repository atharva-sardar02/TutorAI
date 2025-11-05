import * as logger from 'firebase-functions/logger';
import { CircuitBreaker } from './circuitBreaker';

// Circuit breakers for each dependency
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create circuit breaker for dependency
 */
function getCircuitBreaker(name: string): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker(name));
  }
  return circuitBreakers.get(name)!;
}

/**
 * Check health of OpenAI API
 */
export async function checkOpenAIHealth(): Promise<boolean> {
  const breaker = getCircuitBreaker('openai');
  
  if (breaker.isOpen()) {
    logger.warn('OpenAI circuit breaker is OPEN');
    return false;
  }
  
  try {
    // Simple health check: Just verify API key exists
    // In production: Make lightweight API call
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    // TODO: Add actual API health check
    // const response = await fetch('https://api.openai.com/v1/models', {
    //   headers: { Authorization: `Bearer ${apiKey}` }
    // });
    
    return true;
  } catch (error: any) {
    logger.error('OpenAI health check failed', { error: error.message });
    return false;
  }
}

/**
 * Check health of Cloudinary (image/video generation)
 */
export async function checkCloudinaryHealth(): Promise<boolean> {
  const breaker = getCircuitBreaker('cloudinary');
  
  if (breaker.isOpen()) {
    logger.warn('Cloudinary circuit breaker is OPEN');
    return false;
  }
  
  try {
    // Check if credentials exist
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    
    if (!cloudName || !apiKey) {
      throw new Error('Cloudinary credentials not configured');
    }
    
    return true;
  } catch (error: any) {
    logger.error('Cloudinary health check failed', { error: error.message });
    return false;
  }
}

/**
 * Check health of Firestore
 */
export async function checkFirestoreHealth(): Promise<boolean> {
  const breaker = getCircuitBreaker('firestore');
  
  if (breaker.isOpen()) {
    logger.warn('Firestore circuit breaker is OPEN');
    return false;
  }
  
  try {
    await breaker.execute(async () => {
      const admin = await import('firebase-admin');
      const db = admin.firestore();
      // Simple read operation
      await db.collection('feature_flags').doc('growth_master').get();
    });
    
    return true;
  } catch (error: any) {
    logger.error('Firestore health check failed', { error: error.message });
    return false;
  }
}

/**
 * Run all health checks
 */
export async function runHealthChecks(): Promise<{
  healthy: boolean;
  checks: Record<string, boolean>;
}> {
  const checks = {
    openai: await checkOpenAIHealth(),
    cloudinary: await checkCloudinaryHealth(),
    firestore: await checkFirestoreHealth(),
  };
  
  const healthy = Object.values(checks).every(check => check);
  
  if (!healthy) {
    logger.warn('Health checks failed', checks);
  }
  
  return { healthy, checks };
}

/**
 * Get circuit breaker states (for monitoring)
 */
export function getCircuitBreakerStates(): Record<string, string> {
  const states: Record<string, string> = {};
  
  circuitBreakers.forEach((breaker, name) => {
    states[name] = breaker.getState();
  });
  
  return states;
}

