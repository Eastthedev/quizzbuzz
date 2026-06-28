import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, options } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';

// PATCH /api/questions/[id] -> Update Question details and option text
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUser(req);

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();

    const { stem, difficulty, topic, explanationCorrect, correctOptionId, options: optionsList } = body;

    // Use transaction
    await db.transaction(async (tx) => {
      // 1. Update core fields
      await tx
        .update(questions)
        .set({
          stem,
          difficulty,
          topic,
          explanationCorrect,
        })
        .where(eq(questions.id, id));

      // 2. Update Options
      let matchedCorrectOptId = correctOptionId;
      for (const opt of optionsList) {
        // If correctOptionId was passed as mock index, resolve it
        const isCorrectTarget = opt.id === correctOptionId;

        await tx
          .update(options)
          .set({
            text: opt.text,
            explanationWrong: opt.explanationWrong || null,
          })
          .where(eq(options.id, opt.id));

        if (isCorrectTarget) {
          matchedCorrectOptId = opt.id;
        }
      }

      // 3. Update correctOptionId
      if (matchedCorrectOptId) {
        await tx
          .update(questions)
          .set({ correctOptionId: matchedCorrectOptId })
          .where(eq(questions.id, id));
      }
    });

    return NextResponse.json({ success: true, message: 'Question updated.' });
  } catch (err: any) {
    console.error('Update question error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/questions/[id] -> Delete Question
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUser(req);

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;

    await db.delete(questions).where(eq(questions.id, id));

    return NextResponse.json({ success: true, message: 'Question deleted.' });
  } catch (err: any) {
    console.error('Delete question error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
