import { NextResponse } from "next/server";
import OpenAI from "openai";

type TargetProfile = "simple" | "general" | "knowledgeable";

type PsychScores = {
  aoa: {
    meanAoA: number;
    lateAoARatio: number;
  };
  concreteness: {
    meanConcreteness: number;
    abstractRatio: number;
  };
};

const QWEN_MODEL = "qwen-plus";
const DASHSCOPE_COMPAT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

const BENCHMARKS: Record<
  TargetProfile,
  {
    aoaMean: { min: number; max: number };
    lateAoARatio: { min: number; max: number };
    meanConcreteness: { min: number; max: number };
    abstractRatio: { min: number; max: number };
  }
> = {
  simple: {
    aoaMean: { min: 1.0, max: 3.0 },
    lateAoARatio: { min: 0.0, max: 0.15 },
    meanConcreteness: { min: 3.5, max: 5.0 },
    abstractRatio: { min: 0.0, max: 0.15 },
  },
  general: {
    aoaMean: { min: 3.0, max: 4.5 },
    lateAoARatio: { min: 0.15, max: 0.35 },
    meanConcreteness: { min: 2.7, max: 3.5 },
    abstractRatio: { min: 0.15, max: 0.35 },
  },
  knowledgeable: {
    aoaMean: { min: 4.5, max: 7.0 },
    lateAoARatio: { min: 0.35, max: 1.0 },
    meanConcreteness: { min: 1.0, max: 2.7 },
    abstractRatio: { min: 0.35, max: 1.0 },
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getRangeDirection(value: number, min: number, max: number) {
  if (value < min) return "below";
  if (value > max) return "above";
  return "within";
}

function normalizeTargetProfile(raw: unknown): TargetProfile {
  if (raw === "simple" || raw === "general" || raw === "knowledgeable") return raw;
  return "general";
}

function buildBenchmarkEvaluation(scores: PsychScores, target: TargetProfile) {
  const targetBench = BENCHMARKS[target];

  const aoaMeanStatus = getRangeDirection(
    scores.aoa.meanAoA,
    targetBench.aoaMean.min,
    targetBench.aoaMean.max
  );
  const aoaLateStatus = getRangeDirection(
    scores.aoa.lateAoARatio,
    targetBench.lateAoARatio.min,
    targetBench.lateAoARatio.max
  );
  const concMeanStatus = getRangeDirection(
    scores.concreteness.meanConcreteness,
    targetBench.meanConcreteness.min,
    targetBench.meanConcreteness.max
  );
  const concAbsStatus = getRangeDirection(
    scores.concreteness.abstractRatio,
    targetBench.abstractRatio.min,
    targetBench.abstractRatio.max
  );

  const actions: string[] = [];

  if (aoaMeanStatus === "above" || aoaLateStatus === "above") {
    actions.push(
      "Lower lexical acquisition burden: replace late-acquired words with earlier-acquired synonyms and reduce dense technical terms."
    );
  } else if (aoaMeanStatus === "below" && target === "knowledgeable") {
    actions.push(
      "Increase lexical sophistication: selectively introduce domain-appropriate late-acquired words."
    );
  }

  if (concMeanStatus === "below" || concAbsStatus === "above") {
    actions.push(
      "Increase concreteness: add tangible examples, sensory language, and specific entities before abstract claims."
    );
  } else if (concMeanStatus === "above" && target === "knowledgeable") {
    actions.push(
      "Increase abstraction level: consolidate concrete phrasing into higher-level conceptual wording where appropriate."
    );
  }

  if (!actions.length) {
    actions.push("Current psycholinguistic profile is aligned with the target level. Focus on local clarity and coherence.");
  }

  return {
    targetProfile: target,
    targetRanges: targetBench,
    metricStatus: {
      aoaMean: aoaMeanStatus,
      lateAoARatio: aoaLateStatus,
      meanConcreteness: concMeanStatus,
      abstractRatio: concAbsStatus,
    },
    revisionDirections: actions,
    aoaMeanStatus,
    aoaLateStatus,
    concMeanStatus,
    concAbsStatus,
  };
}

function buildSuggestionPrompt(
  text: string,
  scores: PsychScores,
  target: TargetProfile,
  evaluation: ReturnType<typeof buildBenchmarkEvaluation>
) {
  const bench = BENCHMARKS[target];

  return `You are an expert writing coach for psycholinguistic revision.

You will receive an essay and precomputed psycholinguistic scores.
Your task is to provide concrete revision advice so the essay better matches the target profile: ${target}.

Current metrics:
- meanAoA (1-7): ${scores.aoa.meanAoA.toFixed(3)}
- lateAoARatio (AoA >= 5): ${scores.aoa.lateAoARatio.toFixed(3)}
- meanConcreteness (1-5): ${scores.concreteness.meanConcreteness.toFixed(3)}
- abstractRatio (Concreteness <= 2): ${scores.concreteness.abstractRatio.toFixed(3)}

Target benchmark for ${target}:
- meanAoA: ${bench.aoaMean.min} to ${bench.aoaMean.max}
- lateAoARatio: ${bench.lateAoARatio.min} to ${bench.lateAoARatio.max}
- meanConcreteness: ${bench.meanConcreteness.min} to ${bench.meanConcreteness.max}
- abstractRatio: ${bench.abstractRatio.min} to ${bench.abstractRatio.max}

Metric status vs target:
- meanAoA: ${evaluation.metricStatus.aoaMean}
- lateAoARatio: ${evaluation.metricStatus.lateAoARatio}
- meanConcreteness: ${evaluation.metricStatus.meanConcreteness}
- abstractRatio: ${evaluation.metricStatus.abstractRatio}

Priority revision directions:
${evaluation.revisionDirections.map((a, i) => `${i + 1}. ${a}`).join("\n")}

Output valid JSON only in this schema:
{
  "summary": "short diagnosis in 1-2 sentences",
  "priority_actions": [
    {
      "focus": "AoA or Concreteness",
      "reason": "why this matters for current metrics",
      "instruction": "what to revise"
    }
  ],
  "word_replacements": [
    {
      "original": "word from essay",
      "replacement": "alternative",
      "expected_effect": "lower AoA / higher concreteness / both"
    }
  ],
  "sentence_revisions": [
    {
      "original": "exact sentence excerpt",
      "revised": "suggested rewrite",
      "expected_effect": "metric movement"
    }
  ]
}

Essay:
"""
${text}
"""`;
}

async function generateQwenSuggestion(prompt: string, apiKey: string) {
  const openai = new OpenAI({
    apiKey,
    baseURL: DASHSCOPE_COMPAT_BASE_URL,
  });

  const completion = await openai.chat.completions.create({
    model: QWEN_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You are a strict JSON generator. Do not output markdown. Return only valid JSON following the requested schema.",
      },
      { role: "user", content: prompt },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    return {
      raw: content,
      note: "Model returned non-JSON content; raw output preserved.",
    };
  }
}

export async function POST(request: Request) {
  try {
    const { text, scores, targetProfile } = await request.json();

    if (typeof text !== "string" || text.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Invalid or empty text provided." },
        { status: 400 }
      );
    }

    const isValidScores =
      scores &&
      typeof scores?.aoa?.meanAoA === "number" &&
      typeof scores?.aoa?.lateAoARatio === "number" &&
      typeof scores?.concreteness?.meanConcreteness === "number" &&
      typeof scores?.concreteness?.abstractRatio === "number";

    if (!isValidScores) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid scores payload. Please pass scores from /api/psycholinguistic (aoa + concreteness metrics).",
        },
        { status: 400 }
      );
    }

    const normalizedScores: PsychScores = {
      aoa: {
        meanAoA: clamp(scores.aoa.meanAoA, 1, 7),
        lateAoARatio: clamp(scores.aoa.lateAoARatio, 0, 1),
      },
      concreteness: {
        meanConcreteness: clamp(scores.concreteness.meanConcreteness, 1, 5),
        abstractRatio: clamp(scores.concreteness.abstractRatio, 0, 1),
      },
    };

    const target = normalizeTargetProfile(targetProfile);
    const evaluation = buildBenchmarkEvaluation(normalizedScores, target);
    const prompt = buildSuggestionPrompt(text, normalizedScores, target, evaluation);

    const dashscopeKey = process.env.DASHSCOPE_API_KEY?.trim();
    if (!dashscopeKey) {
      return NextResponse.json(
        {
          success: false,
          error: "DASHSCOPE_API_KEY is missing. This endpoint is configured to call Qwen.",
        },
        { status: 500 }
      );
    }

    const suggestion = await generateQwenSuggestion(prompt, dashscopeKey);

    console.log("[psycholinguistic_suggestion] benchmark + suggestion generated", {
      targetProfile: target,
      model: QWEN_MODEL,
      baseURL: DASHSCOPE_COMPAT_BASE_URL,
      evaluation,
    });

    return NextResponse.json({
      success: true,
      benchmarkEvaluation: {
        targetProfile: evaluation.targetProfile,
        targetRanges: evaluation.targetRanges,
        metricStatus: evaluation.metricStatus,
        revisionDirections: evaluation.revisionDirections,
      },
      promptUsed: prompt,
      suggestion,
    });
  } catch (error) {
    console.error("Psycholinguistic suggestion API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate psycholinguistic suggestion.",
      },
      { status: 500 }
    );
  }
}
