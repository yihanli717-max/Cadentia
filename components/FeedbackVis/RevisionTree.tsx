import React, { useMemo } from "react";
import { cn, eventTracker } from "@/lib/utils";
import { FeedbackItem } from "@/lib/type";
import { useFeedbackStore, useSharedConfigStore } from "@/lib/store";

const READABILITY_SOURCE_ID = 100;
const PSYCH_SOURCE_ID = 101;

type MetricKey = "asl" | "asw" | "aoa" | "concreteness";

type MetricNode = {
  key: MetricKey;
  title: string;
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

function classifyFeedbackMetric(feedback: FeedbackItem): MetricKey {
  const feedbackType = String(feedback.type || "").toLowerCase();
  const content = String(feedback.content || "").toLowerCase();
  const revised = String(feedback.revisedContent || "").toLowerCase();
  const mergedText = `${feedbackType} ${content} ${revised}`;

  if (feedback.source === READABILITY_SOURCE_ID) {
    if (mergedText.includes("asw")) return "asw";
    if (mergedText.includes("asl")) return "asl";
    return "asl";
  }

  if (feedback.source === PSYCH_SOURCE_ID) {
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

function buildTree(feedbackItems: FeedbackItem[]): RootNode[] {
  const readability: RootNode = {
    key: "readability",
    title: "Readability",
    metrics: [
      { key: "asl", title: "ASL", children: [] },
      { key: "asw", title: "ASW", children: [] },
    ],
  };
  const psycholinguistic: RootNode = {
    key: "psycholinguistic",
    title: "Psycholinguistic",
    metrics: [
      { key: "aoa", title: "AoA", children: [] },
      { key: "concreteness", title: "Concreteness", children: [] },
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
  const treeData = useMemo(() => buildTree(generatedFeedback), [generatedFeedback]);

  const {
    currentSelectedItems,
    setCurrentSelectedItems,
    setCurrentSelectedSentences,
    setHoveredProvider,
    setHoveredItem,
  } = useSharedConfigStore((state) => ({
    currentSelectedItems: state.currentSelectedItems,
    setCurrentSelectedItems: state.setCurrentSelectedItems,
    setCurrentSelectedSentences: state.setCurrentSelectedSentences,
    setHoveredProvider: state.setHoveredProvider,
    setHoveredItem: state.setHoveredItem,
  }));

  return (
    <div
      className={cn(
        "absolute top-[112px] left-3 right-[76px] bottom-16 rounded-md border border-base-200 bg-base-100 p-3 overflow-auto",
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

                      {metricNode.children.length === 0 ? (
                        <div className="flex items-center">
                          <div className="h-px w-4 bg-base-300" />
                          <div className="rounded border border-dashed border-base-300 bg-white px-2 py-1 text-2xs opacity-60">
                            waiting
                          </div>
                        </div>
                      ) : (
                        <div className="relative flex w-full flex-col items-center gap-2 pt-1">
                          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-base-300" />
                          {metricNode.children.map((feedback, index) => {
                            const selected = currentSelectedItems.includes(feedback.id);
                            return (
                              <div
                                key={feedback.id}
                                className="relative z-10 flex w-full items-center justify-center"
                              >
                                <div className="h-px w-4 bg-base-300" />
                                <button
                                  className={cn(
                                    "rounded border px-2 py-1 text-2xs transition-colors",
                                    selected
                                      ? "border-sky-300 bg-sky-50"
                                      : "border-base-300 bg-white hover:bg-base-200",
                                  )}
                                  onClick={() => {
                                    setCurrentSelectedItems([feedback.id]);
                                    setCurrentSelectedSentences(feedback.detection || []);
                                    setHoveredProvider(feedback.source);
                                    setHoveredItem(feedback.id);
                                    eventTracker({
                                      action: "revision tree item selected",
                                      data: {
                                        node: rootNode.title,
                                        metric: metricNode.title,
                                        feedbackId: feedback.id,
                                      },
                                    });
                                  }}
                                >
                                  Node {index + 1}
                                </button>
                              </div>
                            );
                          })}
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
