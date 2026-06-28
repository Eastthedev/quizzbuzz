import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attempts, attemptAnswers, questions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const session = await getSessionUser(req);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const { attemptId } = params;
    const { overallTimeRemaining, timeUsedSeconds, answers } = await req.json();

    // 1. Verify attempt exists
    const matchedAttempts = await db
      .select()
      .from(attempts)
      .where(eq(attempts.id, attemptId))
      .limit(1);

    if (matchedAttempts.length === 0) {
      return NextResponse.json({ success: false, error: 'Attempt not found.' }, { status: 404 });
    }

    // 2. Update active attempt metadata
    await db
      .update(attempts)
      .set({
        timeUsedSeconds,
        overallTimeRemainingAtSave: overallTimeRemaining,
      })
      .where(eq(attempts.id, attemptId));

    // 3. Upsert answers progress
    const allQuestions = await db.select().from(questions);

    for (const ans of answers) {
      const q = allQuestions.find(curr => curr.id === ans.questionId);
      const isCorrect = q && ans.selectedOptionId ? q.correctOptionId === ans.selectedOptionId : false;

      await db
        .insert(attemptAnswers)
        .values({
          attemptId,
          questionId: ans.questionId,
          selectedOptionId: ans.selectedOptionId || null,
          isCorrect,
          timeSpentSeconds: ans.timeSpentSeconds,
        })
        .onConflictDoUpdate({
          target: [attemptAnswers.attemptId, attemptAnswers.questionId],
          set: {
            selectedOptionId: ans.selectedOptionId || null,
            isCorrect,
            timeSpentSeconds: ans.timeSpentSeconds,
          },
        });
    }

    return NextResponse.json({ success: true, message: 'Heartbeat saved.' });
  } catch (err: any) {
    console.error('Heartbeat save error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
