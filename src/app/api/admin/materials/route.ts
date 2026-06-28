import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { materials } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';
import JSZip from 'jszip';

// Initialize Gemini Client
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// GET /api/admin/materials -> List Materials
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const data = await db
      .select()
      .from(materials)
      .orderBy(desc(materials.createdAt));

    return NextResponse.json({ success: true, materials: data });
  } catch (err: any) {
    console.error('Fetch materials error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// Helper to extract PPTX text from XML slide files
async function extractTextFromPPTX(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files).filter(
    name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
  );
  
  // Sort slide files numerically (slide1.xml, slide2.xml...)
  slideFiles.sort((a, b) => {
    const numA = parseInt(a.replace(/[^\d]/g, '')) || 0;
    const numB = parseInt(b.replace(/[^\d]/g, '')) || 0;
    return numA - numB;
  });

  let text = '';
  for (const file of slideFiles) {
    const content = await zip.files[file].async('text');
    // Strip XML tags and clean spacing
    const stripped = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    text += `[Slide ${slideFiles.indexOf(file) + 1}] ${stripped}\n\n`;
  }
  return text;
}

// POST /api/admin/materials -> Upload & Process
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const type = formData.get('type') as 'pdf' | 'docx' | 'pptx' | 'image' | 'text' | null;

    if (!file || !title || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing title, file, or type parameters.' },
        { status: 400 }
      );
    }

    // Convert file to Node buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const newMaterialId = `mat_${Date.now()}`;
    
    // Create pending entry
    await db.insert(materials).values({
      id: newMaterialId,
      title,
      type,
      status: 'pending',
      createdAt: new Date(),
    });

    // Run extraction asynchronously or in-memory
    let extractedText = '';
    let extractedSummary = '';

    try {
      if (type === 'text') {
        extractedText = buffer.toString('utf-8');
      } else if (type === 'docx') {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      } else if (type === 'pptx') {
        extractedText = await extractTextFromPPTX(buffer);
      }

      // If PDF or Image, or if text was extracted and we need to summarize it
      if (type === 'pdf' || type === 'image') {
        if (!GEMINI_API_KEY) {
          throw new Error('GEMINI_API_KEY is not set in environment.');
        }

        // Inline base64 payload
        const filePart = {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: file.type || 'application/pdf',
          },
        };

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const prompt = 'Analyze this study guide document. Transcribe its core textual concepts completely, explaining any clinical diagrams, charts, or images in detail so it can be used to generate medical school quiz questions. Also output a summary of the document at the very end marked by "===SUMMARY===".';

        const result = await model.generateContent([prompt, filePart]);
        const responseText = result.response.text();

        // Split text and summary
        const parts = responseText.split('===SUMMARY===');
        extractedText = parts[0]?.trim();
        extractedSummary = parts[1]?.trim() || 'Summary analyzed by AI.';
      } else {
        // Text / Word / PPTX summary generation using Gemini
        if (!GEMINI_API_KEY) {
          throw new Error('GEMINI_API_KEY is not set in environment.');
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const prompt = `Review this medical school study note:\n\n${extractedText.slice(0, 15000)}\n\nGenerate a detailed diagnostic study summary highlighting the pathology, pharmacology or microbiological concepts mentioned, structured by key points.`;
        
        const result = await model.generateContent(prompt);
        extractedSummary = result.response.text().trim();
      }

      // Update material as processed
      await db
        .update(materials)
        .set({
          status: 'processed',
          extractedText,
          extractedSummary,
        })
        .where(eq(materials.id, newMaterialId));

    } catch (err: any) {
      console.error('File parsing process failed:', err);
      
      // Update material as failed
      await db
        .update(materials)
        .set({
          status: 'failed',
          extractedSummary: `Parsing failed: ${err.message || err}`,
        })
        .where(eq(materials.id, newMaterialId));
    }

    return NextResponse.json({
      success: true,
      materialId: newMaterialId,
    });
  } catch (err: any) {
    console.error('Upload material route error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
