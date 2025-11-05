/**
 * Study Buddy Service Tests
 * PR23: Unit tests for challenge generation and participation
 */

import { generateStudyBuddyChallenge } from '../src/growth/studyBuddyService';

describe('Study Buddy Challenge', () => {
  test('generates challenge with 5 questions', async () => {
    const challenge = await generateStudyBuddyChallenge(
      'student_123',
      'Math',
      'Algebra',
      'medium'
    );
    
    expect(challenge.questions).toHaveLength(5);
    expect(challenge.subject).toBe('Math');
    expect(challenge.topic).toBe('Algebra');
    expect(challenge.status).toBe('pending');
    expect(challenge.creatorId).toBe('student_123');
  });
  
  test('includes rewards in challenge', async () => {
    const challenge = await generateStudyBuddyChallenge(
      'student_123',
      'Math',
      'Algebra',
      'medium'
    );
    
    expect(challenge.rewards).toBeDefined();
    expect(challenge.rewards.xp).toBe(50); // Medium difficulty = 50 XP
    expect(challenge.rewards.streakShield).toBe(true);
  });
  
  test('sets 7-day expiration', async () => {
    const challenge = await generateStudyBuddyChallenge(
      'student_123',
      'Math',
      'Algebra',
      'medium'
    );
    
    const now = Date.now();
    const expiresAt = challenge.expiresAt.toMillis();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    
    expect(expiresAt).toBeGreaterThan(now + sevenDays - 60000); // Within 1 min
    expect(expiresAt).toBeLessThan(now + sevenDays + 60000);
  });
  
  test('includes referralId for attribution', async () => {
    const challenge = await generateStudyBuddyChallenge(
      'student_123',
      'Math',
      'Algebra',
      'medium'
    );
    
    expect(challenge.referralId).toBeDefined();
    expect(typeof challenge.referralId).toBe('string');
  });
  
  test('varies XP by difficulty', async () => {
    const easyChallenge = await generateStudyBuddyChallenge(
      'student_123',
      'Math',
      'Algebra',
      'easy'
    );
    const mediumChallenge = await generateStudyBuddyChallenge(
      'student_123',
      'Math',
      'Algebra',
      'medium'
    );
    const hardChallenge = await generateStudyBuddyChallenge(
      'student_123',
      'Math',
      'Algebra',
      'hard'
    );
    
    expect(easyChallenge.rewards.xp).toBe(30);
    expect(mediumChallenge.rewards.xp).toBe(50);
    expect(hardChallenge.rewards.xp).toBe(75);
  });
});

describe('Cooldown Management', () => {
  // These tests would require Firebase Admin SDK and Firestore emulator
  // Skipping for MVP, but structure is documented
  
  test.skip('enforces 48h cooldown per subject', async () => {
    // TODO: Implement with Firestore emulator
    // 1. Create challenge for Math
    // 2. Try to create another Math challenge immediately
    // 3. Expect cooldown error
    // 4. Wait 48h (or mock time)
    // 5. Try again, expect success
  });
  
  test.skip('allows challenges for different subjects simultaneously', async () => {
    // TODO: Implement with Firestore emulator
    // 1. Create challenge for Math
    // 2. Immediately create challenge for Physics
    // 3. Both should succeed
  });
});

describe('Challenge Participation', () => {
  test.skip('only one participant can join challenge', async () => {
    // TODO: Implement with Firestore emulator
    // 1. Create challenge
    // 2. Student B joins
    // 3. Student C tries to join
    // 4. Expect error: "Challenge already started"
  });
  
  test.skip('expired challenges are rejected', async () => {
    // TODO: Implement with Firestore emulator
    // 1. Create challenge
    // 2. Mock time forward 8 days
    // 3. Try to join
    // 4. Expect error: "Challenge has expired"
  });
  
  test.skip('creator cannot join own challenge', async () => {
    // TODO: Implement with Firestore emulator
    // 1. Student A creates challenge
    // 2. Student A tries to join
    // 3. Expect error: "Cannot join your own challenge"
  });
});

describe('Answer Grading', () => {
  test.skip('correctly grades answers', async () => {
    // TODO: Implement with Firestore emulator
    // 1. Create challenge with known questions
    // 2. Submit all correct answers
    // 3. Expect score = 100%
    // 4. Submit mix of correct/incorrect
    // 5. Expect score = (correct/total) * 100
  });
  
  test.skip('awards rewards to both users', async () => {
    // TODO: Implement with Firestore emulator + incentives mock
    // 1. Create challenge
    // 2. Participant completes
    // 3. Check both users received XP
    // 4. Check both users received streak shield
  });
});

