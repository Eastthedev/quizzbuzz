import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { encouragementMessages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';

// PATCH /api/encouragement/[id] -> Update text/tier/active status
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

    const { text, tier, active } = body;

    await db
      .update(encouragementMessages)
      .set({
        text,
        tier,
        active,
      })
      .where(eq(encouragementMessages.id, id));

    return NextResponse.json({ success: true, message: 'Encouragement message updated.' });
  } catch (err: any) {
    console.error('Update encouragement error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/encouragement/[id] -> Delete message
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

    await db.delete(encouragementMessages).where(eq(encouragementMessages.id, id));

    return NextResponse.json({ success: true, message: 'Encouragement message deleted.' });
  } catch (err: any) {
    console.error('Delete encouragement error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
