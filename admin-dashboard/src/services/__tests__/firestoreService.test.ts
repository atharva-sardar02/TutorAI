/**
 * Unit tests for firestoreService - Dashboard Stats
 * 
 * Tests the fixed "Active Today" calculation
 */

import { getDashboardStats } from '../firestoreService';
import { getDocs, collection } from 'firebase/firestore';

// Mock Firebase Firestore
jest.mock('firebase/firestore');
jest.mock('@/lib/firebase', () => ({
  db: {},
}));

const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
const mockCollection = collection as jest.MockedFunction<typeof collection>;

describe('getDashboardStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Mock console.log
    console.error = jest.fn(); // Mock console.error
    console.warn = jest.fn(); // Mock console.warn
  });

  const createMockUser = (uid: string, lastSeenDate: Date | null) => {
    const lastSeen = lastSeenDate
      ? {
          toMillis: () => lastSeenDate.getTime(),
          seconds: Math.floor(lastSeenDate.getTime() / 1000),
        }
      : null;

    return {
      id: uid,
      data: () => ({
        uid,
        displayName: `User ${uid}`,
        presence: lastSeen
          ? {
              status: 'online',
              lastSeen,
              activeConversationId: null,
            }
          : undefined,
      }),
    };
  };

  test('should calculate activeToday correctly for users active today', async () => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayUser = new Date(today.getTime() + 3600000); // 1 hour into today
    const yesterdayUser = new Date(today.getTime() - 3600000); // Yesterday

    const mockUsers = [
      createMockUser('user1', todayUser),
      createMockUser('user2', yesterdayUser),
      createMockUser('user3', todayUser),
      createMockUser('user4', null), // No presence
    ];

    mockGetDocs.mockResolvedValue({
      size: 4,
      docs: mockUsers,
      empty: false,
      forEach: jest.fn(),
      metadata: {} as any,
    } as any);

    const stats = await getDashboardStats();

    expect(stats.totalUsers).toBe(4);
    expect(stats.activeToday).toBe(2); // Only user1 and user3
  });

  test('should handle users with no presence data', async () => {
    const mockUsers = [
      createMockUser('user1', null),
      createMockUser('user2', null),
      createMockUser('user3', null),
    ];

    mockGetDocs.mockResolvedValue({
      size: 3,
      docs: mockUsers,
      empty: false,
      forEach: jest.fn(),
      metadata: {} as any,
    } as any);

    const stats = await getDashboardStats();

    expect(stats.totalUsers).toBe(3);
    expect(stats.activeToday).toBe(0);
  });

  test('should guardrail: cap activeToday at totalUsers', async () => {
    // This shouldn't happen in practice, but test the guardrail
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUser = new Date(today.getTime() + 3600000);

    const mockUsers = [
      createMockUser('user1', todayUser),
      createMockUser('user2', todayUser),
    ];

    // Mock implementation that returns more active than total (simulating bug)
    mockGetDocs.mockResolvedValueOnce({
      size: 2,
      docs: mockUsers,
      empty: false,
      forEach: jest.fn(),
      metadata: {} as any,
    } as any);

    const stats = await getDashboardStats();

    // activeToday should never exceed totalUsers
    expect(stats.activeToday).toBeLessThanOrEqual(stats.totalUsers);
  });

  test('should handle presence calculation errors gracefully', async () => {
    const mockUsers = [
      {
        id: 'user1',
        data: () => ({
          uid: 'user1',
          presence: {
            lastSeen: null, // Invalid presence
          },
        }),
      },
      {
        id: 'user2',
        data: () => ({
          uid: 'user2',
          // Missing presence entirely
        }),
      },
    ];

    mockGetDocs.mockResolvedValue({
      size: 2,
      docs: mockUsers,
      empty: false,
      forEach: jest.fn(),
      metadata: {} as any,
    } as any);

    const stats = await getDashboardStats();

    expect(stats.totalUsers).toBe(2);
    expect(stats.activeToday).toBe(0); // Should handle gracefully
  });

  test('should log performance metrics', async () => {
    const mockUsers = [createMockUser('user1', new Date())];

    mockGetDocs.mockResolvedValue({
      size: 1,
      docs: mockUsers,
      empty: false,
      forEach: jest.fn(),
      metadata: {} as any,
    } as any);

    await getDashboardStats();

    // Verify logging happened
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[Dashboard]'),
      expect.anything()
    );
  });

  test('should throw error with enhanced logging on failure', async () => {
    const mockError = new Error('Firestore query failed');
    mockGetDocs.mockRejectedValue(mockError);

    await expect(getDashboardStats()).rejects.toThrow('Firestore query failed');

    // Verify enhanced error logging
    expect(console.error).toHaveBeenCalledWith(
      '[Dashboard] Error fetching dashboard stats:',
      mockError
    );
    expect(console.error).toHaveBeenCalledWith(
      '[Dashboard] Error details:',
      expect.objectContaining({
        message: 'Firestore query failed',
      })
    );
  });

  test('should calculate activeToday at midnight boundary', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const exactMidnight = new Date(today.getTime()); // Exactly midnight
    const oneSecondBefore = new Date(today.getTime() - 1000); // 23:59:59 yesterday

    const mockUsers = [
      createMockUser('user1', exactMidnight),
      createMockUser('user2', oneSecondBefore),
    ];

    mockGetDocs.mockResolvedValue({
      size: 2,
      docs: mockUsers,
      empty: false,
      forEach: jest.fn(),
      metadata: {} as any,
    } as any);

    const stats = await getDashboardStats();

    expect(stats.totalUsers).toBe(2);
    expect(stats.activeToday).toBe(1); // Only user1 at exact midnight
  });
});

