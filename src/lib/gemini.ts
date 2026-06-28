export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic?: string; // Optional field tagging the subtopic for student analytics
}

/**
 * Splits study notes into topic-coherent chunks based on paragraph separators.
 * This preserves local context better than an arbitrary character-count split.
 */
function chunkNotes(notes: string, maxChunkSize: number = 6000): string[] {
  const paragraphs = notes.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    // Check if adding this paragraph exceeds the limit
    if (currentChunk.length + trimmedPara.length + 2 > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmedPara;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n\n${trimmedPara}` : trimmedPara;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  // Fallback if the entire text is a single massive block without paragraph boundaries
  if (chunks.length === 0 && notes.trim().length > 0) {
    let index = 0;
    while (index < notes.length) {
      chunks.push(notes.slice(index, index + maxChunkSize).trim());
      index += maxChunkSize;
    }
  }

  return chunks;
}

/**
 * Unbiasedly shuffles the options of a question and updates the correctIndex
 * to ensure that correct answers are distributed evenly across positions.
 */
function shuffleQuestionOptions(q: QuizQuestion): QuizQuestion {
  // Capture the text of the correct option
  const correctOptionText = q.options[q.correctIndex];

  // Map each option string to include its original correctness status
  const optionsWithCorrectness = q.options.map((text, idx) => ({
    text,
    isCorrect: idx === q.correctIndex,
  }));

  // Fisher-Yates Shuffle Algorithm
  for (let i = optionsWithCorrectness.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = optionsWithCorrectness[i];
    optionsWithCorrectness[i] = optionsWithCorrectness[j];
    optionsWithCorrectness[j] = temp;
  }

  const shuffledOptions = optionsWithCorrectness.map(o => o.text);
  const newCorrectIndex = optionsWithCorrectness.findIndex(o => o.isCorrect);

  return {
    ...q,
    options: shuffledOptions,
    correctIndex: newCorrectIndex === -1 ? 0 : newCorrectIndex,
  };
}

/**
 * Validates the structural integrity of a generated question object.
 */
function isValidQuestion(q: any, type: "mcq" | "tf" | "mixed"): boolean {
  if (!q || typeof q !== "object") return false;
  
  // 1. Question must be a non-empty string
  if (typeof q.question !== "string" || q.question.trim() === "") return false;
  
  // 2. Options must be an array of non-empty strings
  if (!Array.isArray(q.options)) return false;
  if (!q.options.every((opt: any) => typeof opt === "string" && opt.trim() !== "")) return false;

  // 3. Match expected options count depending on the quiz type
  const optionsCount = q.options.length;
  if (type === "mcq" && optionsCount !== 4) return false;
  if (type === "tf" && optionsCount !== 2) return false;
  if (type === "mixed" && optionsCount !== 4 && optionsCount !== 2) return false;

  // 4. Correct index must be valid and within bounds
  if (typeof q.correctIndex !== "number" || q.correctIndex < 0 || q.correctIndex >= optionsCount) return false;

  // 5. Explanation must be a non-empty string
  if (typeof q.explanation !== "string" || q.explanation.trim() === "") return false;

  return true;
}

/**
 * [FIX 3] CROSS-CHUNK DEDUPLICATION
 * Removes near-duplicate questions across chunks using Jaccard word-overlap similarity.
 */
function deduplicateQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  const stopwords = new Set([
    "the", "a", "is", "of", "and", "what", "which", "are", "in", "to", 
    "for", "with", "on", "at", "by", "an", "it", "this", "that"
  ]);
  
  // Helper to tokenize question string into a Set of lowercase words, filtering out stopwords
  const getWordSet = (text: any): Set<string> => {
    if (typeof text !== "string") return new Set();
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, "") // strip punctuation
      .split(/\s+/);
    return new Set(words.filter(w => w.length > 0 && !stopwords.has(w)));
  };

  const wordSets = questions.map(q => getWordSet(q.question));
  const uniqueQuestions: QuizQuestion[] = [];
  const uniqueWordSets: Set<string>[] = [];

  for (let i = 0; i < questions.length; i++) {
    const currentQ = questions[i];
    const currentSet = wordSets[i];
    
    // Compute Jaccard similarity against all already kept unique questions
    let isDuplicate = false;
    for (let j = 0; j < uniqueQuestions.length; j++) {
      const targetSet = uniqueWordSets[j];
      
      // Calculate intersection size
      let intersectionSize = 0;
      currentSet.forEach(word => {
        if (targetSet.has(word)) {
          intersectionSize++;
        }
      });
      
      // Calculate union size
      const unionSize = currentSet.size + targetSet.size - intersectionSize;
      const jaccardSim = unionSize > 0 ? intersectionSize / unionSize : 0;
      
      if (jaccardSim > 0.6) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      uniqueQuestions.push(currentQ);
      uniqueWordSets.push(currentSet);
    }
  }

  return uniqueQuestions;
}

/**
 * Generates questions for a single chunk of notes using the Gemini API.
 */
async function generateQuizSingleCall(
  notes: string,
  count: number,
  type: "mcq" | "tf" | "mixed",
  difficulty: "easy" | "medium" | "hard" | "mixed"
): Promise<QuizQuestion[]> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
  }

  const typeInstruction = 
    type === "mcq" ? "multiple-choice questions only (exactly 4 options)" :
    type === "tf" ? "true/false questions only (exactly 2 options: True and False)" :
    "a mix of multiple-choice questions (4 options) and true/false questions (2 options)";

  // Enhanced prompt containing QUESTION DESIGN RULES, DIFFICULTY DEFINITIONS, topic instruction, and self-checks.
  // Includes [FIX 1] for phrasings of True/False statements.
  const prompt = `Create exactly ${count} medical exam questions based on the study material below.
Difficulty Level: ${difficulty}.
Question Type: ${typeInstruction}.

--- QUESTION DESIGN RULES ---
1. STRICT SOURCE-GROUNDING: Base questions strictly on the provided study material. Do not introduce outside medical facts, external assumptions, or concepts not present in the material.
2. COGNITIVE TYPE VARIATION: Do not make all questions clinical vignettes. Vary the cognitive type across the question set:
   - Recall/definition (testing direct knowledge of terms or facts)
   - Mechanism/pathophysiology (testing understanding of how a disease or system works)
   - Classification/comparison (distinguishing between classes, types, or related categories)
   - Clinical-vignette application (clinical scenarios where concepts are applied to diagnose/treat)
   - "Which of the following is NOT/FALSE" style (identifying incorrect statements based on the text)
3. MCQ DISTRACTORS: Ensure all distractors (incorrect choices) are plausible, same-category as the correct answer, and challenge the student. Never use "all of the above", "none of the above", or simple joke/implausible options.
4. TRUE/FALSE VARIATION: For True/False questions:
   - [FIX 1] The "question" field MUST be phrased as a single declarative statement (e.g. "Allopurinol is first-line therapy for acute gout flares"), NOT as a question (e.g. NOT "What is first-line therapy for acute gout?"). The True/False answer should reflect whether that declarative statement is accurate or inaccurate per the study material.
   - [FIX 1] The options must be exactly ["True", "False"]. The correctIndex must reflect whether that declarative statement is accurate or inaccurate.
   - Do not trivially negate a sentence (e.g., adding "not"). Instead, alter one key variable such as a number, direction (increase/decrease), causal link, or sequence to make it false.
5. OPTION CONSISTENCY: Keep option lengths, grammar, and tone consistent across all choices for a question so that option length or style is not a clue.
6. NO DUPLICATION: Do not test the exact same fact or concept multiple times across the question set.

--- DIFFICULTY DEFINITIONS ---
- Easy: Direct recall of a single fact or definition from the text.
- Medium: Connecting two related facts or tracing a simple cause-and-effect relationship.
- Hard: Applying the material to a novel scenario, or distinguishing between closely related concepts/diagnoses.
${difficulty === "mixed" ? 'For this request, target a "mixed" difficulty with roughly a 30% easy, 40% medium, and 30% hard distribution.' : `For this request, target the "${difficulty}" difficulty level exclusively.`}

--- DISTRIBUTION & PLANNING ---
Before generating the questions, mentally identify the distinct subtopics present in the study material and distribute the questions evenly across those subtopics rather than clustering them on a single section.

--- SELF-CHECK REQUIREMENT ---
Before finalizing your output, double-check every question to verify that:
1. The "correctIndex" matches the correct option exactly as supported by the study material.
2. No distractor could also be argued as correct based on the provided material.

--- OUTPUT FORMAT ---
Output ONLY a JSON object containing a "questions" array. Each question must have:
1. "question": The question text or clinical vignette.
2. "options": An array of string options.
3. "correctIndex": The 0-based index of the correct option in the options array.
4. "explanation": A brief 1-2 sentence explanation of why the answer is correct and others are incorrect.
5. "topic": A short string tagging the subtopic (e.g. "Gout — pathophysiology") for analytics.

Example format:
{
  "questions": [
    {
      "question": "A 45-year-old male presents with sudden-onset severe joint pain in his first metatarsophalangeal joint. Negatively birefringent needle-shaped crystals are seen under polarized light. What is the first-line acute treatment?",
      "options": [
        "Allopurinol",
        "Indomethacin (NSAIDs) or Colchicine",
        "Probenecid",
        "Febuxostat"
      ],
      "correctIndex": 1,
      "explanation": "Acute gout flares are managed with anti-inflammatory agents like NSAIDs or colchicine. Allopurinol is a xanthine oxidase inhibitor used for chronic management, not acute flares.",
      "topic": "Gout — acute management"
    }
  ]
}

Study Material:
${notes}`;

  // 1. Send request to Gemini API
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!responseText) {
    throw new Error("No content returned from Gemini");
  }

  // 2. Parse the JSON structured questions response
  try {
    const parsedData = JSON.parse(responseText);
    return parsedData.questions || [];
  } catch (err: any) {
    console.error("Failed to parse quiz questions JSON", responseText, err);
    // Include a snippet of the malformed response in the error message for easier debugging
    const snippet = responseText.length > 200 ? `${responseText.slice(0, 200)}...` : responseText;
    throw new Error(`Failed to parse output format. Error: ${err.message}. Response snippet: "${snippet}". Try again.`);
  }
}

/**
 * Main quiz generation entry point. Upgraded to handle:
 * 1. Rich prompt engineering (rigorous medical design rules) with [FIX 1] statement format.
 * 2. Automated paragraph-based chunking for long documents (>6000 chars).
 * 3. [FIX 3] Deduplication using word tokenization and Jaccard similarity.
 * 4. Strict structural validation and option shuffling.
 * 5. [FIX 2] One-time retry/backfill fallback to meet question count targets.
 * 6. Verbose error handling.
 */
export async function generateQuiz(
  notes: string,
  count: number,
  type: "mcq" | "tf" | "mixed",
  difficulty: "easy" | "medium" | "hard" | "mixed"
): Promise<QuizQuestion[]> {
  const CHUNK_THRESHOLD = 6000;
  let rawQuestions: any[] = [];

  // Determine whether notes length exceeds the threshold for chunking
  if (notes.length > CHUNK_THRESHOLD) {
    const chunks = chunkNotes(notes, CHUNK_THRESHOLD);
    
    // Find the largest chunk index to allocate remainder questions to
    let largestChunkIdx = 0;
    let maxLen = 0;
    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i].length > maxLen) {
        maxLen = chunks[i].length;
        largestChunkIdx = i;
      }
    }

    // Distribute question counts proportionally (evenly, remainder to largest chunk)
    const baseCount = Math.floor(count / chunks.length);
    const remainder = count % chunks.length;
    const chunkCounts = chunks.map((_, idx) => baseCount + (idx === largestChunkIdx ? remainder : 0));

    // Call Gemini API concurrently for all chunks
    const chunkPromises = chunks.map(async (chunk, idx) => {
      const chunkCount = chunkCounts[idx];
      if (chunkCount <= 0) return [];
      return generateQuizSingleCall(chunk, chunkCount, type, difficulty);
    });

    const chunkResults = await Promise.all(chunkPromises);
    rawQuestions = chunkResults.flat();
  } else {
    // Generate all questions in a single call
    rawQuestions = await generateQuizSingleCall(notes, count, type, difficulty);
  }

  // [FIX 3] CROSS-CHUNK DEDUPLICATION (happens first on merged rawQuestions)
  rawQuestions = deduplicateQuestions(rawQuestions);

  // Post-processing: Filter valid questions and shuffle their options
  let finalQuestions = rawQuestions
    .filter(q => isValidQuestion(q, type))
    .map(q => shuffleQuestionOptions(q));

  // [FIX 2] RETRY/BACKFILL FOR SHORTFALL (using full original notes un-chunked)
  if (finalQuestions.length < count) {
    const shortfall = count - finalQuestions.length;
    try {
      const retryQuestions = await generateQuizSingleCall(notes, shortfall, type, difficulty);
      const validRetryQuestions = retryQuestions
        .filter(q => isValidQuestion(q, type))
        .map(q => shuffleQuestionOptions(q));
      
      finalQuestions = finalQuestions.concat(validRetryQuestions);
    } catch (retryErr) {
      console.error("Retry/backfill question generation failed:", retryErr);
    }
  }

  // Truncate to at most `count` total questions in case retry returned more than needed
  if (finalQuestions.length > count) {
    finalQuestions = finalQuestions.slice(0, count);
  }

  // [FIX 2] Log warning if we generated fewer valid questions than requested, after the retry backfill attempt
  if (finalQuestions.length < count) {
    console.warn(`Generated only ${finalQuestions.length} valid questions, but ${count} were requested after retry backfill.`);
  }

  return finalQuestions;
}
