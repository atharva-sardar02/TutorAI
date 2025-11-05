import { format, formatDistance, formatDistanceToNow, differenceInDays } from 'date-fns';

/**
 * Format a date to a readable string
 */
export function formatDate(date: Date | string, formatStr: string = 'MMM d, yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Format a number with thousands separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Format a percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a decimal as percentage (0.15 -> 15%)
 */
export function formatDecimalAsPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a duration in days
 */
export function formatDuration(days: number): string {
  if (days < 1) return '< 1 day';
  if (days === 1) return '1 day';
  if (days < 7) return `${Math.round(days)} days`;
  if (days < 30) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
}

/**
 * Format a relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Format a time distance between two dates
 */
export function formatTimeBetween(startDate: Date | string, endDate: Date | string): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  return formatDistance(start, end);
}

/**
 * Format currency (if needed for rewards)
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format a large number with abbreviations (1000 -> 1K, 1000000 -> 1M)
 */
export function formatCompactNumber(num: number): string {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
  return `${(num / 1000000000).toFixed(1)}B`;
}

/**
 * Format XP with badge
 */
export function formatXP(xp: number): string {
  return `${formatNumber(xp)} XP`;
}

/**
 * Get color for trend (positive/negative)
 */
export function getTrendColor(value: number, invertColors: boolean = false): string {
  const isPositive = value > 0;
  if (invertColors) {
    return isPositive ? 'error.main' : 'success.main';
  }
  return isPositive ? 'success.main' : 'error.main';
}

/**
 * Format date range for display
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  const daysDiff = differenceInDays(endDate, startDate);
  
  if (daysDiff === 7) return 'Last 7 days';
  if (daysDiff === 30) return 'Last 30 days';
  if (daysDiff === 90) return 'Last 90 days';
  
  return `${formatDate(startDate, 'MMM d')} - ${formatDate(endDate, 'MMM d, yyyy')}`;
}

