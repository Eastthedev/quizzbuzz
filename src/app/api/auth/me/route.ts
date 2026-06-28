import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    if (!session) {
      return NextResponse.json({ success: false, user: null });
    }

    const matched = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (matched.length === 0) {
      return NextResponse.json({ success: false, user: null }, { status: 404 });
    }

    const user = matched[0];

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        examId: user.examId,
        role: user.role,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        examDate: user.examDate,
      },
    });
  } catch (err: any) {
    console.error('Verify session error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// Support updating user settings (like examDate during onboarding or countdown editing)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { examDate } = await req.json();

    if (!examDate) {
      return NextResponse.json({ success: false, error: 'Exam date is required.' }, { status: 400 });
    }

    await db
      .update(users)
      .set({ examDate })
      .where(eq(users.id, session.userId));

    return NextResponse.json({
      success: true,
      message: 'Exam date updated.',
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
