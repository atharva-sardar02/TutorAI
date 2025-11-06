/**
 * Seed Test Data for Viral Loops Testing
 * 
 * Creates realistic test data for testing viral growth features:
 * - 2 Tutors (tutor1, tutor2)
 * - 2 Parents (parent1, parent2)
 * - Conversations with realistic messages
 * - Session recordings and transcripts
 * - Referrals and attributions
 * - XP balances and activity
 * 
 * Usage:
 *   node scripts/seed-test-data.js
 * 
 * Requirements:
 *   - Firebase Admin SDK initialized
 *   - Service account key in .env or environment
 */

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();
const auth = admin.auth();

// Test Users Configuration
const USERS = {
  tutor1: {
    email: 'tutor1@test.com',
    password: 'Test123!',
    displayName: 'Alex Chen',
    role: 'tutor',
    age: 28,
    subjects: ['Math', 'Physics', 'SAT Prep'],
    photoURL: 'https://i.pravatar.cc/150?u=tutor1',
  },
  tutor2: {
    email: 'tutor2@test.com',
    password: 'Test123!',
    displayName: 'Maria Rodriguez',
    role: 'tutor',
    age: 25,
    subjects: ['English', 'History', 'College Essays'],
    photoURL: 'https://i.pravatar.cc/150?u=tutor2',
  },
  parent1: {
    email: 'parent1@test.com',
    password: 'Test123!',
    displayName: 'Sarah Johnson',
    role: 'parent',
    age: 42,
    photoURL: 'https://i.pravatar.cc/150?u=parent1',
  },
  parent2: {
    email: 'parent2@test.com',
    password: 'Test123!',
    displayName: 'David Kim',
    role: 'parent',
    age: 45,
    photoURL: 'https://i.pravatar.cc/150?u=parent2',
  },
};

// Conversation Templates
const CONVERSATIONS = [
  {
    tutorKey: 'tutor1',
    parentKey: 'parent1',
    studentName: 'Emma Johnson',
    messages: [
      { sender: 'parent', text: "Hi Alex! I'm looking for help with my daughter Emma's SAT prep. She's struggling with the math section.", delay: 0 },
      { sender: 'tutor', text: "Hi Sarah! I'd be happy to help Emma with SAT Math. I've been tutoring SAT prep for 5 years and have a 95% success rate with score improvements.", delay: 300000 },
      { sender: 'parent', text: "That sounds great! She's currently scoring around 580 on math practice tests. What's your approach?", delay: 600000 },
      { sender: 'tutor', text: "I focus on identifying weak areas first, then we build a personalized study plan. For 580, we typically see 100-150 point improvements in 8-12 weeks.", delay: 900000 },
      { sender: 'parent', text: "Perfect! Can we schedule a trial session this week?", delay: 1200000 },
      { sender: 'tutor', text: "Absolutely! I have availability Tuesday at 4pm or Thursday at 6pm. Which works better?", delay: 1500000 },
      { sender: 'parent', text: "Thursday at 6pm works great! I'll have Emma ready.", delay: 1800000 },
      { sender: 'tutor', text: "Excellent! I'll send you a calendar invite. Looking forward to working with Emma! 📚", delay: 2100000 },
    ],
  },
  {
    tutorKey: 'tutor2',
    parentKey: 'parent1',
    studentName: 'Emma Johnson',
    messages: [
      { sender: 'parent', text: "Hi Maria! Emma is working on her college essays and could use some guidance. Do you help with Common App essays?", delay: 0 },
      { sender: 'tutor', text: "Hi Sarah! Yes, college essay coaching is one of my specialties. I've helped over 50 students get into their dream schools!", delay: 300000 },
      { sender: 'parent', text: "Wonderful! Emma is applying to several UCs and some private schools. She's having trouble finding her unique angle.", delay: 600000 },
      { sender: 'tutor', text: "That's very common! I use a structured brainstorming process to help students discover their authentic voice. We'll start with her core values and experiences.", delay: 900000 },
      { sender: 'parent', text: "That's exactly what she needs. When can we start?", delay: 1200000 },
      { sender: 'tutor', text: "I have a spot available this Saturday at 2pm for our first brainstorming session. Does that work?", delay: 1500000 },
      { sender: 'parent', text: "Perfect! See you then! 🎓", delay: 1800000 },
    ],
  },
  {
    tutorKey: 'tutor1',
    parentKey: 'parent2',
    studentName: 'Jason Kim',
    messages: [
      { sender: 'parent', text: "Hello! I was referred by Sarah Johnson. She said you're excellent with SAT math prep?", delay: 0 },
      { sender: 'tutor', text: "Hi David! Yes, Sarah's daughter Emma is doing great - we've already improved her score by 80 points! Happy to help Jason too.", delay: 300000 },
      { sender: 'parent', text: "That's impressive! Jason is a junior and wants to get his math score from 620 to 700+.", delay: 600000 },
      { sender: 'tutor', text: "That's a very achievable goal! At his level, we'll focus on advanced problem-solving strategies and test-taking techniques.", delay: 900000 },
      { sender: 'parent', text: "Sounds good. What's your availability like?", delay: 1200000 },
      { sender: 'tutor', text: "I have Monday and Wednesday evenings open. We can start next week if you'd like!", delay: 1500000 },
      { sender: 'parent', text: "Let's do Monday at 7pm. Thanks for fitting us in!", delay: 1800000 },
      { sender: 'tutor', text: "Great! I'll send over some diagnostic problems for Jason to try before our first session. 📊", delay: 2100000 },
    ],
  },
  {
    tutorKey: 'tutor1',
    parentKey: 'tutor2',
    studentName: 'Professional Development',
    messages: [
      { sender: 'parent', text: "Hey Alex! Quick question - I have a student struggling with algebra word problems. Any resources you'd recommend?", delay: 0 },
      { sender: 'tutor', text: "Hey Maria! I've got a great workbook I use for that. I can send you the PDF if you want. Also, Khan Academy's word problem section is solid.", delay: 300000 },
      { sender: 'parent', text: "That would be amazing! Also, I love this platform. Have you tried the session recording feature?", delay: 600000 },
      { sender: 'tutor', text: "Yes! It's been super helpful for parents to review what we covered. The auto-summaries are a game changer.", delay: 900000 },
      { sender: 'parent', text: "Right?! I've been getting great feedback. We should compare notes sometime on what's working best.", delay: 1200000 },
      { sender: 'tutor', text: "Definitely! Let me know if you ever want to grab coffee and talk tutoring strategies. 📚☕", delay: 1500000 },
      { sender: 'parent', text: "Will do! Thanks for the resources!", delay: 1800000 },
    ],
  },
];

