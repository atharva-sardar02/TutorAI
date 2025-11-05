/**
 * Constants for the Admin Dashboard
 */

// Loop Types
export const LOOP_TYPES = [
  { value: 'all', label: 'All Loops' },
  { value: 'referral', label: 'Referral' },
  { value: 'tutorCard', label: 'Tutor Card' },
  { value: 'studyBuddy', label: 'Study Buddy' },
  { value: 'parentPod', label: 'Parent Pod' },
  { value: 'tutorPeer', label: 'Tutor Peer' },
  { value: 'parentChildChallenge', label: 'Parent-Child Challenge' },
] as const;

// Status Options
export const STATUS_OPTIONS = {
  fraud: [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ],
  experiment: [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ],
  audit: [
    { value: 'all', label: 'All' },
    { value: 'success', label: 'Success' },
    { value: 'failed', label: 'Failed' },
  ],
  user: [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'banned', label: 'Banned' },
  ],
} as const;

// Role Options
export const ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'tutor', label: 'Tutors' },
  { value: 'parent', label: 'Parents' },
] as const;

// Date Range Presets
export const DATE_RANGE_PRESETS = [
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
  { value: 'custom', label: 'Custom Range', days: 0 },
] as const;

// Feature Categories
export const FEATURE_CATEGORIES = {
  system: 'System',
  loop: 'Viral Loop',
  feature: 'Feature',
} as const;

// Impact Levels
export const IMPACT_LEVELS = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
} as const;

// Colors
export const COLORS = {
  primary: '#1DB954', // Spotify Green
  secondary: '#1ed760',
  error: '#FF3B30',
  warning: '#FF9500',
  success: '#34C759',
  info: '#007AFF',
} as const;

// Refresh Intervals (milliseconds)
export const REFRESH_INTERVALS = {
  fraudQueue: 30000, // 30 seconds
  auditLog: 30000, // 30 seconds
  experiments: 60000, // 60 seconds
  killSwitches: 60000, // 60 seconds
  systemHealth: 120000, // 2 minutes
  users: 60000, // 60 seconds
} as const;

// Query Limits
export const QUERY_LIMITS = {
  fraudQueue: 100,
  auditLog: 100,
  users: 50,
  experiments: 50,
} as const;

// Admin Actions
export const ADMIN_ACTIONS = [
  'approve_fraud',
  'reject_fraud',
  'ban_user',
  'unban_user',
  'toggle_killswitch',
  'toggle_experiment',
  'export_data',
  'view_profile',
] as const;

// Export Formats
export const EXPORT_FORMATS = {
  CSV: 'csv',
  JSON: 'json',
  PDF: 'pdf',
} as const;

// Pagination
export const PAGINATION = {
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
} as const;

