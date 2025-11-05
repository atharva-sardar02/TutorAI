import * as admin from 'firebase-admin';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from admin-dashboard/.env
config({ path: resolve(__dirname, '../../admin-dashboard/.env') });

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'messageai-88921';
  console.log(`Using Firebase project: ${projectId}`);
  
  admin.initializeApp({
    projectId: projectId,
  });
}

/**
 * Set admin custom claim for a user
 * Usage: npx ts-node scripts/setAdminClaim.ts <email> [role]
 * Example: npx ts-node scripts/setAdminClaim.ts admin@tutorai.app admin
 */
async function setAdminClaim(email: string, role: 'admin' | 'analyst' | 'support' = 'admin') {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
      role: role,
    });
    
    console.log(`✅ Admin claim set for ${email}`);
    console.log(`   UID: ${user.uid}`);
    console.log(`   Role: ${role}`);
    console.log(`   The user needs to sign out and sign back in for changes to take effect.`);
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error setting admin claim:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const email = process.argv[2];
const role = (process.argv[3] as 'admin' | 'analyst' | 'support') || 'admin';

if (!email) {
  console.error('Usage: npx ts-node scripts/setAdminClaim.ts <email> [role]');
  console.error('Example: npx ts-node scripts/setAdminClaim.ts admin@tutorai.app admin');
  process.exit(1);
}

setAdminClaim(email, role);

