const admin = require('firebase-admin');

// Initialize Firebase Admin (will use default credentials from Firebase CLI)
admin.initializeApp();

const db = admin.firestore();

async function enableTutorCards() {
  try {
    // Enable master kill-switch
    await db.collection('feature_flags').doc('growth_master').set({
      enabled: true,
      description: 'Master kill-switch for all growth features',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Enabled growth_master');

    // Enable tutor cards
    await db.collection('feature_flags').doc('loops.tutorCard').set({
      enabled: true,
      description: 'Tutor card generation feature',
      rolloutPercent: 100,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ Enabled loops.tutorCard');

    console.log('\n🎉 Feature flags enabled! Try the app again.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

enableTutorCards();
