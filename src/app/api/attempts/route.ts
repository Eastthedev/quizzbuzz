import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attempts, quizzes, questions, quizQuestions, options } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';

// POST /api/attempts -> Start Attempt
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const { quizId } = await req.json();

    if (!quizId) {
      return NextResponse.json({ success: false, error: 'Quiz ID is required.' }, { status: 400 });
    }

    // 1. Get Quiz details
    const quizList = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
      .limit(1);

    if (quizList.length === 0) {
      return NextResponse.json({ success: false, error: 'Quiz not found.' }, { status: 404 });
    }

    const quiz = quizList[0];

    // 2. Fetch linked questions ordered by position
    const linkedQs = await db
      .select({
        questionId: quizQuestions.questionId,
        position: quizQuestions.position,
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(asc(quizQuestions.position));

    const totalQuestions = linkedQs.length;
    const totalSeconds = totalQuestions * quiz.secondsPerQuestion;

    // 3. Create Attempt Row
    const newAttemptId = `att_${Date.now()}`;
    await db.insert(attempts).values({
      id: newAttemptId,
      quizId,
      userId: session.userId,
      startedAt: new Date(),
      score: 0,
      totalQuestions,
      correctCount: 0,
      wrongCount: 0,
      unansweredCount: totalQuestions,
      timeUsedSeconds: 0,
      overallTimeRemainingAtSave: totalSeconds,
    });

    // 4. Fetch questions details and their options
    const questionDetailsList = [];
    for (const link of linkedQs) {
      const qList = await db
        .select()
        .from(questions)
        .where(eq(questions.id, link.questionId))
        .limit(1);

      if (qList.length > 0) {
        const q = qList[0];
        
        // Fetch options linked to this question
        const qOpts = await db
          .select({
            id: options.id,
            label: options.label,
            text: options.text,
            imageUrl: options.imageUrl,
          })
          .from(options)
          .where(eq(options.questionId, q.id));

        // SECURITY: Strip correctOptionId, explanationCorrect, and explanationWrong
        questionDetailsList.push({
          id: q.id,
          stem: q.stem,
          imageUrl: q.imageUrl,
          difficulty: q.difficulty,
          topic: q.topic,
          options: qOpts.sort((a, b) => a.label.localeCompare(b.label)),
        });
      }
    }

    return NextResponse.json({
      success: true,
      attempt: {
        id: newAttemptId,
        quizId,
        userId: session.userId,
        totalQuestions,
        secondsPerQuestion: quiz.secondsPerQuestion,
        overallTimeRemaining: totalSeconds,
      },
      questions: questionDetailsList,
    });
  } catch (err: any) {
    console.error('Start attempt error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
