import { db } from './index';
import * as schema from './schema';
import bcrypt from 'bcryptjs';
import { 
  mockEncouragementMessages, mockMaterials, mockQuestions, mockQuizzes, mockUsers 
} from '../lib/mockData';

async function seed() {
  console.log('Seeding database...');

  // 1. Clean existing data (safe deletes with cascading)
  await db.delete(schema.attemptAnswers);
  await db.delete(schema.attempts);
  await db.delete(schema.quizQuestions);
  await db.delete(schema.quizzes);
  await db.delete(schema.options);
  await db.delete(schema.questions);
  await db.delete(schema.materials);
  await db.delete(schema.encouragementMessages);
  await db.delete(schema.users);

  // 2. Hash passwords and insert users
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
  const studentPassword = process.env.STUDENT_PASSWORD || 'password';

  const adminHash = await bcrypt.hash(adminPassword, 10);
  const studentHash = await bcrypt.hash(studentPassword, 10);

  // Insert Admin
  await db.insert(schema.users).values({
    id: 'admin_1',
    fullName: 'Dr. Baby',
    examId: 'admin',
    passwordHash: adminHash,
    role: 'admin',
    currentStreak: 0,
    longestStreak: 0,
  });

  // Insert Student
  await db.insert(schema.users).values({
    id: 'student_1',
    fullName: 'Ugwunta Mmesoma',
    examId: 'unec/mbbs/2026/042',
    passwordHash: studentHash,
    role: 'user',
    currentStreak: 5,
    longestStreak: 12,
    examDate: '2026-11-15',
  });

  console.log('Users seeded.');

  // 3. Insert Encouragement Messages
  for (const msg of mockEncouragementMessages) {
    await db.insert(schema.encouragementMessages).values({
      id: msg.id,
      tier: msg.tier,
      text: msg.text,
      active: msg.active,
    });
  }
  console.log('Encouragement messages seeded.');

  // 4. Insert Study Materials
  for (const mat of mockMaterials) {
    await db.insert(schema.materials).values({
      id: mat.id,
      title: mat.title,
      type: mat.type,
      status: mat.status,
      extractedText: mat.extractedText,
      extractedSummary: mat.extractedSummary,
    });
  }
  console.log('Study materials seeded.');

  // 5. Insert Questions and Options
  for (const q of mockQuestions) {
    await db.insert(schema.questions).values({
      id: q.id,
      materialId: q.materialId,
      stem: q.stem,
      imageUrl: q.imageUrl,
      difficulty: q.difficulty,
      topic: q.topic,
      correctOptionId: q.correctOptionId, // Set correctOptionId
      explanationCorrect: q.explanationCorrect,
    });

    for (const opt of q.options) {
      await db.insert(schema.options).values({
        id: opt.id,
        questionId: q.id,
        label: opt.label,
        text: opt.text,
        imageUrl: opt.imageUrl,
        explanationWrong: opt.explanationWrong,
      });
    }
  }
  console.log('Questions and options seeded.');

  // 6. Insert Quizzes and QuizQuestions join
  for (const qz of mockQuizzes) {
    await db.insert(schema.quizzes).values({
      id: qz.id,
      title: qz.title,
      difficulty: qz.difficulty,
      secondsPerQuestion: qz.secondsPerQuestion,
      createdBy: 'admin_1',
    });

    if (qz.questionIds) {
      for (let pos = 0; pos < qz.questionIds.length; pos++) {
        await db.insert(schema.quizQuestions).values({
          quizId: qz.id,
          questionId: qz.questionIds[pos],
          position: pos + 1,
        });
      }
    }
  }
  console.log('Quizzes and join relations seeded.');

  console.log('Database seeding complete successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
