import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { materials } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';

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

    await db.delete(materials).where(eq(materials.id, id));

    return NextResponse.json({ success: true, message: 'Material deleted.' });
  } catch (err: any) {
    console.error('Delete material error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
