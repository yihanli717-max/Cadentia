import { NextResponse } from "next/server";
import OpenAI from "openai";
import { removeStopwords } from "stopword";

const AOA_LATE_THRESHOLD = 5;
const CONCRETENESS_ABSTRACT_THRESHOLD = 2;
const GPT_COVERAGE_THRESHOLD = 0.6;
const GPT_BATCH_SIZE = 30;
const DEFAULT_GPT_MODEL = "gpt-4o-mini";
const DEFAULT_QWEN_MODEL = "qwen-plus";
const DASHSCOPE_COMPAT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

const AOA_BASELINE_MEAN = 4.0;
const AOA_BASELINE_STD = 0.9;
const AOA_LATE_RATIO_BASELINE_MEAN = 0.25;
const AOA_LATE_RATIO_BASELINE_STD = 0.2;

const CONC_BASELINE_MEAN = 3.1;
const CONC_BASELINE_STD = 0.8;
const ABSTRACT_RATIO_BASELINE_MEAN = 0.25;
const ABSTRACT_RATIO_BASELINE_STD = 0.2;

const AOA_LEXICON: Record<string, number> = {
  child: 1.4,
  family: 1.7,
  friend: 1.8,
  school: 1.9,
  teacher: 2.2,
  city: 2.0,
  country: 2.4,
  culture: 3.6,
  society: 3.9,
  language: 3.1,
  learn: 1.8,
  study: 2.8,
  improve: 3.2,
  explain: 2.8,
  analysis: 4.6,
  argument: 4.3,
  evidence: 4.1,
  perspective: 4.9,
  policy: 4.7,
  institution: 5.2,
  motivation: 5.0,
  identity: 4.8,
  awareness: 5.1,
  concept: 4.6,
  theory: 4.7,
  abstract: 5.2,
  concrete: 4.4,
  significance: 5.4,
  interpretation: 5.5,
  paradigm: 6.1,
  epistemology: 6.9,
};

const CONCRETENESS_LEXICON: Record<string, number> = {
  apple: 4.9,
  bread: 4.8,
  water: 4.9,
  house: 4.8,
  table: 4.9,
  dog: 4.9,
  cat: 4.9,
  mother: 4.4,
  student: 3.9,
  school: 4.1,
  city: 4.2,
  computer: 4.3,
  paper: 4.6,
  music: 3.6,
  culture: 2.9,
  language: 3.0,
  freedom: 1.9,
  justice: 1.8,
  value: 2.2,
  knowledge: 2.1,
  idea: 2.2,
  concept: 1.9,
  theory: 2.0,
  identity: 2.1,
  awareness: 1.8,
  significance: 1.8,
  interpretation: 1.8,
  paradigm: 1.7,
  epistemology: 1.4,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function safeZ(value: number, mean: number, std: number): number {
  if (std === 0) return 0;
  return (value - mean) / std;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) return 0;

  const vowels = "aeiouy";
  let syllables = 0;
  let prevIsVowel = false;

  for (const ch of cleaned) {
    const isVowel = vowels.includes(ch);
    if (isVowel && !prevIsVowel) syllables++;
    prevIsVowel = isVowel;
  }

  if (cleaned.endsWith("e") && syllables > 1) syllables--;
  return Math.max(1, syllables);
}