// Helper Functions
async function createUser(userKey, userData) {
  console.log(`Creating user: ${userData.email}...`);
  
  try {
    // Create Firebase Auth user
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
      });
      console.log(`  ✓ Auth user created: ${userRecord.uid}`);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        userRecord = await auth.getUserByEmail(userData.email);
        console.log(`  ℹ Auth user already exists: ${userRecord.uid}`);
      } else {
        throw error;
      }
    }
    
    const uid = userRecord.uid;
    
    // Create Firestore user document
    await db.collection('users').doc(uid).set({
      uid,
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      role: userData.role,
      age: userData.age,
      subjects: userData.subjects || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      presence: {
        status: 'online',
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      },
      ...(userData.role === 'tutor' ? { linkedParentIds: [] } : { linkedTutorIds: [] }),
    });
    console.log(`  ✓ Firestore user document created`);
    
    // Create initial XP balance
    await db.collection('balances').doc(uid).set({
      userId: uid,
      xpBalance: Math.floor(Math.random() * 500) + 100,
      classPassBalance: 0,
      lifetimeXp: Math.floor(Math.random() * 1000) + 200,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`  ✓ Balance document created`);
    
    return uid;
  } catch (error) {
    console.error(`  ✗ Error creating user ${userData.email}:`, error.message);
    throw error;
  }
}

