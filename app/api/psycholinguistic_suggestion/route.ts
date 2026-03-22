import { NextResponse } from "next/server";
import OpenAI from "openai";

type TargetProfile = "simple" | "general" | "knowledgeable";
type MetricName = "aoa" | "concreteness";

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

type MetricDirection = "below" | "within" | "above";

type MetricSuggestionItem = {
  original: string;
  replacement: string;
  expected_effect: string;
};

const QWEN_MODEL = "qwen-plus";
const DASHSCOPE_COMPAT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const MIN_SUGGESTIONS = 1;
const MAX_SUGGESTIONS = 5;

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

function getRangeDirection(value: number, min: number, max: number): MetricDirection {
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
    targetBench.aoaMean.max,
  );
  const aoaLateStatus = getRangeDirection(
    scores.aoa.lateAoARatio,
    targetBench.lateAoARatio.min,
    targetBench.lateAoARatio.max,
  );
  const concMeanStatus = getRangeDirection(
    scores.concreteness.meanConcreteness,
    targetBench.meanConcreteness.min,
    targetBench.meanConcreteness.max,
  );
  const concAbsStatus = getRangeDirection(
    scores.concreteness.abstractRatio,
    targetBench.abstractRatio.min,
    targetBench.abstractRatio.max,
  );

  return {
    targetProfile: target,
    targetRanges: targetBench,
    metricStatus: {
      aoaMean: aoaMeanStatus,
      lateAoARatio: aoaLateStatus,
      meanConcreteness: concMeanStatus,
      abstractRatio: concAbsStatus,
    },
    offBenchmark: {
      aoa: aoaMeanStatus !== "within" || aoaLateStatus !== "within",
      concreteness: concMeanStatus !== "within" || concAbsStatus !== "within",
    },
  };
}

