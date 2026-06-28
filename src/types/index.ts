export interface User {
  id: string;
  fullName: string;
  examId: string;
  role: 'user' | 'admin';
  currentStreak: number;
  longestStreak: number;
  examDate?: string; // ISO date string (YYYY-MM-DD)
}

export interface Material {
  id: string;
  title: string;
  type: 'pdf' | 'docx' | 'pptx' | 'image' | 'text';
  uploadedAt: string; // ISO date string
  status: 'pending' | 'processed' | 'failed';
  extractedText?: string;
  extractedSummary?: string;
}

export interface Option {
  id: string;
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
  imageUrl?: string;
  explanationWrong?: string; // only exists on incorrect options
}

export interface Question {
  id: string;
  materialId?: string;
  stem: string;
  imageUrl?: string;
  options: Option[];
  correctOptionId: string;
  explanationCorrect: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

export interface Quiz {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  questionCount: number;
  secondsPerQuestion: number; // default 80
  createdAt: string; // ISO date string
  questionIds?: string[]; // references questions
}

export interface Attempt {
  id: string;
  quizId: string;
  userId: string;
  startedAt: string; // ISO date string
  submittedAt?: string; // ISO date string
  score: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  timeUsedSeconds: number;
  overallTimeRemainingAtSave?: number; // for resume states
  questions?: Question[];
}

export interface AttemptAnswer {
  questionId: string;
  selectedOptionId?: string; // undefined/null if unanswered
  isCorrect: boolean;
  timeSpentSeconds: number;
}

export interface EncouragementMessage {
  id: string;
  tier: 'celebrate' | 'good' | 'push' | 'comeback';
  text: string;
  active: boolean;
}

export type EncouragementTier = 'celebrate' | 'good' | 'push' | 'comeback';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';
export type MaterialType = 'pdf' | 'docx' | 'pptx' | 'image' | 'text';
export type MaterialStatus = 'pending' | 'processed' | 'failed';
