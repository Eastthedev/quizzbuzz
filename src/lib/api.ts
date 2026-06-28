import { 
  User, Material, Question, Option, Quiz, Attempt, AttemptAnswer, EncouragementMessage, EncouragementTier
} from '../types';

// CSR Helper
const isBrowser = () => typeof window !== 'undefined';

const KEYS = {
  CURRENT_USER: 'cbt_current_user',
  ADMIN_LOGGED_IN: 'cbt_admin_logged_in'
};

// No-op seed for database phase since seed script handles PostgreSQL seeding
export function initializeDB() {
  // Database seeded server-side
}

// Global fetch helper
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  const response = await fetch(url, defaultOptions);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// AUTH API
export async function login(examId: string, passwordHash: string): Promise<User | null> {
  try {
    const data = await request<{ success: boolean; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ examId, password: passwordHash }),
    });

    if (data.success && data.user) {
      if (isBrowser()) {
        localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(data.user));
        if (data.user.role === 'admin') {
          localStorage.setItem(KEYS.ADMIN_LOGGED_IN, 'true');
        }
      }
      return data.user;
    }
    return null;
  } catch (err) {
    console.error('API login failed:', err);
    return null;
  }
}

export async function adminLogin(password: string): Promise<boolean> {
  const user = await login('admin', password);
  return user !== null && user.role === 'admin';
}

export async function logout(): Promise<void> {
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    if (isBrowser()) {
      localStorage.removeItem(KEYS.CURRENT_USER);
      localStorage.removeItem(KEYS.ADMIN_LOGGED_IN);
    }
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const data = await request<{ success: boolean; user: User | null }>('/api/auth/me');
    if (data.success && data.user) {
      if (isBrowser()) {
        localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(data.user));
      }
      return data.user;
    }
    return null;
  } catch (err) {
    // Fallback to localStorage if offline or api fails temporarily
    if (isBrowser()) {
      const cached = localStorage.getItem(KEYS.CURRENT_USER);
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  }
}

export async function isAdminLoggedIn(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null && user.role === 'admin';
}

export async function updateOnboardingExamDate(userId: string, examDate: string): Promise<User> {
  const data = await request<{ success: boolean }>('/api/auth/me', {
    method: 'PATCH',
    body: JSON.stringify({ examDate }),
  });

  const latestUser = await getCurrentUser();
  return latestUser!;
}

// QUIZ APIS
export async function getQuizzes(): Promise<Quiz[]> {
  const data = await request<{ success: boolean; quizzes: Quiz[] }>('/api/quizzes');
  return data.quizzes;
}

export async function getQuiz(quizId: string): Promise<Quiz | null> {
  const quizzes = await getQuizzes();
  return quizzes.find(q => q.id === quizId) || null;
}

export async function createQuiz(quiz: Omit<Quiz, 'id' | 'createdAt'>): Promise<Quiz> {
  const data = await request<{ success: boolean; quiz: Quiz }>('/api/quizzes', {
    method: 'POST',
    body: JSON.stringify(quiz),
  });
  return data.quiz;
}

export async function deleteQuiz(quizId: string): Promise<boolean> {
  await request(`/api/quizzes/${quizId}`, { method: 'DELETE' });
  return true;
}

// QUESTION APIS
export async function getQuestions(): Promise<Question[]> {
  const data = await request<{ success: boolean; questions: Question[] }>('/api/questions');
  return data.questions;
}

export async function createQuestion(question: Omit<Question, 'id'>): Promise<Question> {
  const data = await request<{ success: boolean; questionId: string }>('/api/questions', {
    method: 'POST',
    body: JSON.stringify(question),
  });
  return {
    ...question,
    id: data.questionId,
  };
}

export async function updateQuestion(updatedQuestion: Question): Promise<Question> {
  await request(`/api/questions/${updatedQuestion.id}`, {
    method: 'PATCH',
    body: JSON.stringify(updatedQuestion),
  });
  return updatedQuestion;
}

export async function deleteQuestion(questionId: string): Promise<boolean> {
  await request(`/api/questions/${questionId}`, { method: 'DELETE' });
  return true;
}

// ATTEMPTS & ACTIVE SESSION APIS
export async function startAttempt(quizId: string, userId: string): Promise<Attempt> {
  const data = await request<{ success: boolean; attempt: Attempt }>('/api/attempts', {
    method: 'POST',
    body: JSON.stringify({ quizId }),
  });
  return data.attempt;
}

export async function getAttempt(attemptId: string): Promise<Attempt | null> {
  const data = await request<{ success: boolean; attempt: Attempt }>(`/api/attempts/${attemptId}`);
  return data.attempt;
}

