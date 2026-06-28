import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attempts, quizzes, questions, attemptAnswers, options, encouragementMessages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const session = await getSessionUser(req);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const { attemptId } = params;

    // 1. Fetch Attempt
    const matchedAttempts = await db
      .select()
      .from(attempts)
      .where(eq(attempts.id, attemptId))
      .limit(1);

    if (matchedAttempts.length === 0) {
      return NextResponse.json({ success: false, error: 'Attempt not found.' }, { status: 404 });
    }

    const attempt = matchedAttempts[0];

    // 2. Fetch Quiz details
    const quizList = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.id, attempt.quizId))
      .limit(1);

    if (quizList.length === 0) {
      return NextResponse.json({ success: false, error: 'Quiz not found.' }, { status: 404 });
    }

    const quiz = quizList[0];

    // 3. Fetch Attempt Answers (what they chose)
    const answersList = await db
      .select()
      .from(attemptAnswers)
      .where(eq(attemptAnswers.attemptId, attemptId));

    // 4. Fetch Questions (including full details)
    const questionDetailsList = [];
    
    // Select questions linked to this attempt's answers
    for (const ans of answersList) {
      const qList = await db
        .select()
        .from(questions)
        .where(eq(questions.id, ans.questionId))
        .limit(1);

      if (qList.length > 0) {
        const q = qList[0];
        
        // Options linked (with wrong option rationales)
        const qOpts = await db
          .select()
          .from(options)
          .where(eq(options.questionId, q.id));

        questionDetailsList.push({
          id: q.id,
          stem: q.stem,
          imageUrl: q.imageUrl,
          difficulty: q.difficulty,
          topic: q.topic,
          correctOptionId: q.correctOptionId,
          explanationCorrect: q.explanationCorrect,
          options: qOpts.sort((a, b) => a.label.localeCompare(b.label)),
        });
      }
    }

    // 5. Select encouragement messages based on score bands
    // ≥85% celebrate, 65–84% good, 40–64% push, <40% comeback
    let tier: 'celebrate' | 'good' | 'push' | 'comeback' = 'comeback';
    if (attempt.score >= 85) tier = 'celebrate';
    else if (attempt.score >= 65) tier = 'good';
    else if (attempt.score >= 40) tier = 'push';

    const messages = await db
      .select()
      .from(encouragementMessages)
      .where(and(eq(encouragementMessages.tier, tier), eq(encouragementMessages.active, true)));

    const fallbackMessage = {
      id: 'fallback',
      tier,
      text: 'Keep studying, future Doctor! Every question builds your diagnostic skills.',
      active: true,
    };

    const encouragement = messages.length > 0 
      ? messages[Math.floor(Math.random() * messages.length)] 
      : fallbackMessage;

    return NextResponse.json({
      success: true,
      attempt,
      quiz,
      questions: questionDetailsList,
      answers: answersList,
      encouragement,
    });
  } catch (err: any) {
    console.error('Fetch attempt results error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