async function createConversation(conversation, userIds) {
  const tutorUid = userIds[conversation.tutorKey];
  const parentUid = userIds[conversation.parentKey];
  
  console.log(`\nCreating conversation: ${USERS[conversation.tutorKey].displayName} ↔ ${USERS[conversation.parentKey].displayName}...`);
  
  const conversationId = uuidv4();
  const participants = [tutorUid, parentUid];
  
  // Create conversation document
  await db.collection('conversations').doc(conversationId).set({
    conversationId,
    participants,
    participantNames: [
      USERS[conversation.tutorKey].displayName,
      USERS[conversation.parentKey].displayName,
    ],
    studentName: conversation.studentName,
    subject: USERS[conversation.tutorKey].subjects?.[0] || 'General',
    lastMessage: conversation.messages[conversation.messages.length - 1].text,
    lastMessageAt: admin.firestore.Timestamp.fromMillis(
      Date.now() - (86400000 - conversation.messages[conversation.messages.length - 1].delay)
    ),
    createdAt: admin.firestore.Timestamp.fromMillis(Date.now() - 86400000),
    unreadCount: 0,
  });
  console.log(`  ✓ Conversation created: ${conversationId}`);
  
  // Create messages
  const messagesRef = db.collection('conversations').doc(conversationId).collection('messages');
  const baseTimestamp = Date.now() - 86400000; // 24 hours ago
  
  for (let i = 0; i < conversation.messages.length; i++) {
    const msg = conversation.messages[i];
    const messageId = uuidv4();
    const senderId = msg.sender === 'tutor' ? tutorUid : parentUid;
    const senderName = msg.sender === 'tutor' 
      ? USERS[conversation.tutorKey].displayName 
      : USERS[conversation.parentKey].displayName;
    
    await messagesRef.doc(messageId).set({
      messageId,
      senderId,
      senderName,
      text: msg.text,
      timestamp: admin.firestore.Timestamp.fromMillis(baseTimestamp + msg.delay),
      readBy: [senderId],
      type: 'text',
    });
  }
  console.log(`  ✓ ${conversation.messages.length} messages created`);
  
  return conversationId;
}

async function createReferral(referrerId, referredUserId, conversionType = 'signup') {
  const referralId = uuidv4();
  
  await db.collection('referrals').doc(referralId).set({
    referralId,
    referrerId,
    referredUserId,
    referralCode: `REF-${referrerId.substring(0, 8).toUpperCase()}`,
    source: 'tutor_card',
    status: 'converted',
    conversionType, // 'signup', 'first_session', 'active_user'
    conversionDetails: {
      completedAt: admin.firestore.Timestamp.now(),
      sessionCount: conversionType === 'first_session' ? 1 : 0,
    },
    createdAt: admin.firestore.Timestamp.fromMillis(Date.now() - 7 * 86400000), // 7 days ago
    convertedAt: admin.firestore.Timestamp.now(),
    metadata: {
      platform: 'mobile',
      deviceType: 'ios',
    },
  });
  
  console.log(`  ✓ Referral created: ${referrerId.substring(0, 8)} → ${referredUserId.substring(0, 8)}`);
}

async function createSessionRecording(conversationId, tutorUid, parentUid) {
  const recordingId = uuidv4();
  
  await db.collection('session_recordings').doc(recordingId).set({
    recordingId,
    conversationId,
    tutorId: tutorUid,
    parentId: parentUid,
    recordedAt: admin.firestore.Timestamp.fromMillis(Date.now() - 3600000), // 1 hour ago
    duration: 2700, // 45 minutes
    fileSize: 15728640, // ~15MB
    storageUrl: `gs://test-bucket/recordings/${recordingId}.m4a`,
    status: 'transcribed',
    transcriptText: 'Sample transcript of the tutoring session...',
    summary: 'Covered quadratic equations and SAT problem-solving strategies. Student showed good progress on factoring techniques.',
    processingCompletedAt: admin.firestore.Timestamp.fromMillis(Date.now() - 1800000), // 30 min ago
  });
  
  console.log(`  ✓ Session recording created: ${recordingId.substring(0, 8)}`);
}

