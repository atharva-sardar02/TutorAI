import { Timestamp } from "firebase/firestore";

// Message types
export type MessageStatus = "sending" | "sent" | "failed";
export type MessageType = "text" | "image" | "recording";

// AI/Assistant metadata types
export interface EventMeta {
  eventId: string;
  title: string;
  startTime: Timestamp;
  endTime: Timestamp;
  participants: string[];
  status?: 'pending' | 'confirmed' | 'declined';
}

export interface DeadlineMeta {
  deadlineId: string;
  title: string;
  dueDate: Timestamp;
  assignee?: string;
  completed?: boolean;
}

export interface RSVPMeta {
  eventId: string;
  responses?: { [userId: string]: 'accepted' | 'declined' };
}

export interface ConflictMeta {
  conflictId: string;
  eventId?: string; // Event ID for reschedule actions
  message: string;
  suggestedAlternatives?: Array<{
    startTime: Timestamp;
    endTime: Timestamp;
    reason?: string;
  }>;
}

// Recording metadata for Session Intelligence
export interface RecordingMeta {
  recordingId: string;
  fileType: 'video' | 'audio';
  storageUrl: string;
  duration?: number; // in seconds
  processedUrl?: string; // Will be set by Cloud Function after watermarking
  transcriptId?: string; // Will be set after transcription
}

export interface MessageMeta {
  role?: 'assistant' | 'system' | 'user';
  type?: 'event' | 'deadline' | 'ai_loading'; // Type of assistant message/card
  action?: string; // System actions (reschedule_event, etc.) - filtered from UI
  eventId?: string;
  event?: EventMeta;
  deadlineId?: string;
  deadline?: DeadlineMeta;
  rsvp?: RSVPMeta;
  conflict?: ConflictMeta;
  triggerTask?: string; // Track what task triggered loading (scheduling, rsvp, reminder)
}

export interface Message {
  id: string; // Client-generated UUID (idempotency key)
  conversationId: string;
  senderId: string;
  type: MessageType;
  text: string;
  media?: {
    status: "uploading" | "ready" | "failed";
    url: string;
    width: number;
    height: number;
  };
  recording?: RecordingMeta; // Session Intelligence recording metadata
  clientTimestamp: Timestamp; // Optimistic ordering
  serverTimestamp: Timestamp | null; // Authoritative
  status: MessageStatus;
  retryCount: number;
  readBy: string[]; // For read receipts
  readCount: number; // Aggregate for groups
  meta?: MessageMeta; // AI/Assistant metadata
  senderName?: string; // Cached sender name for display
}

// User types
export type PresenceStatus = "online" | "offline";

export interface UserPresence {
  status: PresenceStatus;
  lastSeen: Timestamp;
  activeConversationId: string | null;
}

export interface User {
  uid: string;
  displayName: string;
  email?: string;
  photoURL: string | null;
  bio?: string; // Short user description/status
  
  // @deprecated Legacy social model - use linkedTutorIds for parents instead
  // TODO: Migrate existing data and remove this field
  friends?: string[]; // Array of friend UIDs (backward compatibility only)
  
  // Role system for tutor-parent communication
  role?: 'tutor' | 'parent';
  userType?: 'tutor' | 'parent'; // Alias for role (used in PR30)
  tutorCode?: string; // Only for tutors (e.g., "TUT-A3F9B") - also stored in /tutorCodes/{code}
  linkedTutorIds?: string[]; // Only for parents - array of tutor UIDs
  subjects?: string[]; // Only for tutors (e.g., ["Math", "Physics"])
  businessName?: string; // Optional for tutors
  studentContext?: string; // For parents - student initials/name (not stored publicly)
  
  // Blocking system
  blockedUserIds?: string[]; // Array of user IDs this user has blocked
  
  pushToken?: string; // Expo push token for remote notifications
  pushTokenUpdatedAt?: Timestamp; // When push token was last updated
  timezone?: string; // IANA timezone (e.g., "America/Toronto")
  locale?: string; // Optional for i18n
  workingHours?: {
    [day: string]: { start: string; end: string }[]; // e.g., { mon: [{start:"09:00", end:"17:00"}] }
  };
  presence: UserPresence;
  createdAt?: Timestamp;
  
  // Percentile stats (replaces leaderboards)
  stats?: {
    monthlyXp: number;
    monthlyChallenges: number;
    monthlyPercentile: number; // 0-100, or -1 if insufficient data
    monthStart: Timestamp;
    lastUpdated: Timestamp;
  };
}

// Tutor Code Registry
// Collection: /tutorCodes/{code}
export interface TutorCodeRegistry {
  tutorId: string; // uid of the tutor
  createdAt: Timestamp;
}

// Conversation types
export type ConversationType = "direct" | "group";

export interface LastMessage {
  text: string;
  senderId: string;
  timestamp: Timestamp;
  type: MessageType;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  participants: string[]; // Max 20 for MVP
  lastMessage: LastMessage | null;
  name?: string; // Groups only
  typing?: { [userId: string]: Timestamp }; // Typing indicators
  archived?: boolean; // Soft delete for removed connections
  archivedAt?: Date; // When the conversation was archived
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

