import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quizzes, quizQuestions } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';

// GET /api/quizzes -> List quizzes (with questionId lists loaded)
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const quizzesList = await db.select().from(quizzes);
    const enrichedQuizzes = [];

    for (const qz of quizzesList) {
      const qLinks = await db
        .select({ questionId: quizQuestions.questionId })
        .from(quizQuestions)
        .where(eq(quizQuestions.quizId, qz.id))
        .orderBy(asc(quizQuestions.position));

      enrichedQuizzes.push({
        ...qz,
        questionCount: qLinks.length,
        questionIds: qLinks.map(l => l.questionId),
      });
    }

    return NextResponse.json({ success: true, quizzes: enrichedQuizzes });
  } catch (err: any) {
    console.error('Fetch quizzes error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/quizzes -> Create new quiz and map its questions
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { title, difficulty, secondsPerQuestion, questionIds } = body;

    if (!title || !difficulty || !questionIds || questionIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing required parameters.' }, { status: 400 });
    }

    const newQuizId = `quiz_${Date.now()}`;

    // Transaction
    await db.transaction(async (tx) => {
      // 1. Insert Quiz
      await tx.insert(quizzes).values({
        id: newQuizId,
        title,
        difficulty,
        secondsPerQuestion: secondsPerQuestion || 80,
        createdBy: session.userId,
        createdAt: new Date(),
      });

      // 2. Insert QuizQuestions references
      for (let idx = 0; idx < questionIds.length; idx++) {
        await tx.insert(quizQuestions).values({
          quizId: newQuizId,
          questionId: questionIds[idx],
          position: idx + 1,
        });
      }
    });

    return NextResponse.json({
      success: true,
      quiz: {
        id: newQuizId,
        title,
        difficulty,
        secondsPerQuestion,
      },
    });
  } catch (err: any) {
    console.error('Create quiz error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
