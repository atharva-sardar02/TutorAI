/**
 * Keyword-to-subject mapping for activity feed
 * Maps event title keywords to standard subject names
 * PR21: Activity Feed
 */

export const SUBJECT_KEYWORDS: Record<string, string[]> = {
  'Math': ['math', 'algebra', 'geometry', 'calculus', 'trigonometry', 'arithmetic'],
  'Physics': ['physics', 'mechanics', 'thermodynamics'],
  'Chemistry': ['chemistry', 'chem', 'biochem'],
  'Biology': ['biology', 'bio', 'life science'],
  'English': ['english', 'literature', 'writing', 'grammar', 'reading'],
  'History': ['history', 'social studies'],
  'Science': ['science'], // Generic catch-all
  'Computer Science': ['computer science', 'programming', 'coding', 'cs'],
  'Spanish': ['spanish', 'español'],
  'French': ['french', 'français'],
};

/**
 * Extract subject from event title using keyword matching
 * Returns first match or 'General' if no match
 */
export function extractSubjectFromTitle(title: string): string {
  const lowerTitle = title.toLowerCase();
  
  for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerTitle.includes(keyword)) {
        return subject;
      }
    }
  }
  
  return 'General'; // Fallback for unclassified events
}

