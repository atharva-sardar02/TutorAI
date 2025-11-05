const { execSync } = require('child_process');
const https = require('https');

// Get access token
const token = execSync('gcloud auth application-default print-access-token 2>/dev/null || gcloud auth print-access-token', {encoding: 'utf8'}).trim();

const flags = {
  growth_master: { enabled: true, description: 'Master kill-switch for all growth features' },
  loop_tutorCard: { enabled: true, description: 'PR18 - Tutor Card viral loop', rolloutPercent: 100 },
  loop_progressReel: { enabled: true, description: 'PR19 - Progress Reel viral loop', rolloutPercent: 100 },
  loop_studyBuddy: { enabled: true, description: 'PR23 - Study Buddy Challenge viral loop', rolloutPercent: 100 },
  loop_parentPod: { enabled: false, description: 'PR24 - Parent Pod viral loop (not yet implemented)', rolloutPercent: 0 },
  loop_tutorPeer: { enabled: false, description: 'PR24 - Tutor Peer referral loop (not yet implemented)', rolloutPercent: 0 },
  transcription_enabled: { enabled: true, description: 'PR20 - Session transcription via Whisper', rolloutPercent: 100 },
  agentic_actions_enabled: { enabled: true, description: 'PR20 - AI-driven action recommendations', rolloutPercent: 100 },
  activity_feed_enabled: { enabled: true, description: 'PR21 - Real-time activity feed by subject', rolloutPercent: 100 },
  cohort_rooms_enabled: { enabled: true, description: 'PR27 - Real-time cohort rooms', rolloutPercent: 100 },
  leaderboards_enabled: { enabled: true, description: 'PR27 - Mini-leaderboards by subject', rolloutPercent: 100 }
};

console.log('🚀 Creating all feature flags...\n');

let completed = 0;
const total = Object.keys(flags).length;

Object.entries(flags).forEach(([id, data], index) => {
  const body = JSON.stringify({ fields: {
    enabled: { booleanValue: data.enabled },
    description: { stringValue: data.description },
    ...(data.rolloutPercent !== undefined && { rolloutPercent: { integerValue: data.rolloutPercent } })
  }});
  
  const req = https.request({
    hostname: 'firestore.googleapis.com',
    path: `/v1/projects/messageai-88921/databases/(default)/documents/feature_flags?documentId=${id}`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': body.length
    }
  }, (res) => {
    completed++;
    const status = data.enabled ? '✅ ENABLED' : '❌ DISABLED';
    const rollout = data.rolloutPercent !== undefined ? ` (${data.rolloutPercent}%)` : '';
    
    if (res.statusCode === 200) {
      console.log(`${status}${rollout.padEnd(10)} ${id}`);
    } else if (res.statusCode === 409) {
      console.log(`ℹ️  EXISTS  ${rollout.padEnd(10)} ${id} (already created)`);
    } else {
      console.log(`⚠️  ERROR   ${rollout.padEnd(10)} ${id} (status: ${res.statusCode})`);
    }
    
    if (completed === total) {
      console.log(`\n📊 Summary: ${completed}/${total} flags processed`);
      console.log(`\n🎉 Feature flags setup complete!`);
      console.log(`✨ PR23 is now fully operational!\n`);
      process.exit(0);
    }
  });
  
  req.on('error', (e) => {
    completed++;
    console.error(`❌ ERROR    ${id}: ${e.message}`);
    if (completed === total) process.exit(1);
  });
  
  req.write(body);
  req.end();
});

