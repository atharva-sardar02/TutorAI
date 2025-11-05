/**
 * PR26: Micro-FVM Question Bank
 * 
 * Hardcoded questions for 5-question quick assessments
 * 3 subjects × 5 questions each = 15 total questions
 */

// MicroFVMQuestion type defined inline since this is backend-only
export interface MicroFVMQuestion {
  questionId: string;
  subject: string;
  skill: string;
  text: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export const MICRO_FVM_QUESTIONS: Record<string, MicroFVMQuestion[]> = {
  Math: [
    {
      questionId: 'math_001',
      subject: 'Math',
      skill: 'Algebra Basics',
      text: 'Solve for x: 2x + 5 = 13',
      options: ['x = 3', 'x = 4', 'x = 5', 'x = 6'],
      correctAnswer: 1, // x = 4
      difficulty: 'easy',
    },
    {
      questionId: 'math_002',
      subject: 'Math',
      skill: 'Algebra Basics',
      text: 'What is 15% of 80?',
      options: ['10', '12', '14', '16'],
      correctAnswer: 1, // 12
      difficulty: 'easy',
    },
    {
      questionId: 'math_003',
      subject: 'Math',
      skill: 'Geometry',
      text: 'What is the area of a rectangle with length 8 and width 5?',
      options: ['13', '26', '40', '45'],
      correctAnswer: 2, // 40
      difficulty: 'easy',
    },
    {
      questionId: 'math_004',
      subject: 'Math',
      skill: 'Fractions',
      text: 'Simplify: 3/4 + 1/4',
      options: ['1/2', '4/8', '1', '2'],
      correctAnswer: 2, // 1
      difficulty: 'easy',
    },
    {
      questionId: 'math_005',
      subject: 'Math',
      skill: 'Word Problems',
      text: 'If a pencil costs $0.50 and you buy 6 pencils, how much do you spend?',
      options: ['$2.50', '$3.00', '$3.50', '$4.00'],
      correctAnswer: 1, // $3.00
      difficulty: 'easy',
    },
  ],

  Science: [
    {
      questionId: 'science_001',
      subject: 'Science',
      skill: 'Photosynthesis',
      text: 'What gas do plants absorb during photosynthesis?',
      options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'],
      correctAnswer: 2, // Carbon Dioxide
      difficulty: 'easy',
    },
    {
      questionId: 'science_002',
      subject: 'Science',
      skill: 'States of Matter',
      text: 'Water freezing into ice is an example of what type of change?',
      options: ['Chemical change', 'Physical change', 'Nuclear change', 'Biological change'],
      correctAnswer: 1, // Physical change
      difficulty: 'easy',
    },
    {
      questionId: 'science_003',
      subject: 'Science',
      skill: 'Cells',
      text: 'What is the powerhouse of the cell?',
      options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Cell membrane'],
      correctAnswer: 2, // Mitochondria
      difficulty: 'easy',
    },
    {
      questionId: 'science_004',
      subject: 'Science',
      skill: 'Forces',
      text: 'What force pulls objects toward the center of the Earth?',
      options: ['Magnetism', 'Gravity', 'Friction', 'Inertia'],
      correctAnswer: 1, // Gravity
      difficulty: 'easy',
    },
    {
      questionId: 'science_005',
      subject: 'Science',
      skill: 'Earth Science',
      text: 'How many planets are in our solar system?',
      options: ['7', '8', '9', '10'],
      correctAnswer: 1, // 8
      difficulty: 'easy',
    },
  ],

  English: [
    {
      questionId: 'english_001',
      subject: 'English',
      skill: 'Grammar',
      text: 'Which sentence is grammatically correct?',
      options: [
        'She don\'t like pizza',
        'She doesn\'t likes pizza',
        'She doesn\'t like pizza',
        'She not like pizza'
      ],
      correctAnswer: 2, // She doesn't like pizza
      difficulty: 'easy',
    },
    {
      questionId: 'english_002',
      subject: 'English',
      skill: 'Vocabulary',
      text: 'What is a synonym for "happy"?',
      options: ['Sad', 'Joyful', 'Angry', 'Tired'],
      correctAnswer: 1, // Joyful
      difficulty: 'easy',
    },
    {
      questionId: 'english_003',
      subject: 'English',
      skill: 'Parts of Speech',
      text: 'In the sentence "The cat runs quickly," what part of speech is "quickly"?',
      options: ['Noun', 'Verb', 'Adjective', 'Adverb'],
      correctAnswer: 3, // Adverb
      difficulty: 'medium',
    },
    {
      questionId: 'english_004',
      subject: 'English',
      skill: 'Reading Comprehension',
      text: 'If a story is told in first person, the narrator uses which pronoun?',
      options: ['He/She', 'I/We', 'You', 'They'],
      correctAnswer: 1, // I/We
      difficulty: 'easy',
    },
    {
      questionId: 'english_005',
      subject: 'English',
      skill: 'Punctuation',
      text: 'Which punctuation mark is used to show possession?',
      options: ['Period', 'Comma', 'Apostrophe', 'Question mark'],
      correctAnswer: 2, // Apostrophe
      difficulty: 'easy',
    },
  ],
};

/**
 * Get all questions for a subject
 */
export function getMicroFVMQuestions(subject: string): MicroFVMQuestion[] {
  const questions = MICRO_FVM_QUESTIONS[subject];
  if (!questions) {
    // Default to Math if subject not found
    return MICRO_FVM_QUESTIONS['Math'];
  }
  return questions;
}

/**
 * Get supported subjects
 */
export function getSupportedSubjects(): string[] {
  return Object.keys(MICRO_FVM_QUESTIONS);
}

/**
 * Randomly sample N questions from a list
 */
export function sampleQuestions(questions: MicroFVMQuestion[], count: number): MicroFVMQuestion[] {
  // Shuffle array using Fisher-Yates algorithm
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  // Return first N questions
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