export async function saveAttemptHeartbeat(
  attemptId: string, 
  data: { 
    overallTimeRemaining: number; 
    timeUsedSeconds: number;
    answers: { questionId: string; selectedOptionId?: string; timeSpentSeconds: number }[]
  }
): Promise<void> {
  await request(`/api/attempts/${attemptId}/heartbeat`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function submitAttempt(
  attemptId: string, 
  answers: { questionId: string; selectedOptionId?: string; timeSpentSeconds: number }[]
): Promise<Attempt> {
  const data = await request<{ success: boolean; score: number; correctCount: number; wrongCount: number; unansweredCount: number; timeUsedSeconds: number }>((`/api/attempts/${attemptId}/submit`), {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });

  // Load updated attempt profile
  const details = await getAttempt(attemptId);
  return details!;
}

export async function getAttemptResults(attemptId: string): Promise<{
  attempt: Attempt;
  quiz: Quiz;
  questions: Question[];
  answers: AttemptAnswer[];
  encouragement: EncouragementMessage;
}> {
  return await request<{
    attempt: Attempt;
    quiz: Quiz;
    questions: Question[];
    answers: AttemptAnswer[];
    encouragement: EncouragementMessage;
  }>(`/api/attempts/${attemptId}/result`);
}

export async function getUserAttempts(userId: string): Promise<(Attempt & { quizTitle: string; quizDifficulty: string })[]> {
  const data = await request<{ success: boolean; history: (Attempt & { quizTitle: string; quizDifficulty: string })[] }>('/api/dashboard');
  return data.history;
}

// MATERIALS MANAGEMENT APIS
export async function getMaterials(): Promise<Material[]> {
  const data = await request<{ success: boolean; materials: Material[] }>('/api/admin/materials');
  return data.materials;
}

export async function uploadMaterial(
  title: string, 
  type: 'pdf' | 'docx' | 'pptx' | 'image' | 'text',
  file?: File | null
): Promise<Material> {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('type', type);
  
  if (file) {
    formData.append('file', file);
  } else {
    // Generate dummy file payload for backend parsing compatibility if none selected in form
    const blob = new Blob([`Dummy note: ${title}`], { type: 'text/plain' });
    formData.append('file', blob, `${title}.txt`);
  }

  const response = await fetch('/api/admin/materials', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed.');
  }

  const data = await response.json();
  return {
    id: data.materialId,
    title,
    type,
    uploadedAt: new Date().toISOString(),
    status: 'pending',
  };
}

export async function deleteMaterial(materialId: string): Promise<boolean> {
  await request(`/api/admin/materials/${materialId}`, { method: 'DELETE' });
  return true;
}

// AI GENERATOR
export async function generateQuestionsFromMaterial(
  materialIds: string[], 
  count: number, 
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed',
  topic = 'General Medical Science'
): Promise<Omit<Question, 'id'>[]> {
  const data = await request<{ success: boolean; questions: Omit<Question, 'id'>[] }>('/api/admin/generate', {
    method: 'POST',
    body: JSON.stringify({ materialIds, count, difficulty, topic }),
  });
  return data.questions;
}

// ENCOURAGEMENT MESSAGE APIS
export async function getEncouragementMessages(): Promise<EncouragementMessage[]> {
  const data = await request<{ success: boolean; messages: EncouragementMessage[] }>('/api/encouragement');
  return data.messages;
}

export async function createEncouragementMessage(text: string, tier: EncouragementTier): Promise<EncouragementMessage> {
  const data = await request<{ success: boolean; message: EncouragementMessage }>('/api/encouragement', {
    method: 'POST',
    body: JSON.stringify({ text, tier }),
  });
  return data.message;
}

export async function updateEncouragementMessage(msg: EncouragementMessage): Promise<EncouragementMessage> {
  await request(`/api/encouragement/${msg.id}`, {
    method: 'PATCH',
    body: JSON.stringify(msg),
  });
  return msg;
}

export async function deleteEncouragementMessage(id: string): Promise<boolean> {
  await request(`/api/encouragement/${id}`, { method: 'DELETE' });
  return true;
}

export async function getRandomEncouragement(tier: EncouragementTier): Promise<EncouragementMessage> {
  const messages = await request<{ success: boolean; messages: EncouragementMessage[] }>(`/api/encouragement?tier=${tier}`);
  
  if (messages.messages.length === 0) {
    return {
      id: 'fallback',
      tier,
      text: 'Keep push it, future Doctor! Every question builds your diagnostic instinct.',
      active: true
    };
  }

  return messages.messages[Math.floor(Math.random() * messages.messages.length)];
}

// ADMIN DASHBOARD METRICS
export async function getAdminDashboardStats(): Promise<{
  totalMaterials: number;
  totalQuestions: number;
  users: (User & { attemptCount: number; averageScore: number })[];
}> {
  return await request<{
    totalMaterials: number;
    totalQuestions: number;
    users: (User & { attemptCount: number; averageScore: number })[];
  }>('/api/admin/dashboard');
}
