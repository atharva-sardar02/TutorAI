/**
 * PR17.5: Personalization Agent - Frontend Copy Templates
 * 
 * Mirror of backend copy templates for frontend use
 * Persona-based, localized copy for all viral loops
 */

/**
 * Comprehensive copy templates
 * Total: 54 templates (6 loops × 3 personas × 3 locales)
 */
export const COPY_TEMPLATES: Record<string, Record<string, Record<string, string>>> = {
  tutor_card: {
    tutor: {
      en: "Share your 5⭐ rating with potential students!",
      es: "¡Comparte tu calificación de 5⭐ con estudiantes potenciales!",
      fr: "Partagez votre note de 5⭐ avec des étudiants potentiels!",
    },
    parent: {
      en: "Share your tutor's success story!",
      es: "¡Comparte la historia de éxito de tu tutor!",
      fr: "Partagez l'histoire de réussite de votre tuteur!",
    },
    student: {
      en: "Check out my awesome tutor!",
      es: "¡Mira a mi increíble tutor!",
      fr: "Découvrez mon super tuteur!",
    },
  },

  progress_reel: {
    tutor: {
      en: "Share your teaching highlights!",
      es: "¡Comparte tus momentos destacados de enseñanza!",
      fr: "Partagez vos moments forts d'enseignement!",
    },
    parent: {
      en: "Share your child's learning progress!",
      es: "¡Comparte el progreso de aprendizaje de tu hijo!",
      fr: "Partagez les progrès d'apprentissage de votre enfant!",
    },
    student: {
      en: "Show off your learning progress!",
      es: "¡Muestra tu progreso de aprendizaje!",
      fr: "Montrez vos progrès d'apprentissage!",
    },
  },

  study_buddy: {
    tutor: {
      en: "Challenge your colleagues!",
      es: "¡Desafía a tus colegas!",
      fr: "Défiez vos collègues!",
    },
    parent: {
      en: "Challenge a friend to help your child!",
      es: "¡Desafía a un amigo para ayudar a tu hijo!",
      fr: "Défiez un ami pour aider votre enfant!",
    },
    student: {
      en: "Challenge a friend to study together!",
      es: "¡Desafía a un amigo a estudiar juntos!",
      fr: "Défiez un ami à étudier ensemble!",
    },
  },

  parent_pod: {
    tutor: {
      en: "Invite others to join your network!",
      es: "¡Invita a otros a unirse a tu red!",
      fr: "Invitez d'autres à rejoindre votre réseau!",
    },
    parent: {
      en: "Invite other parents to this cohort!",
      es: "¡Invita a otros padres a esta cohorte!",
      fr: "Invitez d'autres parents à cette cohorte!",
    },
    student: {
      en: "Invite friends to join your group!",
      es: "¡Invita a amigos a unirse a tu grupo!",
      fr: "Invitez des amis à rejoindre votre groupe!",
    },
  },

  tutor_peer: {
    tutor: {
      en: "Refer a tutor in a complementary subject!",
      es: "¡Recomienda un tutor en una materia complementaria!",
      fr: "Recommandez un tuteur dans une matière complémentaire!",
    },
    parent: {
      en: "Refer a great tutor to other parents!",
      es: "¡Recomienda un excelente tutor a otros padres!",
      fr: "Recommandez un excellent tuteur à d'autres parents!",
    },
    student: {
      en: "Know a great tutor? Share with friends!",
      es: "¿Conoces un gran tutor? ¡Compártelo con amigos!",
      fr: "Vous connaissez un bon tuteur? Partagez avec des amis!",
    },
  },

  results: {
    tutor: {
      en: "Share your student's amazing results!",
      es: "¡Comparte los increíbles resultados de tu estudiante!",
      fr: "Partagez les résultats incroyables de votre élève!",
    },
    parent: {
      en: "Share your child's test results!",
      es: "¡Comparte los resultados del examen de tu hijo!",
      fr: "Partagez les résultats d'examen de votre enfant!",
    },
    student: {
      en: "Show off your test results!",
      es: "¡Muestra tus resultados del examen!",
      fr: "Montrez vos résultats d'examen!",
    },
  },
};

/**
 * Generic fallback copy (matches backend fallbackContent.ts)
 */
const FALLBACK_COPY: Record<string, Record<string, string>> = {
  tutor_card: {
    tutor: 'Share your success!',
    parent: 'Share your tutor!',
    student: 'Share your tutor!',
  },
  progress_reel: {
    tutor: 'Share progress!',
    parent: "Share your child's progress!",
    student: 'Share your progress!',
  },
  study_buddy: {
    tutor: 'Challenge a friend!',
    parent: 'Challenge a friend!',
    student: 'Challenge a friend!',
  },
  parent_pod: {
    tutor: 'Invite others!',
    parent: 'Invite other parents!',
    student: 'Invite friends!',
  },
  tutor_peer: {
    tutor: 'Refer a tutor!',
    parent: 'Refer a tutor!',
    student: 'Refer a tutor!',
  },
  results: {
    tutor: 'Share your results!',
    parent: 'Share results!',
    student: 'Share your results!',
  },
};

/**
 * Get localized copy template with fallback chain
 * 
 * Fallback order:
 * 1. Requested locale (e.g., 'es')
 * 2. English ('en')
 * 3. Generic fallback
 * 
 * @param loopType - Loop type (e.g., 'tutor_card')
 * @param persona - User persona ('tutor', 'parent', 'student')
 * @param locale - Locale code ('en', 'es', 'fr')
 * @returns Localized copy string
 */
export function getCopyFromTemplates(
  loopType: string,
  persona: string,
  locale: string = 'en'
): string {
  // Normalize persona (default to 'tutor' if invalid)
  const normalizedPersona = ['tutor', 'parent', 'student'].includes(persona) ? persona : 'tutor';
  
  // Normalize locale
  const normalizedLocale = normalizeLocale(locale);
  
  // Step 1: Try requested locale
  const loopTemplates = COPY_TEMPLATES[loopType];
  if (loopTemplates) {
    const personaTemplates = loopTemplates[normalizedPersona];
    if (personaTemplates) {
      const localizedCopy = personaTemplates[normalizedLocale];
      if (localizedCopy) {
        return localizedCopy;
      }
      
      // Step 2: Fallback to English
      const englishCopy = personaTemplates['en'];
      if (englishCopy) {
        return englishCopy;
      }
    }
  }
  
  // Step 3: Use generic fallback
  const fallbackLoopCopy = FALLBACK_COPY[loopType];
  if (fallbackLoopCopy) {
    return fallbackLoopCopy[normalizedPersona] || fallbackLoopCopy['tutor'] || 'Share!';
  }
  
  // Ultimate fallback
  return 'Share your success!';
}

/**
 * Get all supported locales
 */
export function getSupportedLocales(): string[] {
  return ['en', 'es', 'fr'];
}

/**
 * Check if a locale is supported
 */
export function isLocaleSupported(locale: string): boolean {
  return getSupportedLocales().includes(locale);
}

/**
 * Normalize locale code (e.g., 'en-US' → 'en')
 */
export function normalizeLocale(locale: string): string {
  if (!locale) return 'en';
  
  // Extract base language code (e.g., 'en-US' → 'en')
  const baseLocale = locale.split('-')[0].toLowerCase();
  
  // Return if supported, otherwise default to 'en'
  return isLocaleSupported(baseLocale) ? baseLocale : 'en';
}