function extractContentWords(text: string): string[] {
  const rawWords = text.toLowerCase().match(/[a-z']+/g) || [];
  const normalized = rawWords
    .map((word) => word.replace(/^'+|'+$/g, ""))
    .filter((word) => /^[a-z]+$/.test(word));

  return removeStopwords(normalized);
}

function toLemma(word: string): string {
  const w = word.toLowerCase();

  if (w.endsWith("ies") && w.length > 4) return `${w.slice(0, -3)}y`;
  if (w.endsWith("ing") && w.length > 5) {
    const stem = w.slice(0, -3);
    if (stem.endsWith(stem.slice(-1))) return stem.slice(0, -1);
    return stem;
  }
  if (w.endsWith("ed") && w.length > 4) {
    const stem = w.slice(0, -2);
    if (stem.endsWith("i")) return `${stem.slice(0, -1)}y`;
    return stem;
  }
  if (w.endsWith("es") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("s") && w.length > 3) return w.slice(0, -1);

  return w;
}

function lexiconLookup(word: string, lexicon: Record<string, number>): number | undefined {
  return lexicon[word] ?? lexicon[toLemma(word)];
}

function estimateAoA(word: string): number {
  const length = word.length;
  const syllables = countSyllables(word);
  let score = 1.6 + length * 0.2 + syllables * 0.55;

  if (/(tion|sion|ment|ology|ism|ity|ence|ance)$/.test(word)) score += 0.8;
  if (/(ize|ise|ate|ous|ive)$/.test(word)) score += 0.4;
  if (length <= 4) score -= 0.5;

  return clamp(score, 1, 7);
}

function estimateConcreteness(word: string): number {
  const length = word.length;
  let score = 3.6 - length * 0.09;

  if (/(tion|sion|ment|ness|ity|ism|ence|ance|ship)$/.test(word)) score -= 0.8;
  if (/(logy|ology|ics|ality)$/.test(word)) score -= 0.6;
  if (/(house|room|food|water|hand|face|tree|road|book|dog|cat)$/.test(word)) score += 0.8;
  if (length <= 4) score += 0.5;

  return clamp(score, 1, 5);
}

type WordRating = { aoa: number; concreteness: number };

async function fetchGptRatingsForWords(
  words: string[],
  apiKey: string,
  model: string,
  baseURL?: string
): Promise<Record<string, WordRating>> {
  const openai = new OpenAI({ apiKey, baseURL });
  const ratingsMap: Record<string, WordRating> = {};
  const isQwenCompatible = (baseURL ?? "").includes("dashscope") || model.toLowerCase().startsWith("qwen");

  for (const batch of chunkArray(words, GPT_BATCH_SIZE)) {
    const systemPrompt = `You are a psycholinguistic rating assistant.

Your task is to rate English words on two dimensions:
1) Age of Acquisition (AoA), using a 1-7 scale:
1 = learned very early in childhood, very basic everyday word
7 = learned much later, advanced, specialized, or academic word
2) Concreteness, using a 1-5 scale:
1 = highly abstract, difficult to imagine directly
5 = highly concrete, easy to imagine or perceive directly

Guidelines:
- Rate each word based on its most common meaning in general academic reading/writing.
- Use whole-number ratings only.
- Be consistent across all words in the same input.
- Do not explain.
- Return valid JSON only in this exact shape:
{"ratings":[{"word":"example","aoa":4,"concreteness":3}]}`;

    const userPrompt = `Rate the following words for AoA and concreteness.

Words:
${batch.join("\n")}`;

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0,
      ...(isQwenCompatible ? {} : { response_format: { type: "json_object" as const } }),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { ratings?: Array<{ word?: string; aoa?: number; concreteness?: number }> } = {};

    try {
      parsed = JSON.parse(content);
    } catch (error) {
      console.error("[psycholinguistic] failed to parse GPT JSON content", { content, error });
      continue;
    }

    for (const item of parsed.ratings ?? []) {
      const rawWord = typeof item.word === "string" ? item.word.toLowerCase() : "";
      const aoa = typeof item.aoa === "number" ? Math.round(item.aoa) : NaN;
      const concreteness = typeof item.concreteness === "number" ? Math.round(item.concreteness) : NaN;

      if (!rawWord || Number.isNaN(aoa) || Number.isNaN(concreteness)) continue;

      ratingsMap[rawWord] = {
        aoa: clamp(aoa, 1, 7),
        concreteness: clamp(concreteness, 1, 5),
      };
    }
  }

  return ratingsMap;
}

async function computePsycholinguisticScores(
  text: string,
  apiKey?: string,
  model = DEFAULT_GPT_MODEL,
  baseURL?: string
) {
  const contentWords = extractContentWords(text);
  if (!contentWords.length) {
    return {
      tokenCount: 0,
      uniqueContentWordCount: 0,
      lexiconCoverage: { aoa: 0, concreteness: 0 },
      ratingSourceCoverage: {
        aoa: { lexicon: 0, gpt: 0, heuristic: 0 },
        concreteness: { lexicon: 0, gpt: 0, heuristic: 0 },
      },
      usedGptBackfill: false,
      aoa: { meanAoA: 0, lateAoARatio: 0, burden: 0 },
      concreteness: { meanConcreteness: 0, abstractRatio: 0, burden: 0 },
    };
  }

  const uniqueWords = Array.from(new Set(contentWords));

  let aoaLexiconHits = 0;
  let concLexiconHits = 0;
  const missingWords = new Set<string>();

  for (const word of uniqueWords) {
    const lexAoA = lexiconLookup(word, AOA_LEXICON);
    const lexConc = lexiconLookup(word, CONCRETENESS_LEXICON);

    if (lexAoA !== undefined) aoaLexiconHits++;
    if (lexConc !== undefined) concLexiconHits++;
    if (lexAoA === undefined || lexConc === undefined) missingWords.add(word);
  }

  const uniqueAoACoverage = aoaLexiconHits / uniqueWords.length;
  const uniqueConcCoverage = concLexiconHits / uniqueWords.length;

  const shouldUseGptBackfill =
    !!apiKey &&
    missingWords.size > 0 &&
    (uniqueAoACoverage < GPT_COVERAGE_THRESHOLD || uniqueConcCoverage < GPT_COVERAGE_THRESHOLD);

  let gptRatings: Record<string, WordRating> = {};
  if (shouldUseGptBackfill && apiKey) {
    try {
      gptRatings = await fetchGptRatingsForWords(Array.from(missingWords), apiKey, model, baseURL);
      if (!Object.keys(gptRatings).length) {
        console.warn("[psycholinguistic] GPT backfill returned no ratings");
      }
    } catch (error) {
      console.error("[psycholinguistic] GPT backfill failed, fallback to heuristic", error);
    }
  }

  let aoaSourceLexicon = 0;
  let aoaSourceGpt = 0;
  let aoaSourceHeuristic = 0;
  let concSourceLexicon = 0;
  let concSourceGpt = 0;
  let concSourceHeuristic = 0;

  let lateAoACount = 0;
  let abstractCount = 0;

  const aoaValues: number[] = [];
  const concretenessValues: number[] = [];

  for (const word of contentWords) {
    const lexAoA = lexiconLookup(word, AOA_LEXICON);
    const lexConc = lexiconLookup(word, CONCRETENESS_LEXICON);
    const gptAoA = gptRatings[word]?.aoa ?? gptRatings[toLemma(word)]?.aoa;
    const gptConc = gptRatings[word]?.concreteness ?? gptRatings[toLemma(word)]?.concreteness;

    let aoa = 0;
    let conc = 0;

    if (lexAoA !== undefined) {
      aoa = lexAoA;
      aoaSourceLexicon++;
    } else if (gptAoA !== undefined) {
      aoa = gptAoA;
      aoaSourceGpt++;
    } else {
      aoa = estimateAoA(word);
      aoaSourceHeuristic++;
    }

    if (lexConc !== undefined) {
      conc = lexConc;
      concSourceLexicon++;
    } else if (gptConc !== undefined) {
      conc = gptConc;
      concSourceGpt++;
    } else {
      conc = estimateConcreteness(word);
      concSourceHeuristic++;
    }

    if (aoa >= AOA_LATE_THRESHOLD) lateAoACount++;
    if (conc <= CONCRETENESS_ABSTRACT_THRESHOLD) abstractCount++;

    aoaValues.push(aoa);
    concretenessValues.push(conc);
  }

  const meanAoA = average(aoaValues);
  const lateAoARatio = lateAoACount / contentWords.length;
  const meanConcreteness = average(concretenessValues);
  const abstractRatio = abstractCount / contentWords.length;

  const aoaBurden =
    safeZ(meanAoA, AOA_BASELINE_MEAN, AOA_BASELINE_STD) +
    0.5 * safeZ(lateAoARatio, AOA_LATE_RATIO_BASELINE_MEAN, AOA_LATE_RATIO_BASELINE_STD);

  const abstractnessBurden =
    -safeZ(meanConcreteness, CONC_BASELINE_MEAN, CONC_BASELINE_STD) +
    0.5 * safeZ(abstractRatio, ABSTRACT_RATIO_BASELINE_MEAN, ABSTRACT_RATIO_BASELINE_STD);

  return {
    tokenCount: contentWords.length,
    uniqueContentWordCount: uniqueWords.length,
    lexiconCoverage: {
      aoa: uniqueAoACoverage,
      concreteness: uniqueConcCoverage,
    },
    ratingSourceCoverage: {
      aoa: {
        lexicon: aoaSourceLexicon / contentWords.length,
        gpt: aoaSourceGpt / contentWords.length,
        heuristic: aoaSourceHeuristic / contentWords.length,
      },
      concreteness: {
        lexicon: concSourceLexicon / contentWords.length,
        gpt: concSourceGpt / contentWords.length,
        heuristic: concSourceHeuristic / contentWords.length,
      },
    },
    usedGptBackfill: shouldUseGptBackfill,
    aoa: {
      meanAoA,
      lateAoARatio,
      burden: aoaBurden,
    },
    concreteness: {
      meanConcreteness,
      abstractRatio,
      burden: abstractnessBurden,
    },
  };
}

export async function POST(request: Request) {
  try {
    const { text, apiKey, model, baseURL } = await request.json();

    if (typeof text !== "string" || text.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or empty text provided.",
        },
        { status: 400 }
      );
    }

    const requestedModel = typeof model === "string" && model.trim() ? model.trim() : undefined;
    const requestedBaseURL = typeof baseURL === "string" && baseURL.trim() ? baseURL.trim() : undefined;
    const explicitApiKey = typeof apiKey === "string" && apiKey.trim().length > 0 ? apiKey.trim() : undefined;

    const openaiEnvKey = process.env.OPENAI_API_KEY?.trim();
    const dashscopeEnvKey = process.env.DASHSCOPE_API_KEY?.trim();
    const preferOpenAIFromEnv = !!openaiEnvKey;

    const effectiveApiKey = explicitApiKey ?? (preferOpenAIFromEnv ? openaiEnvKey : dashscopeEnvKey);
    const usingDashscope = !explicitApiKey && !preferOpenAIFromEnv && !!dashscopeEnvKey;
    const effectiveModel =
      requestedModel ?? (usingDashscope ? DEFAULT_QWEN_MODEL : DEFAULT_GPT_MODEL);
    const effectiveBaseURL =
      requestedBaseURL ??
      (explicitApiKey
        ? (effectiveModel.toLowerCase().startsWith("qwen") ? DASHSCOPE_COMPAT_BASE_URL : undefined)
        : (usingDashscope ? DASHSCOPE_COMPAT_BASE_URL : undefined));

    const scores = await computePsycholinguisticScores(
      text,
      effectiveApiKey,
      effectiveModel,
      effectiveBaseURL
    );

    console.log("[psycholinguistic] computed scores", {
      model: effectiveModel,
      baseURL: effectiveBaseURL ?? "(default OpenAI)",
      inputChars: text.length,
      tokenCount: scores.tokenCount,
      uniqueContentWordCount: scores.uniqueContentWordCount,
      usedGptBackfill: scores.usedGptBackfill,
      lexiconCoverage: scores.lexiconCoverage,
      ratingSourceCoverage: scores.ratingSourceCoverage,
      aoa: scores.aoa,
      concreteness: scores.concreteness,
    });

    return NextResponse.json({
      success: true,
      scores,
    });
  } catch (error) {
    console.error("Psycholinguistic API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to compute psycholinguistic scores.",
      },
      { status: 500 }
    );
  }
}
