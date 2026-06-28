import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { questions, options } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';

// GET /api/questions -> List all bank questions with options
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const qData = await db.select().from(questions);
    
    const questionsWithOptions = [];

    for (const q of qData) {
      const qOpts = await db
        .select()
        .from(options)
        .where(eq(options.questionId, q.id));

      questionsWithOptions.push({
        ...q,
        options: qOpts.sort((a, b) => a.label.localeCompare(b.label)),
      });
    }

    return NextResponse.json({ success: true, questions: questionsWithOptions });
  } catch (err: any) {
    console.error('Fetch questions bank error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/questions -> Create new question and options in transactional batch
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const { materialId, stem, imageUrl, difficulty, topic, correctOptionId, explanationCorrect, options: optionsList } = await req.json();

    if (!stem || !difficulty || !topic || !optionsList || optionsList.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing required parameters.' }, { status: 400 });
    }

    const newQuestionId = `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Use transaction to ensure both question and options write or fail together
    await db.transaction(async (tx) => {
      // 1. Insert Question
      await tx.insert(questions).values({
        id: newQuestionId,
        materialId: materialId || null,
        stem,
        imageUrl: imageUrl || null,
        difficulty,
        topic,
        correctOptionId: null, // set to null first, then updated after options insert
        explanationCorrect,
        createdAt: new Date(),
      });

      // 2. Insert Options
      let finalCorrectId = '';
      for (const opt of optionsList) {
        const isCorrectTarget = opt.id === correctOptionId || opt.isCorrect;
        const newOptId = `opt_${Date.now()}_${opt.label.toLowerCase()}_${Math.floor(Math.random() * 100)}`;
        
        await tx.insert(options).values({
          id: newOptId,
          questionId: newQuestionId,
          label: opt.label,
          text: opt.text,
          imageUrl: opt.imageUrl || null,
          explanationWrong: opt.explanationWrong || null,
        });

        if (isCorrectTarget) {
          finalCorrectId = newOptId;
        }
      }

      // 3. Update question with correctOptionId link
      if (finalCorrectId) {
        await tx
          .update(questions)
          .set({ correctOptionId: finalCorrectId })
          .where(eq(questions.id, newQuestionId));
      }
    });

    return NextResponse.json({ success: true, questionId: newQuestionId });
  } catch (err: any) {
    console.error('Create question error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/questions -> Bulk delete questions
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { ids, all } = body;

    if (all === true) {
      // Delete all questions
      await db.delete(questions);
      return NextResponse.json({ success: true, message: 'All questions deleted from bank.' });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing question IDs to delete.' },
        { status: 400 }
      );
    }

    // Delete matching questions
    await db.delete(questions).where(inArray(questions.id, ids));

    return NextResponse.json({ success: true, message: `${ids.length} questions deleted.` });
  } catch (err: any) {
    console.error('Bulk delete questions error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
