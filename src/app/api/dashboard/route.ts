import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attempts, quizzes, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    // Load active user profile metrics
    const userList = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (userList.length === 0) {
      return NextResponse.json({ success: false, error: 'User profile not found.' }, { status: 404 });
    }

    const profile = userList[0];

    // Load attempt history sorted by date submitted
    const attemptLogs = await db
      .select({
        id: attempts.id,
        quizId: attempts.quizId,
        userId: attempts.userId,
        startedAt: attempts.startedAt,
        submittedAt: attempts.submittedAt,
        score: attempts.score,
        totalQuestions: attempts.totalQuestions,
        correctCount: attempts.correctCount,
        wrongCount: attempts.wrongCount,
        unansweredCount: attempts.unansweredCount,
        timeUsedSeconds: attempts.timeUsedSeconds,
        quizTitle: quizzes.title,
        quizDifficulty: quizzes.difficulty,
      })
      .from(attempts)
      .innerJoin(quizzes, eq(attempts.quizId, quizzes.id))
      .where(eq(attempts.userId, session.userId))
      .orderBy(desc(attempts.submittedAt));

    // Filter only submitted attempts to be shown in dashboard history
    const submittedAttempts = attemptLogs.filter(att => att.submittedAt !== null);

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        fullName: profile.fullName,
        examId: profile.examId,
        currentStreak: profile.currentStreak,
        longestStreak: profile.longestStreak,
        examDate: profile.examDate,
      },
      history: submittedAttempts,
    });
  } catch (err: any) {
    console.error('Fetch student dashboard stats error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
