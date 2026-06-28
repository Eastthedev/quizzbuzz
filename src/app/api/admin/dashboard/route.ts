import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { materials, questions, users, attempts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    // 1. Get counts
    const materialsList = await db.select().from(materials);
    const questionsList = await db.select().from(questions);
    
    // 2. Fetch all student users (excluding admin)
    const studentUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'user'));

    // 3. Fetch all attempts to compute aggregates in-memory
    const allAttempts = await db.select().from(attempts);

    const userStats = studentUsers.map(student => {
      const studentAttempts = allAttempts.filter(
        a => a.userId === student.id && a.submittedAt !== null
      );
      const attemptCount = studentAttempts.length;
      
      const scoreSum = studentAttempts.reduce((acc, curr) => acc + curr.score, 0);
      const averageScore = attemptCount > 0 ? Math.round(scoreSum / attemptCount) : 0;

      return {
        id: student.id,
        fullName: student.fullName,
        examId: student.examId,
        currentStreak: student.currentStreak,
        longestStreak: student.longestStreak,
        examDate: student.examDate,
        attemptCount,
        averageScore,
      };
    });

    return NextResponse.json({
      success: true,
      totalMaterials: materialsList.length,
      totalQuestions: questionsList.length,
      users: userStats,
    });
  } catch (err: any) {
    console.error('Fetch admin stats error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
