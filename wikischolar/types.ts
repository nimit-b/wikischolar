
export interface SearchResult {
  title: string;
  description?: string;
}

export interface WikiSection {
  id: string;
  title: string;
  level: number;
  contentHtml: string;
}

export interface TopicData {
  title: string;
  sections: WikiSection[];
  thumbnail?: string;
  url: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  tag?: string; // e.g., 'Concept', 'Date', 'AI Generated'
}

export interface QuizQuestion {
  id: string;
  type?: 'mcq' | 'short_answer';
  question: string;
  options?: string[]; // Only for MCQ
  correctAnswer?: string; // For MCQ
  modelAnswer?: string; // For Short Answer
  explanation?: string; 
  marks?: number; // Maximum marks for this question
}

export interface GradingResult {
    marksObtained: number;
    feedback: string;
}

export interface TimelineEvent {
  year: string;
  description: string;
}

export interface RelatedTopic {
  title: string;
}

export interface StudyMaterial {
  topic: TopicData;
  keyPoints: string[];
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  timeline: TimelineEvent[];
  relatedTopics: RelatedTopic[];
  examTips?: string[];
  commonMistakes?: string[];
  mnemonics?: string[];
  userNotes?: string;
}

export enum AppState {
  HOME,
  LOADING,
  ERROR,
  DASHBOARD,
  EXAM_MODE,
  NOTES_LIBRARY
}

export enum DashboardTab {
  GUIDE = 'guide',
  FLASHCARDS = 'flashcards',
  QUIZ = 'quiz',
  TIMELINE = 'timeline',
  AI_ASSISTANT = 'ai_assistant'
}

export type Theme = 'light' | 'dark' | 'sepia' | 'contrast';

export interface AIConfig {
  provider: 'openai' | 'gemini' | 'openrouter' | 'custom' | 'puter';
  apiKey: string;
  model: string;
  baseUrl?: string;
  persona: string;
  
  // Image/Diagram Generation Specifics
  useSeparateImageModel?: boolean;
  imageModelProvider?: 'openai' | 'gemini' | 'openrouter' | 'custom' | 'puter';
  imageModel?: string;
  imageApiKey?: string; // Optional, can fallback to main key
}

export interface ExamConfig {
  questionCount: number;
  type: 'mcq' | 'short_answer' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
}