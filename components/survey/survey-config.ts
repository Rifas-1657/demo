import type {
  AccessibilityPreferences,
  ExplanationStyle,
  Interest,
  LearnerLevel,
  MovieGenre,
  Personalization,
  PreferredLanguage,
  SessionPace,
} from '@/lib/stores/personalization'

export type StepId = 'level' | 'interests' | 'genre' | 'style' | 'language' | 'pace' | 'accessibility'

/** Draft answers: required single choices start empty so the learner picks deliberately. */
export interface SurveyDraft {
  level: LearnerLevel | null
  interests: Interest[]
  movieGenre: MovieGenre | null
  style: ExplanationStyle | null
  language: PreferredLanguage
  pace: SessionPace | null
  accessibility: AccessibilityPreferences
}

export interface Choice<T extends string> {
  value: T
  label: string
  description?: string
}

export const levelChoices: Choice<LearnerLevel>[] = [
  { value: 'new', label: 'New to this', description: 'Start from the very first idea, no jargon assumed.' },
  { value: 'basics', label: 'Know the basics', description: 'Skip the warm-up and go a little deeper.' },
  { value: 'projects', label: 'Built small projects', description: 'Focus on patterns, trade-offs, and real code.' },
]

export const interestChoices: Choice<Interest>[] = [
  { value: 'movies', label: 'Movies' },
  { value: 'cricket', label: 'Cricket' },
  { value: 'games', label: 'Games' },
  { value: 'music', label: 'Music' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'cars', label: 'Cars' },
  { value: 'anime', label: 'Anime' },
  { value: 'business', label: 'Business' },
  { value: 'science', label: 'Science' },
]

export const genreChoices: Choice<MovieGenre>[] = [
  { value: 'action', label: 'Action' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'thriller', label: 'Thriller' },
  { value: 'romance', label: 'Romance' },
  { value: 'sci-fi', label: 'Sci-fi' },
  { value: 'animation', label: 'Animation' },
]

export const styleChoices: Choice<ExplanationStyle>[] = [
  { value: 'example', label: 'Example first', description: 'A relatable story, then the concept behind it.' },
  { value: 'diagram', label: 'Diagram first', description: 'See the shape of an idea before the details.' },
  { value: 'code', label: 'Code first', description: 'Show the code, then explain line by line.' },
]

export const languageChoices: Choice<PreferredLanguage>[] = [
  { value: 'tanglish', label: 'Tanglish', description: 'Tamil and English mixed, the way friends explain things.' },
  { value: 'tamil', label: 'Tamil', description: 'Explanations in Tamil, code terms kept in English.' },
  { value: 'english', label: 'English', description: 'Plain, friendly English throughout.' },
]

export const paceChoices: Choice<SessionPace>[] = [
  { value: 'calm', label: 'Calm and detailed', description: 'Smaller steps, more examples, extra recap.' },
  { value: 'balanced', label: 'Balanced', description: 'A steady mix of explanation and practice.' },
  { value: 'fast', label: 'Fast revision', description: 'Key points and quick checks only.' },
]

export const accessibilityChoices: { key: keyof AccessibilityPreferences; label: string; description: string }[] = [
  { key: 'reducedMotion', label: 'Reduced motion', description: 'Turn off page flips and animated transitions.' },
  { key: 'largerText', label: 'Larger text', description: 'Bump up reading size across the book.' },
  { key: 'captions', label: 'Captions always on', description: 'Show captions for every narrated explanation.' },
]

export interface StepMeta {
  id: StepId
  eyebrow: string
  question: string
  hint: string
  optional?: boolean
}

export const stepMeta: Record<StepId, StepMeta> = {
  level: {
    id: 'level',
    eyebrow: 'Your starting point',
    question: 'Where are you with this subject right now?',
    hint: 'Pick the one that sounds most like you.',
  },
  interests: {
    id: 'interests',
    eyebrow: 'Things you love',
    question: 'What should your examples be about?',
    hint: 'Choose as many as you like — at least one.',
  },
  genre: {
    id: 'genre',
    eyebrow: 'Movie night',
    question: 'Any favourite kind of film?',
    hint: 'Optional. Skip it if you enjoy everything.',
    optional: true,
  },
  style: {
    id: 'style',
    eyebrow: 'How it clicks',
    question: 'How do you like new ideas explained?',
    hint: 'You can still see all three formats in every chapter.',
  },
  language: {
    id: 'language',
    eyebrow: 'Reading language',
    question: 'Which language should the book speak?',
    hint: 'Tanglish is selected by default — change it anytime.',
  },
  pace: {
    id: 'pace',
    eyebrow: 'Session rhythm',
    question: 'How fast should each session move?',
    hint: 'This sets how much detail sits on each page.',
  },
  accessibility: {
    id: 'accessibility',
    eyebrow: 'Comfort settings',
    question: 'Anything that makes reading easier?',
    hint: 'All optional. Turn on whatever helps.',
    optional: true,
  },
}

export function getVisibleSteps(draft: SurveyDraft): StepId[] {
  const steps: StepId[] = ['level', 'interests']
  if (draft.interests.includes('movies')) steps.push('genre')
  steps.push('style', 'language', 'pace', 'accessibility')
  return steps
}

export function validateStep(step: StepId, draft: SurveyDraft): string | null {
  switch (step) {
    case 'level':
      return draft.level ? null : 'Choose your current level to continue.'
    case 'interests':
      return draft.interests.length > 0 ? null : 'Pick at least one interest so examples feel familiar.'
    case 'style':
      return draft.style ? null : 'Choose an explanation style to continue.'
    case 'language':
      return draft.language ? null : 'Choose a language to continue.'
    case 'pace':
      return draft.pace ? null : 'Choose a session pace to continue.'
    default:
      return null
  }
}

export function draftFromPersonalization(saved: Personalization, completed: boolean): SurveyDraft {
  if (completed) return { ...saved }
  return {
    level: null,
    interests: [],
    movieGenre: null,
    style: null,
    language: saved.language,
    pace: null,
    accessibility: { ...saved.accessibility },
  }
}

export function finalizeDraft(draft: SurveyDraft): Personalization | null {
  if (!draft.level || !draft.style || !draft.pace || draft.interests.length === 0) return null
  return {
    level: draft.level,
    interests: draft.interests,
    movieGenre: draft.interests.includes('movies') ? draft.movieGenre : null,
    style: draft.style,
    language: draft.language,
    pace: draft.pace,
    accessibility: draft.accessibility,
  }
}

export function labelFor<T extends string>(choices: Choice<T>[], value: T | null) {
  return choices.find((choice) => choice.value === value)?.label ?? null
}
