import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { signJWT } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { examId, password } = await req.json();

    if (!examId || !password) {
      return NextResponse.json(
        { success: false, error: 'Please enter both Exam ID and password.' },
        { status: 400 }
      );
    }

    // Lookup user in database
    const matchedUsers = await db
      .select()
      .from(users)
      .where(eq(users.examId, examId))
      .limit(1);

    if (matchedUsers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Incorrect Exam ID or password.' },
        { status: 401 }
      );
    }

    const user = matchedUsers[0];

    // Verify Password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: 'Incorrect Exam ID or password.' },
        { status: 401 }
      );
    }

    // Sign JWT
    const token = await signJWT({
      userId: user.id,
      role: user.role as 'user' | 'admin',
    });

    // Create response
    const response = NextResponse.json({
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

    // Set HTTP-Only Cookie
    response.cookies.set('cbt_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error.' },
      { status: 500 }
    );
  }
}
