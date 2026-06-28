import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { encouragementMessages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';

// GET /api/encouragement -> List encouragement messages
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const tier = searchParams.get('tier');

    let data;

    if (tier) {
      data = await db
        .select()
        .from(encouragementMessages)
        .where(and(eq(encouragementMessages.tier, tier), eq(encouragementMessages.active, true)));
    } else {
      // Admin list (fetch all)
      data = await db.select().from(encouragementMessages);
    }

    return NextResponse.json({ success: true, messages: data });
  } catch (err: any) {
    console.error('Fetch encouragement error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/encouragement -> Create new message
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const { text, tier } = await req.json();

    if (!text || !tier) {
      return NextResponse.json({ success: false, error: 'Text and tier are required.' }, { status: 400 });
    }

    const newMsgId = `enc_${Date.now()}`;

    await db.insert(encouragementMessages).values({
      id: newMsgId,
      text,
      tier,
      active: true,
    });

    return NextResponse.json({
      success: true,
      message: {
        id: newMsgId,
        text,
        tier,
        active: true,
      },
    });
  } catch (err: any) {
    console.error('Create encouragement error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