// Main Seeding Function
async function seedTestData() {
  console.log('🌱 Starting test data seeding...\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Create users
    console.log('\n📝 Step 1: Creating users...');
    console.log('-'.repeat(60));
    
    const userIds = {};
    for (const [key, userData] of Object.entries(USERS)) {
      userIds[key] = await createUser(key, userData);
    }
    
    console.log('\n✅ All users created successfully!');
    console.log('User IDs:', Object.entries(userIds).map(([k, v]) => `${k}: ${v.substring(0, 8)}`).join(', '));
    
    // Step 2: Link tutors and parents
    console.log('\n🔗 Step 2: Linking tutors and parents...');
    console.log('-'.repeat(60));
    
    // Parent1 linked to both tutors
    await db.collection('users').doc(userIds.parent1).update({
      linkedTutorIds: [userIds.tutor1, userIds.tutor2],
    });
    console.log(`  ✓ parent1 → tutor1, tutor2`);
    
    // Parent2 linked to tutor1
    await db.collection('users').doc(userIds.parent2).update({
      linkedTutorIds: [userIds.tutor1],
    });
    console.log(`  ✓ parent2 → tutor1`);
    
    // Tutor1 linked to both parents
    await db.collection('users').doc(userIds.tutor1).update({
      linkedParentIds: [userIds.parent1, userIds.parent2],
    });
    console.log(`  ✓ tutor1 ← parent1, parent2`);
    
    // Tutor2 linked to parent1 and tutor1 (for tutor-to-tutor connection)
    await db.collection('users').doc(userIds.tutor2).update({
      linkedParentIds: [userIds.parent1, userIds.tutor1],
    });
    console.log(`  ✓ tutor2 ← parent1, tutor1`);
    
    // Step 3: Create conversations
    console.log('\n💬 Step 3: Creating conversations...');
    console.log('-'.repeat(60));
    
    const conversationIds = [];
    for (const conv of CONVERSATIONS) {
      const convId = await createConversation(conv, userIds);
      conversationIds.push(convId);
    }
    
    // Step 4: Create referrals (viral loop testing)
    console.log('\n🎁 Step 4: Creating referrals...');
    console.log('-'.repeat(60));
    
    // Parent2 was referred by Parent1
    await createReferral(userIds.parent1, userIds.parent2, 'first_session');
    
    // Tutor2 was referred by Tutor1
    await createReferral(userIds.tutor1, userIds.tutor2, 'signup');
    
    // Step 5: Create session recordings (for Session Intelligence)
    console.log('\n🎙️  Step 5: Creating session recordings...');
    console.log('-'.repeat(60));
    
    await createSessionRecording(conversationIds[0], userIds.tutor1, userIds.parent1);
    await createSessionRecording(conversationIds[2], userIds.tutor1, userIds.parent2);
    
    // Step 6: Create some activity events
    console.log('\n📊 Step 6: Creating activity events...');
    console.log('-'.repeat(60));
    
    const eventId = uuidv4();
    await db.collection('events').doc(eventId).set({
      eventId,
      tutorId: userIds.tutor1,
      parentIds: [userIds.parent1],
      participants: [userIds.tutor1, userIds.parent1],
      studentName: 'Emma Johnson',
      subject: 'Math',
      startTime: admin.firestore.Timestamp.fromMillis(Date.now() + 2 * 86400000), // 2 days from now
      endTime: admin.firestore.Timestamp.fromMillis(Date.now() + 2 * 86400000 + 3600000), // +1 hour
      status: 'scheduled',
      createdAt: admin.firestore.Timestamp.now(),
      createdBy: userIds.parent1,
    });
    console.log(`  ✓ Scheduled event created`);
    
    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST DATA SEEDING COMPLETE!\n');
    
    console.log('📱 Login Credentials:');
    console.log('-'.repeat(60));
    Object.entries(USERS).forEach(([key, user]) => {
      console.log(`${key.padEnd(10)} | ${user.email.padEnd(25)} | ${user.password}`);
    });
    
    console.log('\n🔬 Test Scenarios:');
    console.log('-'.repeat(60));
    console.log('1. Login as tutor1 → See conversations with parent1 and parent2');
    console.log('2. Login as parent1 → See conversations with both tutors');
    console.log('3. Check Activity Feed → See session recordings and referrals');
    console.log('4. Test Referral Flow → parent1 referred parent2');
    console.log('5. Test Tutor Card → Generate and share from tutor1\'s profile');
    console.log('6. Test Progress Reel → View session summaries');
    console.log('7. Test Study Buddy → parent1 and parent2 connection');
    console.log('8. Test Parent Pod → parent1 can invite parent2');
    
    console.log('\n💡 Next Steps:');
    console.log('-'.repeat(60));
    console.log('1. Open the mobile app');
    console.log('2. Login with any of the credentials above');
    console.log('3. Test the viral loops end-to-end');
    console.log('4. Check the admin dashboard for metrics');
    
    console.log('\n🎉 Happy testing!\n');
    
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    process.exit(1);
  }
}

// Run the seeding
seedTestData()
  .then(() => {
    console.log('Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

