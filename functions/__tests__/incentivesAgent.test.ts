import { getRewardConfig } from '../src/growth/rewardMatrix';

describe('Incentives Agent', () => {
  describe('Reward Matrix', () => {
    it('returns correct reward for tutor card + tutor + math', () => {
      const reward = getRewardConfig('tutor_card', 'tutor', 'math');
      expect(reward.type).toBe('xp');
      expect(reward.amount).toBe(110); // Math gets +10%
      expect(reward.description).toContain('Math');
    });
    
    it('returns correct reward for tutor card + tutor + science', () => {
      const reward = getRewardConfig('tutor_card', 'tutor', 'science');
      expect(reward.type).toBe('xp');
      expect(reward.amount).toBe(105); // Science gets +5%
    });
    
    it('falls back to default for unknown subject', () => {
      const reward = getRewardConfig('tutor_card', 'tutor', 'unknown');
      expect(reward.type).toBe('xp');
      expect(reward.amount).toBe(100); // Default tutor amount
    });
    
    it('returns class pass for progress reel', () => {
      const reward = getRewardConfig('progress_reel', 'tutor');
      expect(reward.type).toBe('class_pass');
      expect(reward.amount).toBe(1);
      expect(reward.expiresInDays).toBe(90);
    });
    
    it('returns streak shield for study buddy', () => {
      const reward = getRewardConfig('study_buddy', 'student');
      expect(reward.type).toBe('streak_shield');
      expect(reward.amount).toBe(1);
      expect(reward.expiresInDays).toBe(7);
    });
    
    it('returns default for unknown loop', () => {
      const reward = getRewardConfig('unknown_loop', 'tutor');
      expect(reward.type).toBe('xp');
      expect(reward.amount).toBe(50);
      expect(reward.description).toBe('Participation bonus');
    });
    
    it('handles parent persona', () => {
      const reward = getRewardConfig('tutor_card', 'parent');
      expect(reward.type).toBe('xp');
      expect(reward.amount).toBe(50);
    });
    
    it('handles tutor peer referral', () => {
      const reward = getRewardConfig('tutor_peer', 'tutor');
      expect(reward.type).toBe('xp');
      expect(reward.amount).toBe(200); // Higher reward for tutor referrals
    });
  });
  
  // TODO: Add integration tests with Firebase emulator
  // - Test idempotency (same requestKey)
  // - Test daily cap enforcement
  // - Test balance updates
  // - Test redemption transaction
});

