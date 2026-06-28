import { pgTable, text, integer, boolean, timestamp, primaryKey } from 'drizzle-orm/pg-core';

// Users Table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull(),
  examId: text('exam_id').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(), // 'user' | 'admin'
  currentStreak: integer('current_streak').default(0).notNull(),
  longestStreak: integer('longest_streak').default(0).notNull(),
  lastActiveDate: text('last_active_date'), // YYYY-MM-DD
  examDate: text('exam_date'), // YYYY-MM-DD
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Materials Table (parsed lecture notes)
export const materials = pgTable('materials', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type').notNull(), // 'pdf' | 'docx' | 'pptx' | 'image' | 'text'
  status: text('raw_status').notNull(), // 'pending' | 'processed' | 'failed'
  extractedText: text('extracted_text'),
  extractedSummary: text('extracted_summary'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Questions Table
export const questions = pgTable('questions', {
  id: text('id').primaryKey(),
  materialId: text('material_id').references(() => materials.id, { onDelete: 'set null' }),
  stem: text('stem').notNull(),
  imageUrl: text('image_url'),
  difficulty: text('difficulty').notNull(), // 'easy' | 'medium' | 'hard'
  topic: text('topic').notNull(),
  correctOptionId: text('correct_option_id'), // referencing options(id) dynamically
  explanationCorrect: text('explanation_correct').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Options Table
export const options = pgTable('options', {
  id: text('id').primaryKey(),
  questionId: text('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  label: text('label').notNull(), // 'A' | 'B' | 'C' | 'D'
  text: text('text').notNull(),
  imageUrl: text('image_url'),
  explanationWrong: text('explanation_wrong'), // nullable, only on incorrect options
});

// Quizzes Table
export const quizzes = pgTable('quizzes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  difficulty: text('difficulty').notNull(), // 'easy' | 'medium' | 'hard' | 'mixed'
  secondsPerQuestion: integer('seconds_per_question').default(80).notNull(),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Join Table for Quiz and Questions
export const quizQuestions = pgTable('quiz_questions', {
  quizId: text('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.quizId, table.questionId] }),
}));

// Attempts Table
export const attempts = pgTable('attempts', {
  id: text('id').primaryKey(),
  quizId: text('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  submittedAt: timestamp('submitted_at'),
  score: integer('score').default(0).notNull(),
  totalQuestions: integer('total_questions').notNull(),
  correctCount: integer('correct_count').default(0).notNull(),
  wrongCount: integer('wrong_count').default(0).notNull(),
  unansweredCount: integer('unanswered_count').default(0).notNull(),
  timeUsedSeconds: integer('time_used_seconds').default(0).notNull(),
  overallTimeRemainingAtSave: integer('overall_time_remaining_at_save'),
});

// Attempt Answers Table
export const attemptAnswers = pgTable('attempt_answers', {
  attemptId: text('attempt_id').notNull().references(() => attempts.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  selectedOptionId: text('selected_option_id'), // nullable if unanswered
  isCorrect: boolean('is_correct').notNull(),
  timeSpentSeconds: integer('time_spent_seconds').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.attemptId, table.questionId] }),
}));

// Encouragement Messages Table
export const encouragementMessages = pgTable('encouragement_messages', {
  id: text('id').primaryKey(),
  tier: text('tier').notNull(), // 'celebrate' | 'good' | 'push' | 'comeback'
  text: text('text').notNull(),
  active: boolean('active').default(true).notNull(),
});
