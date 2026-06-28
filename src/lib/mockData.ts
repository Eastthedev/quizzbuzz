import { User, Material, Question, Quiz, Attempt, EncouragementMessage } from '../types';

export const mockUsers: User[] = [
  {
    id: 'student_1',
    fullName: 'Ugwunta Mmesoma',
    examId: 'unec/mbbs/2026/042',
    role: 'user',
    currentStreak: 5,
    longestStreak: 12,
    examDate: '2026-11-15',
  },
  {
    id: 'admin_1',
    fullName: 'Dr. Baby',
    examId: 'admin',
    role: 'admin',
    currentStreak: 0,
    longestStreak: 0,
  }
];

export const mockMaterials: Material[] = [];
export const mockQuestions: Question[] = [];
export const mockQuizzes: Quiz[] = [];
export const mockAttempts: Attempt[] = [];

export const mockEncouragementMessages: EncouragementMessage[] = [
  {
    id: 'enc_1',
    tier: 'celebrate',
    text: 'Future Dr. Mmesoma! 85%+! That was outstanding clinical reasoning. You are mastering this material completely. Let\'s keep this fire burning!',
    active: true,
  },
  {
    id: 'enc_2',
    tier: 'celebrate',
    text: 'Incredible score, Dr. Mmesoma! The UNEC pediatric ward is waiting for this level of competence. Extremely proud of your effort!',
    active: true,
  },
  {
    id: 'enc_3',
    tier: 'good',
    text: 'A very solid pass, future doctor! 65-84% shows you know your stuff. Just a few adjustments on the explanations and you are on track for a distinction!',
    active: true,
  },
  {
    id: 'enc_4',
    tier: 'good',
    text: 'Well done! You have a firm grasp of these clinical scenarios. Review the couple of gaps and let\'s push for that high distinction next time.',
    active: true,
  },
  {
    id: 'enc_5',
    tier: 'push',
    text: 'A decent effort! 40-64% is a solid foundation, but we want you fully prepared for those UNEC examiners. Read through the explanations, rest your eyes, and let\'s try another round!',
    active: true,
  },
  {
    id: 'enc_6',
    tier: 'push',
    text: 'Consistency beats intensity. Keep working through the incorrect options—understanding why it is NOT B or C is how great diagnostics are built. You can do this!',
    active: true,
  },
  {
    id: 'enc_7',
    tier: 'comeback',
    text: 'Medical school is a marathon, not a sprint. This test was tough, but every error is a diagnostic clue for your study plan. Let\'s review the wrong answers together and bounce back!',
    active: true,
  },
  {
    id: 'enc_8',
    tier: 'comeback',
    text: 'Don\'t sweat this score, future Dr. Mmesoma. Take a deep breath, review the explanations for each option, and let\'s rebuild. I believe in you, let\'s go again!',
    active: true,
  }
];
