import React, { useMemo } from "react";
import { cn, eventTracker } from "@/lib/utils";
import { FeedbackItem } from "@/lib/type";
import { useFeedbackStore, useSharedConfigStore } from "@/lib/store";

const READABILITY_SOURCE_ID = 100;
const PSYCH_SOURCE_ID = 101;
const DIRECTION_EPSILON = 0.05;

type AudienceLevel = "simple" | "general" | "knowledgeable";

const readabilityBenchmarks: Record<
  AudienceLevel,
  { ASL_BENCHMARK: number; ASW_BENCHMARK: number }
> = {
  simple: { ASL_BENCHMARK: 15, ASW_BENCHMARK: 1.3 },
  general: { ASL_BENCHMARK: 20, ASW_BENCHMARK: 1.5 },
  knowledgeable: { ASL_BENCHMARK: 25, ASW_BENCHMARK: 1.7 },
};

const psychBenchmarks: Record<
  AudienceLevel,
  {
    meanAoA: { min: number; max: number };
    lateAoARatio: { min: number; max: number };
    meanConcreteness: { min: number; max: number };
    abstractRatio: { min: number; max: number };
  }
> = {
  simple: {
    meanAoA: { min: 1.0, max: 3.0 },
    lateAoARatio: { min: 0.0, max: 0.15 },
    meanConcreteness: { min: 3.5, max: 5.0 },
    abstractRatio: { min: 0.0, max: 0.15 },
  },
  general: {
    meanAoA: { min: 3.0, max: 4.5 },
    lateAoARatio: { min: 0.15, max: 0.35 },
    meanConcreteness: { min: 2.7, max: 3.5 },
    abstractRatio: { min: 0.15, max: 0.35 },
  },
  knowledgeable: {
    meanAoA: { min: 4.5, max: 7.0 },
    lateAoARatio: { min: 0.35, max: 1.0 },
    meanConcreteness: { min: 1.0, max: 2.7 },
    abstractRatio: { min: 0.35, max: 1.0 },
  },
};

type MetricKey = "asl" | "asw" | "aoa" | "concreteness";

type MetricNode = {
  key: MetricKey;
  title: string;
  directionHint: string | null;
  children: FeedbackItem[];
};

type RootNode = {
  key: "readability" | "psycholinguistic";
  title: string;
  metrics: MetricNode[];
};

type RevisionTreeProps = {
  classes?: string;
};

const METRIC_CIRCLE_COLOR: Record<
  MetricKey,
  { bg: string; border: string; text: string }
> = {
  asl: { bg: "bg-sky-400", border: "border-sky-600", text: "text-white" },
  asw: { bg: "bg-cyan-400", border: "border-cyan-600", text: "text-white" },
  aoa: { bg: "bg-amber-400", border: "border-amber-600", text: "text-white" },
  concreteness: { bg: "bg-emerald-400", border: "border-emerald-600", text: "text-white" },
};

function classifyFeedbackMetric(feedback: FeedbackItem): MetricKey {
  const feedbackType = String(feedback.type || "").trim().toLowerCase();
  const content = String(feedback.content || "").toLowerCase();
  const revised = String(feedback.revisedContent || "").toLowerCase();
  const mergedText = `${feedbackType} ${content} ${revised}`;

  if (feedback.source === READABILITY_SOURCE_ID) {
    if (feedbackType === "asl") return "asl";
    if (feedbackType === "asw") return "asw";
    if (mergedText.includes("asw")) return "asw";
    if (mergedText.includes("asl")) return "asl";
    return "asl";
  }

  if (feedback.source === PSYCH_SOURCE_ID) {
    if (feedbackType === "aoa") return "aoa";
    if (feedbackType === "concreteness") return "concreteness";
    if (
      mergedText.includes("concrete") ||
      mergedText.includes("concreteness") ||
      mergedText.includes("abstract")
    ) {
      return "concreteness";
    }
    return "aoa";
  }

  return "asl";
}

