/**
 * Captcha Handler - PR22
 * 
 * Integrates hCaptcha for bot challenge verification
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET || 'test-secret-key';

export const verifyCaptcha = onCall(async (request) => {
  const { auth, data } = request;
  const { token } = data;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  if (!token) {
    throw new HttpsError('invalid-argument', 'Captcha token is required');
  }
  
  try {
    // Verify with hCaptcha API
    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${HCAPTCHA_SECRET}&response=${token}`,
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Mark user as verified
      await admin.firestore()
        .collection('users')
        .doc(auth.uid)
        .update({
          captchaVerified: true,
          captchaVerifiedAt: admin.firestore.Timestamp.now(),
        });
      
      logger.info('✅ Captcha verified', {
        userId: auth.uid.substring(0, 8),
      });
      
      return { success: true };
    } else {
      logger.warn('❌ Captcha verification failed', {
        userId: auth.uid.substring(0, 8),
        errors: result['error-codes'],
      });
      
      throw new HttpsError('invalid-argument', 'Captcha verification failed');
    }
  } catch (error: any) {
    logger.error('❌ Captcha verification error', {
      error: error.message,
    });
    throw new HttpsError('internal', 'Failed to verify captcha');
  }
});

