import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { materials } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getSessionUser } from '@/lib/auth';
import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai';

// Initialize Gemini Client
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Define Gemini JSON schema for strict output structure
const geminiQuestionsSchema: Schema = {
  type: SchemaType.ARRAY,
  description: 'A list of generated multiple choice questions',
  items: {
    type: SchemaType.OBJECT,
    properties: {
      stem: { 
        type: SchemaType.STRING, 
        description: 'The question case study description or clinical stem.' 
      },
      topic: { 
        type: SchemaType.STRING, 
        description: 'The medical topic focus.' 
      },
      difficulty: { 
        type: SchemaType.STRING, 
        description: 'The difficulty level: easy, medium, or hard.' 
      },
      correctLabel: { 
        type: SchemaType.STRING, 
        description: 'The correct option label: A, B, C, or D.' 
      },
      explanationCorrect: { 
        type: SchemaType.STRING, 
        description: 'Detailed explanation for why the correct option is right.' 
      },
      options: {
        type: SchemaType.ARRAY,
        description: 'Four multiple choice options labeled A, B, C, and D.',
        items: {
          type: SchemaType.OBJECT,
          properties: {
            label: { type: SchemaType.STRING, description: 'Option letter: A, B, C, or D.' },
            text: { type: SchemaType.STRING, description: 'Option description text.' },
            explanationWrong: { 
              type: SchemaType.STRING, 
              description: 'Explanation for why this specific option is incorrect (distractor logic).' 
            }
          },
          required: ['label', 'text', 'explanationWrong']
        }
      }
    },
    required: ['stem', 'topic', 'difficulty', 'correctLabel', 'explanationCorrect', 'options']
  }
};

// POST /api/admin/generate -> AI Generator pipeline
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const { materialIds, count, difficulty, topic } = await req.json();

    if (!materialIds || materialIds.length === 0 || !count || !difficulty) {
      return NextResponse.json(
        { success: false, error: 'Missing materialIds, count, or difficulty.' },
        { status: 400 }
      );
    }

    // 1. Fetch study notes transcripts from database
    const selectedMaterials = await db
      .select({
        title: materials.title,
        extractedText: materials.extractedText,
        extractedSummary: materials.extractedSummary,
      })
      .from(materials)
      .where(inArray(materials.id, materialIds));

    if (selectedMaterials.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Source materials not found.' },
        { status: 404 }
      );
    }

    // Combine text notes to build prompt context
    const contextText = selectedMaterials
      .map(m => `--- DOCUMENT: ${m.title} ---\n${m.extractedText || m.extractedSummary || ''}`)
      .join('\n\n');

    // 2. Formulate prompting instructions
    const prompt = `You are a medical school professor compiling exam sheets for a 3rd MBBS exam (UNEC).
Create exactly ${count} multiple-choice questions.

CRITICAL INSTRUCTIONS:
1. STRICT SOURCE-GROUNDING: Only generate questions, concepts, and options that are directly and explicitly supported by the facts in the supplied LECTURES CONTEXT. Do not use external medical knowledge, outside assumptions, or topics that are not present in the context.
2. NO OPTION REPETITION: Every question must have its own unique, distinct set of options. Do NOT repeat or reuse the same option text (or highly similar distractors) across multiple questions.
3. ABSOLUTE ACCURACY: Double check that the correct option label matches the actual correct answer for the question stem. Ensure that the explanations (both for the correct option and the incorrect distractors) correspond precisely to that specific question stem and its options. Do not mix up questions with wrong options or incorrect rationales.

CRITERIA:
- Topic focus requested: ${topic || 'General study guidelines'}.
- Target difficulty requested: ${difficulty}.
- Generate clinical case scenarios where appropriate (especially for medium/hard levels).
- Each question must have exactly four options (A, B, C, D).
- Specify ONE correct option.
- Scramble the correct labels (A, B, C, or D) randomly so there is a roughly even distribution and no clustering patterns.
- For the correct option, provide "explanationCorrect".
- For EACH of the three incorrect options (distractors), write a specific "explanationWrong" explaining why that choice is incorrect.

LECTURES CONTEXT:
${contextText.slice(0, 20000)}
`;

    // 3. Invoke Gemini using JSON Schema settings
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY environment variable is missing.' },
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: geminiQuestionsSchema,
      }
    });

    const responseText = result.response.text();
    const generatedQuestions = JSON.parse(responseText);

    // 4. Transform output to align with frontend Option contracts
    // (mock ids to let admin inspect/edit them before save)
    const transformed = generatedQuestions.map((q: any, qIdx: number) => {
      const qId = `gen_q_${Date.now()}_${qIdx}`;
      
      const optionsMapped = q.options.map((opt: any) => {
        const isCorrect = opt.label.trim().toUpperCase() === q.correctLabel.trim().toUpperCase();
        const optId = `gen_opt_${Date.now()}_${qIdx}_${opt.label.toLowerCase()}`;
        
        return {
          id: optId,
          label: opt.label,
          text: opt.text,
          explanationWrong: isCorrect ? undefined : opt.explanationWrong,
        };
      });

      const correctOption = optionsMapped.find((o: any) => o.label.trim().toUpperCase() === q.correctLabel.trim().toUpperCase());

      return {
        materialId: materialIds[0],
        stem: q.stem,
        correctOptionId: correctOption ? correctOption.id : optionsMapped[0].id,
        explanationCorrect: q.explanationCorrect,
        difficulty: q.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
        topic: q.topic || topic || 'General Medical Science',
        options: optionsMapped,
      };
    });

    return NextResponse.json({
      success: true,
      questions: transformed,
    });
  } catch (err: any) {
    console.error('Question generation failed:', err);
    return NextResponse.json(
      { success: false, error: `AI Generation failed: ${err.message || err}` },
      { status: 500 }
    );
  }
}