function getDirectionHint(
  key: MetricKey,
  userLevel: AudienceLevel,
  readabilityMetrics: { asl: number | null; asw: number | null },
  psychMetrics: {
    meanAoA: number | null;
    lateAoARatio: number | null;
    meanConcreteness: number | null;
    abstractRatio: number | null;
  },
): string | null {
  if (key === "asl") {
    if (readabilityMetrics.asl === null) return null;
    const diff = readabilityMetrics.asl - readabilityBenchmarks[userLevel].ASL_BENCHMARK;
    if (Math.abs(diff) < DIRECTION_EPSILON) {
      return "ASL is on the benchmark.";
    }
    return diff > 0
      ? "need to lower ASL by splitting long sentences and removing extra clauses."
      : "need to raise ASL by combining short sentences and adding linking clauses.";
  }

  if (key === "asw") {
    if (readabilityMetrics.asw === null) return null;
    const diff = readabilityMetrics.asw - readabilityBenchmarks[userLevel].ASW_BENCHMARK;
    if (Math.abs(diff) < DIRECTION_EPSILON) {
      return "ASW is on the benchmark.";
    }
    return diff > 0
      ? "need to lower ASW by replacing multi-syllable words with simpler synonyms."
      : "need to raise ASW by using more precise, higher-level vocabulary.";
  }

  if (key === "aoa") {
    if (psychMetrics.meanAoA === null || psychMetrics.lateAoARatio === null) return null;
    const bench = psychBenchmarks[userLevel];
    const meanAbove = psychMetrics.meanAoA > bench.meanAoA.max + DIRECTION_EPSILON;
    const meanBelow = psychMetrics.meanAoA < bench.meanAoA.min - DIRECTION_EPSILON;
    const ratioAbove =
      psychMetrics.lateAoARatio > bench.lateAoARatio.max + DIRECTION_EPSILON;
    const ratioBelow =
      psychMetrics.lateAoARatio < bench.lateAoARatio.min - DIRECTION_EPSILON;

    if (!meanAbove && !meanBelow && !ratioAbove && !ratioBelow) {
      return "AoA is on the benchmark.";
    }
    if (meanAbove || ratioAbove) {
      return "need to lower AoA by replacing late-acquired words with earlier-acquired alternatives.";
    }
    if (meanBelow || ratioBelow) {
      return "need to raise AoA by adding more advanced, domain-appropriate terms.";
    }
    return "AoA metrics are mixed; balance lexical sophistication by revising outlier word choices.";
  }

  if (psychMetrics.meanConcreteness === null || psychMetrics.abstractRatio === null) {
    return null;
  }
  const bench = psychBenchmarks[userLevel];
  const concAbove =
    psychMetrics.meanConcreteness > bench.meanConcreteness.max + DIRECTION_EPSILON;
  const concBelow =
    psychMetrics.meanConcreteness < bench.meanConcreteness.min - DIRECTION_EPSILON;
  const absAbove =
    psychMetrics.abstractRatio > bench.abstractRatio.max + DIRECTION_EPSILON;
  const absBelow =
    psychMetrics.abstractRatio < bench.abstractRatio.min - DIRECTION_EPSILON;

  if (!concAbove && !concBelow && !absAbove && !absBelow) {
    return "Concreteness is on the benchmark.";
  }
  if (concAbove || absBelow) {
    return "need to lower Concreteness by abstracting concrete examples into concepts.";
  }
  if (concBelow || absAbove) {
    return "need to raise Concreteness by adding specific examples and tangible wording.";
  }
  return "Concreteness metrics are mixed; rebalance abstract and concrete wording at the phrase level.";
}

