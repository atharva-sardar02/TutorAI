/**
 * PR17.5: Personalization Agent - Localization Hook
 * 
 * React hook to fetch persona-based, localized copy for viral loops
 */

import { useAuth } from './useAuth';
import { getCopyFromTemplates } from '@/utils/copyTemplates';

/**
 * Get localized copy for a viral loop
 * 
 * Automatically uses current user's persona and locale
 * Falls back to EN if locale unsupported
 * 
 * @param loopType - Loop type (e.g., 'tutor_card', 'progress_reel')
 * @param persona - Override persona (optional, defaults to user.role)
 * @param locale - Override locale (optional, defaults to user.locale)
 * @returns Localized copy string
 * 
 * @example
 * ```tsx
 * const copy = useLocalizedCopy('tutor_card');
 * // Returns: "Share your 5⭐ rating with potential students!" (EN, tutor)
 * ```
 * 
 * @example
 * ```tsx
 * const copy = useLocalizedCopy('tutor_card', 'parent', 'es');
 * // Returns: "¡Comparte la historia de éxito de tu tutor!" (ES, parent)
 * ```
 */
export function useLocalizedCopy(
  loopType: string,
  persona?: string,
  locale?: string
): string {
  const { user } = useAuth();
  
  // Use provided values or fall back to user's profile
  const effectivePersona = persona || user?.role || 'tutor';
  const effectiveLocale = locale || user?.locale || 'en';
  
  return getCopyFromTemplates(loopType, effectivePersona, effectiveLocale);
}