function buildMetricPrompt(
  metric: MetricName,
  text: string,
  scores: PsychScores,
  target: TargetProfile,
  evaluation: ReturnType<typeof buildBenchmarkEvaluation>,
): string {
  const metricStatus =
    metric === "aoa"
      ? {
          primary: evaluation.metricStatus.aoaMean,
          secondary: evaluation.metricStatus.lateAoARatio,
          primaryName: "meanAoA",
          secondaryName: "lateAoARatio",
          currentPrimary: scores.aoa.meanAoA.toFixed(3),
          currentSecondary: scores.aoa.lateAoARatio.toFixed(3),
          benchmarkPrimary: `${evaluation.targetRanges.aoaMean.min} to ${evaluation.targetRanges.aoaMean.max}`,
          benchmarkSecondary: `${evaluation.targetRanges.lateAoARatio.min} to ${evaluation.targetRanges.lateAoARatio.max}`,
          focusInstruction:
            "Focus on lexical acquisition difficulty. Replace late-acquired words with earlier-acquired terms, or vice versa if target needs higher sophistication.",
        }
      : {
          primary: evaluation.metricStatus.meanConcreteness,
          secondary: evaluation.metricStatus.abstractRatio,
          primaryName: "meanConcreteness",
          secondaryName: "abstractRatio",
          currentPrimary: scores.concreteness.meanConcreteness.toFixed(3),
          currentSecondary: scores.concreteness.abstractRatio.toFixed(3),
          benchmarkPrimary: `${evaluation.targetRanges.meanConcreteness.min} to ${evaluation.targetRanges.meanConcreteness.max}`,
          benchmarkSecondary: `${evaluation.targetRanges.abstractRatio.min} to ${evaluation.targetRanges.abstractRatio.max}`,
          focusInstruction:
            "Focus on concreteness level. Replace abstract wording with concrete wording, or concrete wording with higher abstraction depending on benchmark direction.",
        };

  return `You are an expert writing coach for psycholinguistic revision.

Target profile: ${target}
Metric flow: ${metric.toUpperCase()}

Current status for this metric:
- ${metricStatus.primaryName}: ${metricStatus.currentPrimary} (${metricStatus.primary})
- ${metricStatus.secondaryName}: ${metricStatus.currentSecondary} (${metricStatus.secondary})

Benchmark range:
- ${metricStatus.primaryName}: ${metricStatus.benchmarkPrimary}
- ${metricStatus.secondaryName}: ${metricStatus.benchmarkSecondary}

Task:
${metricStatus.focusInstruction}
Generate WORD or SHORT-PHRASE replacements only.

Hard constraints:
1) This metric is an independent flow. Do not generate other metrics.
2) If this metric is off benchmark, return ${MIN_SUGGESTIONS}-${MAX_SUGGESTIONS} suggestions.
3) Each suggestion must be a lexical replacement pair from the essay.
4) expected_effect must explicitly mention ${metricStatus.primaryName} and/or ${metricStatus.secondaryName}.
5) Return valid JSON only (no markdown).

Output schema:
{
  "metric": "${metric}",
  "word_replacements": [
    {
      "original": "word or short phrase from essay",
      "replacement": "replacement word or short phrase",
      "expected_effect": "how this changes ${metricStatus.primaryName}/${metricStatus.secondaryName}"
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
      word_replacements: [],
    };
  }
}

function normalizeWordReplacements(input: unknown): MetricSuggestionItem[] {
  if (!Array.isArray(input)) return [];
  const normalized: MetricSuggestionItem[] = [];
  for (const item of input) {
    const original =
      typeof (item as any)?.original === "string" ? (item as any).original.trim() : "";
    const replacement =
      typeof (item as any)?.replacement === "string"
        ? (item as any).replacement.trim()
        : "";
    const expected_effect =
      typeof (item as any)?.expected_effect === "string"
        ? (item as any).expected_effect.trim()
        : "";
    if (!original || !replacement) continue;
    normalized.push({ original, replacement, expected_effect });
  }
  return normalized;
}

function tokenizeCandidates(text: string): string[] {
  const raw = (text.toLowerCase().match(/[a-z']+/g) || []).filter((word) => word.length >= 4);
  return Array.from(new Set(raw));
}

function fallbackReplacement(metric: MetricName, text: string): MetricSuggestionItem {
  const candidates = tokenizeCandidates(text);
  const abstractHintWords = [
    "thing",
    "aspect",
    "factor",
    "issue",
    "concept",
    "process",
    "system",
    "society",
    "knowledge",
  ];

  if (metric === "aoa") {
    const original = candidates.sort((a, b) => b.length - a.length)[0] || "terminology";
    return {
      original,
      replacement: "simpler term",
      expected_effect: "lower meanAoA and lower lateAoARatio",
    };
  }

  const preferred =
    abstractHintWords.find((word) => candidates.includes(word)) ||
    candidates.sort((a, b) => b.length - a.length)[0] ||
    "concept";
  return {
    original: preferred,
    replacement: "more concrete phrase",
    expected_effect: "raise meanConcreteness and lower abstractRatio",
  };
}

export async function POST(request: Request) {
  try {
    const { text, scores, targetProfile } = await request.json();

    if (typeof text !== "string" || text.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Invalid or empty text provided." },
        { status: 400 },
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
        { status: 400 },
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

    const dashscopeKey = process.env.DASHSCOPE_API_KEY?.trim();
    if (!dashscopeKey) {
      return NextResponse.json(
        {
          success: false,
          error: "DASHSCOPE_API_KEY is missing. This endpoint is configured to call Qwen.",
        },
        { status: 500 },
      );
    }

    const activeMetrics: MetricName[] = [];
    if (evaluation.offBenchmark.aoa) activeMetrics.push("aoa");
    if (evaluation.offBenchmark.concreteness) activeMetrics.push("concreteness");

    const promptByMetric: Partial<Record<MetricName, string>> = {};
    const rawResultByMetric: Partial<Record<MetricName, any>> = {};

    await Promise.all(
      activeMetrics.map(async (metric) => {
        const prompt = buildMetricPrompt(metric, text, normalizedScores, target, evaluation);
        promptByMetric[metric] = prompt;
        rawResultByMetric[metric] = await generateQwenSuggestion(prompt, dashscopeKey);
      }),
    );

    const aoaSuggestions = evaluation.offBenchmark.aoa
      ? normalizeWordReplacements(rawResultByMetric.aoa?.word_replacements).slice(0, MAX_SUGGESTIONS)
      : [];
    const concSuggestions = evaluation.offBenchmark.concreteness
      ? normalizeWordReplacements(rawResultByMetric.concreteness?.word_replacements).slice(
          0,
          MAX_SUGGESTIONS,
        )
      : [];

    if (evaluation.offBenchmark.aoa && aoaSuggestions.length < MIN_SUGGESTIONS) {
      aoaSuggestions.push(fallbackReplacement("aoa", text));
    }
    if (evaluation.offBenchmark.concreteness && concSuggestions.length < MIN_SUGGESTIONS) {
      concSuggestions.push(fallbackReplacement("concreteness", text));
    }

    const summaryParts: string[] = [];
    if (evaluation.offBenchmark.aoa) summaryParts.push("AoA is off benchmark.");
    if (evaluation.offBenchmark.concreteness) summaryParts.push("Concreteness is off benchmark.");
    if (!summaryParts.length) summaryParts.push("All psycholinguistic metrics are within benchmark.");

    const suggestion = {
      summary: summaryParts.join(" "),
      byMetric: {
        aoa: {
          enabled: evaluation.offBenchmark.aoa,
          word_replacements: aoaSuggestions,
        },
        concreteness: {
          enabled: evaluation.offBenchmark.concreteness,
          word_replacements: concSuggestions,
        },
      },
    };

    console.log("[psycholinguistic_suggestion] independent metric flows generated", {
      targetProfile: target,
      model: QWEN_MODEL,
      evaluation,
      counts: {
        aoa: aoaSuggestions.length,
        concreteness: concSuggestions.length,
      },
    });

    return NextResponse.json({
      success: true,
      benchmarkEvaluation: {
        targetProfile: evaluation.targetProfile,
        targetRanges: evaluation.targetRanges,
        metricStatus: evaluation.metricStatus,
        offBenchmark: evaluation.offBenchmark,
      },
      promptByMetric,
      suggestion,
    });
  } catch (error) {
    console.error("Psycholinguistic suggestion API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate psycholinguistic suggestion.",
      },
      { status: 500 },
    );
  }
}
