import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';

/**
 * One-time setup function to create admin user
 * 
 * SECURITY: This function should be removed after initial setup!
 * 
 * Usage:
 * 1. Deploy: firebase deploy --only functions:setupAdminUser
 * 2. Call: https://us-central1-messageai-88921.cloudfunctions.net/setupAdminUser
 * 3. Remove this function after setup is complete
 */
export const setupAdminUser = onRequest(
  {
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (req, res) => {
    try {
      const adminEmail = 'admin@tutorai.app';
      
      logger.info('🔧 Setting up admin user', { adminEmail });
      
      // Check if user exists, if not create them
      let user;
      try {
        user = await admin.auth().getUserByEmail(adminEmail);
        logger.info('✅ User already exists', { uid: user.uid });
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          // Create the user
          user = await admin.auth().createUser({
            email: adminEmail,
            password: 'ChangeMe123!', // CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN
            displayName: 'Admin',
          });
          logger.info('✅ User created', { uid: user.uid });
        } else {
          throw error;
        }
      }
      
      // Set custom claims
      await admin.auth().setCustomUserClaims(user.uid, {
        admin: true,
        role: 'admin',
      });
      
      logger.info('✅ Admin claims set', { uid: user.uid });
      
      res.status(200).json({
        success: true,
        message: 'Admin user setup complete!',
        email: adminEmail,
        uid: user.uid,
        tempPassword: 'ChangeMe123!',
        instructions: [
          '1. Go to your admin dashboard',
          '2. Login with: admin@tutorai.app / ChangeMe123!',
          '3. Change your password immediately',
          '4. IMPORTANT: Remove this function by deleting functions/src/admin/setupAdmin.ts',
        ],
      });
      
    } catch (error: any) {
      logger.error('❌ Failed to setup admin user', {
        error: error.message,
        stack: error.stack,
      });
      
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

