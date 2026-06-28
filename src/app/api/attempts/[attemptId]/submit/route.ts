import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attempts, attemptAnswers, questions, users, encouragementMessages } from '@/db/schema';
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
    const { answers } = await req.json();

    // 1. Get active attempt
    const matchedAttempts = await db
      .select()
      .from(attempts)
      .where(eq(attempts.id, attemptId))
      .limit(1);

    if (matchedAttempts.length === 0) {
      return NextResponse.json({ success: false, error: 'Attempt not found.' }, { status: 404 });
    }

    const attempt = matchedAttempts[0];

    // If already submitted, prevent duplicate submissions
    if (attempt.submittedAt) {
      return NextResponse.json({ success: false, error: 'Exam already submitted.' }, { status: 400 });
    }

    // 2. Fetch actual question options from DB to verify correctness
    const allQuestions = await db.select().from(questions);

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    let timeUsed = 0;

    // Process and insert final answers
    for (const ans of answers) {
      const q = allQuestions.find(curr => curr.id === ans.questionId);
      const isCorrect = q && ans.selectedOptionId ? q.correctOptionId === ans.selectedOptionId : false;

      timeUsed += ans.timeSpentSeconds;

      if (!ans.selectedOptionId) {
        unansweredCount++;
      } else if (isCorrect) {
        correctCount++;
      } else {
        wrongCount++;
      }

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

    const totalQuestions = attempt.totalQuestions;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // 3. Update active attempt row
    await db
      .update(attempts)
      .set({
        submittedAt: new Date(),
        score,
        correctCount,
        wrongCount,
        unansweredCount,
        timeUsedSeconds: timeUsed,
        overallTimeRemainingAtSave: 0,
      })
      .where(eq(attempts.id, attemptId));

    // 4. Update Student Streak metrics
    const userList = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    
    if (userList.length > 0) {
      const student = userList[0];
      const todayStr = new Date().toISOString().split('T')[0];
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let currentStreak = student.currentStreak;

      if (student.lastActiveDate === yesterdayStr) {
        currentStreak += 1;
      } else if (student.lastActiveDate === todayStr) {
        // no change, already logged activity today
      } else {
        currentStreak = 1; // broken or initial streak start
      }

      const longestStreak = Math.max(student.longestStreak, currentStreak);

      await db
        .update(users)
        .set({
          currentStreak,
          longestStreak,
          lastActiveDate: todayStr,
        })
        .where(eq(users.id, session.userId));
    }

    // 5. Select encouragement messages based on score bands
    // ≥85% celebrate, 65–84% good, 40–64% push, <40% comeback
    let tier: 'celebrate' | 'good' | 'push' | 'comeback' = 'comeback';
    if (score >= 85) tier = 'celebrate';
    else if (score >= 65) tier = 'good';
    else if (score >= 40) tier = 'push';

    const messages = await db
      .select()
      .from(encouragementMessages)
      .where(and(eq(encouragementMessages.tier, tier), eq(encouragementMessages.active, true)));

    // Fallback if no matching encouragement in DB
    const fallbackMessage = {
      id: 'fallback',
      tier,
      text: 'Keep studying, future Doctor! Every challenge is a learning milestone.',
      active: true,
    };

    const encouragement = messages.length > 0 
      ? messages[Math.floor(Math.random() * messages.length)] 
      : fallbackMessage;

    return NextResponse.json({
      success: true,
      score,
      correctCount,
      wrongCount,
      unansweredCount,
      timeUsedSeconds: timeUsed,
      encouragement,
    });
  } catch (err: any) {
    console.error('Submit attempt error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