function buildTree(
  feedbackItems: FeedbackItem[],
  userLevel: AudienceLevel,
  readabilityMetrics: { asl: number | null; asw: number | null },
  psychMetrics: {
    meanAoA: number | null;
    lateAoARatio: number | null;
    meanConcreteness: number | null;
    abstractRatio: number | null;
  },
): RootNode[] {
  const readability: RootNode = {
    key: "readability",
    title: "Readability",
    metrics: [
      {
        key: "asl",
        title: "ASL",
        directionHint: getDirectionHint("asl", userLevel, readabilityMetrics, psychMetrics),
        children: [],
      },
      {
        key: "asw",
        title: "ASW",
        directionHint: getDirectionHint("asw", userLevel, readabilityMetrics, psychMetrics),
        children: [],
      },
    ],
  };
  const psycholinguistic: RootNode = {
    key: "psycholinguistic",
    title: "Psycholinguistic",
    metrics: [
      {
        key: "aoa",
        title: "AoA",
        directionHint: getDirectionHint("aoa", userLevel, readabilityMetrics, psychMetrics),
        children: [],
      },
      {
        key: "concreteness",
        title: "Concreteness",
        directionHint: getDirectionHint("concreteness", userLevel, readabilityMetrics, psychMetrics),
        children: [],
      },
    ],
  };

  feedbackItems.forEach((feedback) => {
    const metric = classifyFeedbackMetric(feedback);
    if (feedback.source === READABILITY_SOURCE_ID) {
      readability.metrics.find((node) => node.key === metric)?.children.push(feedback);
      return;
    }
    if (feedback.source === PSYCH_SOURCE_ID) {
      psycholinguistic.metrics.find((node) => node.key === metric)?.children.push(feedback);
    }
  });

  return [readability, psycholinguistic];
}

function TreeNode({
  label,
  classes,
}: {
  label: string;
  classes?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-base-300 bg-white px-3 py-1 text-xs font-semibold shadow-sm",
        classes,
      )}
    >
      {label}
    </div>
  );
}

function getCircleDiameter(
  actionability: number | undefined,
  minActionability: number,
  maxActionability: number,
): number {
  const minDiameter = 20;
  const maxDiameter = 34;
  const value = typeof actionability === "number" ? actionability : minActionability;
  if (Math.abs(maxActionability - minActionability) < 0.001) {
    return 26;
  }
  const normalized = (value - minActionability) / (maxActionability - minActionability);
  return minDiameter + normalized * (maxDiameter - minDiameter);
}

