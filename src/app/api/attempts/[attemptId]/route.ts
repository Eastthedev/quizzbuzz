import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attempts, questions, quizQuestions, options } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';

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

    const matched = await db
      .select()
      .from(attempts)
      .where(eq(attempts.id, attemptId))
      .limit(1);

    if (matched.length === 0) {
      return NextResponse.json({ success: false, error: 'Attempt not found.' }, { status: 404 });
    }

    const attempt = matched[0];

    // Fetch quiz questions linked to this attempt's quiz
    const linkedQs = await db
      .select({
        questionId: quizQuestions.questionId,
        position: quizQuestions.position,
      })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, attempt.quizId))
      .orderBy(asc(quizQuestions.position));

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
        ...attempt,
        questions: questionDetailsList,
      },
    });
  } catch (err: any) {
    console.error('Fetch attempt details error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