const RevisionTree = (props: RevisionTreeProps) => {
  const allFeedback = useFeedbackStore((state) => state.feedback);
  const generatedFeedback = useMemo(
    () =>
      allFeedback.filter(
        (feedback) =>
          feedback.source === READABILITY_SOURCE_ID ||
          feedback.source === PSYCH_SOURCE_ID,
      ),
    [allFeedback],
  );
  const { targetAudienceLevel, readabilityMetrics, psychMetrics } = useSharedConfigStore(
    (state) => ({
      targetAudienceLevel: state.targetAudienceLevel,
      readabilityMetrics: state.readabilityMetrics,
      psychMetrics: state.psychMetrics,
    }),
  );
  const treeData = useMemo(
    () =>
      buildTree(
        generatedFeedback,
        targetAudienceLevel,
        { asl: readabilityMetrics.asl, asw: readabilityMetrics.asw },
        {
          meanAoA: psychMetrics.meanAoA,
          lateAoARatio: psychMetrics.lateAoARatio,
          meanConcreteness: psychMetrics.meanConcreteness,
          abstractRatio: psychMetrics.abstractRatio,
        },
      ),
    [
      generatedFeedback,
      psychMetrics.meanAoA,
      psychMetrics.lateAoARatio,
      psychMetrics.meanConcreteness,
      psychMetrics.abstractRatio,
      readabilityMetrics.asl,
      readabilityMetrics.asw,
      targetAudienceLevel,
    ],
  );
  const [minActionability, maxActionability] = useMemo(() => {
    if (!generatedFeedback.length) return [0, 1] as const;
    const values = generatedFeedback.map((item) =>
      typeof item.actionability === "number" ? item.actionability : 0,
    );
    return [Math.min(...values), Math.max(...values)] as const;
  }, [generatedFeedback]);

  const {
    currentSelectedItems,
    updateCurrentSelectedItems,
    setHoveredProvider,
    setHoveredItem,
  } = useSharedConfigStore((state) => ({
    currentSelectedItems: state.currentSelectedItems,
    updateCurrentSelectedItems: state.updateCurrentSelectedItems,
    setHoveredProvider: state.setHoveredProvider,
    setHoveredItem: state.setHoveredItem,
  }));

  return (
    <div
      className={cn(
        "absolute top-[52px] left-3 right-[6px] bottom-16 rounded-md border border-base-200 bg-base-100 p-3 overflow-auto",
        props.classes,
      )}
    >
      <div className="mb-3 border-b border-base-200 pb-2">
        <p className="text-sm font-semibold">Revision Tree</p>
        <p className="text-2xs opacity-60">
          Parent nodes are fixed. Suggestion nodes are generated from provider cards.
        </p>
      </div>

      <div className="min-w-[1100px] pb-4">
        <div className="flex justify-center">
          <TreeNode label="Revision Plan" classes="bg-sky-50 border-sky-200" />
        </div>
        <div className="mx-auto h-5 w-px bg-base-300" />

        <div className="relative mx-auto flex justify-center gap-40">
          <div className="absolute top-0 h-px w-[520px] bg-base-300" />

          {treeData.map((rootNode) => (
            <div key={rootNode.key} className="w-[460px]">
              <div className="flex flex-col items-center">
                <div className="h-5 w-px bg-base-300" />
                <TreeNode
                  label={rootNode.title}
                  classes="bg-base-200 border-base-300 text-neutral-700"
                />
                <div className="h-5 w-px bg-base-300" />

                <div className="relative flex justify-center gap-8">
                  <div className="absolute top-0 h-px w-[260px] bg-base-300" />

                  {rootNode.metrics.map((metricNode) => (
                    <div key={metricNode.key} className="flex w-[180px] flex-col items-center">
                      <div className="h-5 w-px bg-base-300" />
                      <TreeNode label={metricNode.title} />
                      <div className="h-3 w-px bg-base-300" />

                      {(metricNode.directionHint || metricNode.children.length > 0) && (
                        <div className="relative flex w-full flex-col items-center gap-2 pt-1">
                          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-base-300" />
                          {metricNode.directionHint ? (
                            <div className="relative z-10 flex w-full items-center justify-center">
                              <div className="h-px w-4 bg-base-300" />
                              <div className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-2xs font-semibold text-amber-800">
                                {metricNode.directionHint}
                              </div>
                            </div>
                          ) : null}
                          {metricNode.children.length > 0 ? (
                            <div className="relative z-10 flex w-full items-center justify-center">
                              <div className="h-px w-4 bg-base-300" />
                              <div className="flex max-w-[170px] flex-wrap justify-center gap-2">
                                {metricNode.children.map((feedback, index) => {
                                  const selected = currentSelectedItems.includes(feedback.id);
                                  const diameter = getCircleDiameter(
                                    feedback.actionability,
                                    minActionability,
                                    maxActionability,
                                  );
                                  const color = METRIC_CIRCLE_COLOR[metricNode.key];

                                  return (
                                    <button
                                      key={feedback.id}
                                      title={`${feedback.content}\nActionability: ${(
                                        feedback.actionability ?? 0
                                      ).toFixed(2)}`}
                                      className={cn(
                                        "flex items-center justify-center rounded-full border-2 text-2xs font-semibold transition-all",
                                        selected
                                          ? "bg-zinc-300 border-zinc-500 text-zinc-800"
                                          : `${color.bg} ${color.border} ${color.text} hover:scale-105`,
                                      )}
                                      style={{
                                        width: `${diameter}px`,
                                        height: `${diameter}px`,
                                      }}
                                      onClick={() => {
                                        const isSelected = currentSelectedItems.includes(
                                          feedback.id,
                                        );
                                        const nextSelectedItems = isSelected
                                          ? currentSelectedItems.filter(
                                              (id) => id !== feedback.id,
                                            )
                                          : [...currentSelectedItems, feedback.id];

                                        updateCurrentSelectedItems(nextSelectedItems);

                                        if (!isSelected) {
                                          setHoveredItem(feedback.id);
                                          setHoveredProvider(null);
                                        } else {
                                          setHoveredItem(null);
                                          setHoveredProvider(null);
                                        }
                                        eventTracker({
                                          action: isSelected
                                            ? "revision tree circle deselected"
                                            : "revision tree circle selected",
                                          data: {
                                            node: rootNode.title,
                                            metric: metricNode.title,
                                            feedbackId: feedback.id,
                                            actionability: feedback.actionability,
                                          },
                                        });
                                      }}
                                    >
                                      {index + 1}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RevisionTree;
