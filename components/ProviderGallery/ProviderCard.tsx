"use client";
import React, { useEffect, useState } from "react";
import { FeedbackItem, FeedbackSourceItem } from "@/lib/type";
import { cn, getColor, isSimilarSentence, eventTracker } from "@/lib/utils";
import {
  useSharedConfigStore,
  useFeedbackStore,
  useRevisionListStore,
  useEssayStore,
} from "@/lib/store";
import { noto_serif } from "@/app/fonts";

const typeMap = {
  claim: "Claims/Ideas",
  reasoning: "Warrent/Reasoning/Backing",
  evidence: "Evidence",
  rebuttal: "Rebuttal/Reservation",
  orthography: "Convention/Grammar/Spelling",
  organization: "Organization",
  "word-usage": "Word Usage/Clarity",
  asl: "ASL",
  asw: "ASW",
  aoa: "AoA",
  concreteness: "Concreteness",
  others: "General Content",
};

const GENERATED_SUGGESTION_SOURCE_IDS = new Set([100, 101]);
const PSYCH_EPSILON = 0.05;

type AudienceLevel = "simple" | "general" | "knowledgeable";
type PsychMetrics = {
  meanAoA: number | null;
  lateAoARatio: number | null;
  meanConcreteness: number | null;
  abstractRatio: number | null;
};
type ConcretenessHintMode = "raise" | "lower" | "rebalance";

const CONCRETENESS_BENCHMARKS: Record<
  AudienceLevel,
  {
    meanConcreteness: { min: number; max: number };
    abstractRatio: { min: number; max: number };
  }
> = {
  simple: {
    meanConcreteness: { min: 3.5, max: 5.0 },
    abstractRatio: { min: 0.0, max: 0.15 },
  },
  general: {
    meanConcreteness: { min: 2.7, max: 3.5 },
    abstractRatio: { min: 0.15, max: 0.35 },
  },
  knowledgeable: {
    meanConcreteness: { min: 1.0, max: 2.7 },
    abstractRatio: { min: 0.35, max: 1.0 },
  },
};

function getConcretenessHintMode(
  targetAudienceLevel: AudienceLevel,
  psychMetrics: PsychMetrics,
): ConcretenessHintMode {
  if (
    psychMetrics.meanConcreteness === null ||
    psychMetrics.abstractRatio === null
  ) {
    return "rebalance";
  }

  const benchmark = CONCRETENESS_BENCHMARKS[targetAudienceLevel];
  const concAbove =
    psychMetrics.meanConcreteness >
    benchmark.meanConcreteness.max + PSYCH_EPSILON;
  const concBelow =
    psychMetrics.meanConcreteness <
    benchmark.meanConcreteness.min - PSYCH_EPSILON;
  const absAbove =
    psychMetrics.abstractRatio > benchmark.abstractRatio.max + PSYCH_EPSILON;
  const absBelow =
    psychMetrics.abstractRatio < benchmark.abstractRatio.min - PSYCH_EPSILON;

  if (concAbove || absBelow) return "lower";
  if (concBelow || absAbove) return "raise";
  return "rebalance";
}

function inferConcretenessExampleHint(replacement: string): string {
  const trimmed = replacement.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed) return "replace an abstract idea with a tangible detail";

  if (/\d/.test(trimmed)) {
    if (/%|\bpercent(age)?\b/.test(lower)) return "give a specific statistic";
    if (
      /\$|¥|€|£|\b(dollar|dollars|yuan|rmb|usd|million|billion|trillion)\b/.test(
        lower,
      )
    ) {
      return "give a concrete amount";
    }
    if (
      /\b(19|20)\d{2}\b/.test(lower) ||
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(
        lower,
      ) ||
      /\b(year|years|month|months|day|days|week|weeks|hour|hours|minute|minutes|second|seconds)\b/.test(
        lower,
      )
    ) {
      return "give a specific time reference";
    }
    return "give a specific number";
  }

  if (
    /\b(study|studies|survey|report|reports|data|evidence|statistic|statistics|research)\b/.test(
      lower,
    )
  ) {
    return "add a concrete fact or source";
  }

  if (/\b(for example|for instance|such as)\b/.test(lower)) {
    return "name a concrete example";
  }

  if (
    /\b[A-Z]{2,}\b/.test(trimmed) ||
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/.test(trimmed)
  ) {
    return "name a real person, place, or organization";
  }

  if (trimmed.split(/\s+/).filter(Boolean).length >= 2) {
    return "name a specific example or tangible detail";
  }

  return "replace an abstract term with a more tangible word";
}

function inferAbstractionExampleHint(replacement: string): string {
  const trimmed = replacement.trim();

  if (!trimmed) return "replace a tangible example with a broader concept";
  if (/\d/.test(trimmed)) return "replace exact figures with a broader scale";
  if (
    /\b[A-Z]{2,}\b/.test(trimmed) ||
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/.test(trimmed)
  ) {
    return "replace named cases with a broader category";
  }
  if (trimmed.split(/\s+/).filter(Boolean).length >= 2) {
    return "replace a specific example with a broader category";
  }
  return "replace a concrete term with a more abstract concept";
}

function buildConcretenessIntermediate(
  replacement: string,
  mode: ConcretenessHintMode,
): string {
  if (mode === "lower") {
    return `Lower concreteness, e.g., ${inferAbstractionExampleHint(replacement)}.`;
  }
  if (mode === "raise") {
    return `Improve concreteness, e.g., ${inferConcretenessExampleHint(replacement)}.`;
  }
  return "Adjust concreteness, e.g., balance abstract claims with tangible details.";
}

type ProviderCardProps = {
  feedbackSourceItem: FeedbackSourceItem;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  hideContent?: boolean;
  isClicked?: boolean;
};

export const ProviderCard = (props: ProviderCardProps) => {
  const [selectBtn, setSelectBtn] = useState("Select All");
  const [showFinalAnswerByFeedback, setShowFinalAnswerByFeedback] = useState<
    Record<number, boolean>
  >({});
  const essay = useEssayStore((state) => state.essay);
  const [isExpanded, setIsExpanded] = useState(false);
  const allFeedbackItems = useFeedbackStore((state) => state.feedback);
  const {
    currentSelectedItems,
    setHoveredProvider,
    hoveredSentence,
    hoveredItem,
    setHoveredItem,
    colorDimension,
    targetAudienceLevel,
    psychMetrics,
  } = useSharedConfigStore();
  const isGeneratedSuggestionProvider = GENERATED_SUGGESTION_SOURCE_IDS.has(
    props.feedbackSourceItem.id,
  );

  // Find the related feedback items
  const relatedFeedbacks = allFeedbackItems.filter(
    (item) => item.source === props.feedbackSourceItem.id,
  );

  // Find the hovered feedback item
  const hoveredFeedback = allFeedbackItems.find(
    (item) => item.id === hoveredItem,
  );

  // Check if the feedback item is hovered
  const shouldExpand =
    isExpanded || hoveredFeedback?.source === props.feedbackSourceItem.id;

  const renderContentWithHighlights = (
    newContent: string,
    originalContent: string,
  ): JSX.Element[] => {
    const newContentSentences = newContent.split(/(?<=[.?!])\s+/);
    const originalContentSentences = originalContent.split(/(?<=[.?!])\s+/);

    const allFeedbackItems = useFeedbackStore.getState().feedback;
    const currentSelectedItems =
      useSharedConfigStore.getState().currentSelectedItems;
    const { currentRevisionItem } = useSharedConfigStore.getState();
    const { revisionList } = useRevisionListStore.getState();
    const currentRevision = revisionList?.find(
      (item) => item.id === currentRevisionItem,
    );

    const selectedFeedbackItems = allFeedbackItems.filter(
      (item) =>
        currentSelectedItems.includes(item.id) ||
        currentRevision?.feedback?.includes(item.id),
    );
    const allSelectedSentences = selectedFeedbackItems
      .map((item) => item.content)
      .join(" ")
      .split(/(?<=[.?!])\s+/);

    return newContentSentences.map((sentence, index) => {
      if (isSimilarSentence(sentence, originalContentSentences)) {
        return (
          <span
            key={index}
            className={cn(
              "font-medium text-sm",
              allSelectedSentences.includes(sentence)
                ? "underline bg-sky-50"
                : "",
            )}
          >
            {sentence}{" "}
          </span>
        );
      } else {
        return (
          <span
            key={index}
            className={cn(
              "opacity-60",
              allSelectedSentences.includes(sentence)
                ? "underline bg-sky-50"
                : "",
            )}
          >
            {sentence}{" "}
          </span>
        );
      }
    });
  };

  const renderContentWithBgColor = (newContent: string): JSX.Element[] => {
    const newContentSentences = newContent.split(/(?<=[.?!])\s+/);
    const allFeedbackItems = useFeedbackStore.getState().feedback;
    const currentSelectedItems =
      useSharedConfigStore.getState().currentSelectedItems;
    const { currentRevisionItem } = useSharedConfigStore.getState();
    const { revisionList } = useRevisionListStore.getState();
    const currentRevision = revisionList?.find(
      (item) => item.id === currentRevisionItem,
    );

    const selectedFeedbackItems = allFeedbackItems.filter(
      (item) =>
        currentSelectedItems.includes(item.id) ||
        currentRevision?.feedback?.includes(item.id),
    );
    const allSelectedSentences = selectedFeedbackItems
      .map((item) => item.content)
      .join(" ")
      .split(/(?<=[.?!])\s+/);

    return newContentSentences.map((sentence, index) => {
      return (
        <span
          key={index}
          className={cn(
            allSelectedSentences.includes(sentence)
              ? "underline bg-sky-50"
              : "",
          )}
        >
          {sentence}{" "}
        </span>
      );
    });
  };

  const renderGeneratedSuggestions = () => {
    const concretenessHintMode = getConcretenessHintMode(
      targetAudienceLevel,
      psychMetrics,
    );

    const countSentences = (value: string) =>
      value
        .split(/[.!?]+/)
        .map((part) => part.trim())
        .filter(Boolean).length;

    const countWords = (value: string) =>
      value
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;

    const maskWord = (word: string) => {
      if (!word) return word;
      if (word.length <= 1) return "_";
      if (word.length <= 3) return `${word[0]}${"_".repeat(word.length - 1)}`;
      return `${word[0]}${"_".repeat(word.length - 2)}${word[word.length - 1]}`;
    };

    const maskPhrase = (text: string) =>
      text.replace(/[A-Za-z']+/g, (token) => maskWord(token));

    const getOriginalSentenceFromDetection = (detection: number[]) => {
      if (!detection?.length) return "";
      const sentenceId = detection[0];
      return essay.find((sentence) => sentence.id === sentenceId)?.content || "";
    };

    const buildAslIntermediate = (
      originalSentence: string,
      revisedSentence: string,
    ) => {
      const original = originalSentence.trim();
      const revised = revisedSentence.trim();
      const originalCount = countSentences(original);
      const revisedCount = countSentences(revised);
      const originalWords = countWords(original);
      const revisedWords = countWords(revised);

      let mode: "raise" | "lower" | "adjust" = "adjust";
      if (revisedCount < originalCount) mode = "raise";
      else if (revisedCount > originalCount) mode = "lower";
      else if (revisedWords > originalWords + 2) mode = "raise";
      else if (revisedWords < originalWords - 2) mode = "lower";

      const cueSentence = original || "the detected sentence";

      if (mode === "raise") {
        return `[ASL Raise Template]
1. Find two short clauses that share a subject.
2. Keep one clause as the main clause.
3. Merge the other clause using a connector or relative clause.
Cue: combine around "${cueSentence}".`;
      }
      if (mode === "lower") {
        return `[ASL Lower Template]
1. Find a long sentence with multiple clauses.
2. Split at a natural clause boundary.
3. Keep one core idea per sentence and keep a clear connector.
Cue: split around "${cueSentence}".`;
      }
      return `[ASL Adjustment Template]
1. Check clause density in the detected sentence.
2. Split or merge one clause based on readability goal.
3. Keep grammar and logic intact after restructuring.
Cue: revise "${cueSentence}" with one sentence-length move.`;
    };

    const buildIntermediateAnswer = (feedback: FeedbackItem) => {
      const type = String(feedback.type || "").toLowerCase();
      const finalAnswer = String(feedback.revisedContent || "");
      if (!finalAnswer) return "";

      if (type === "asl") {
        const originalSentence = getOriginalSentenceFromDetection(
          feedback.detection || [],
        );
        return buildAslIntermediate(originalSentence, finalAnswer);
      }

      if (type === "concreteness") {
        return buildConcretenessIntermediate(finalAnswer, concretenessHintMode);
      }

      if (type === "asw" || type === "aoa") {
        return maskPhrase(finalAnswer);
      }

      return finalAnswer;
    };

    const canToggleAnswerState = (feedback: FeedbackItem) => {
      const type = String(feedback.type || "").toLowerCase();
      if (!feedback.revisedContent) return false;
      return (
        type === "asl" ||
        type === "asw" ||
        type === "aoa" ||
        type === "concreteness"
      );
    };

    if (relatedFeedbacks.length === 0) {
      return (
        <span className="font-medium">
          {renderContentWithBgColor(props.feedbackSourceItem.content)}
        </span>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {relatedFeedbacks.map((feedback) => (
          <div
            key={feedback.id}
            className="rounded-lg border border-base-200 bg-base-50 px-3 py-2"
          >
            {feedback.revisedContent ? (
              <details className="group">
                <summary className="cursor-pointer list-none text-xs font-semibold text-neutral-700">
                  <span>{feedback.content}</span>
                  <span className="ml-2 text-2xs font-medium text-neutral-500 group-open:hidden">
                    (click to view suggestion)
                  </span>
                  <span className="ml-2 hidden text-2xs font-medium text-neutral-500 group-open:inline">
                    (click to hide)
                  </span>
                </summary>
                {canToggleAnswerState(feedback) ? (
                  <div className="mt-2 flex items-start gap-2">
                    <p className="flex-1 text-xs text-neutral-600 whitespace-pre-wrap">
                      {showFinalAnswerByFeedback[feedback.id]
                        ? feedback.revisedContent
                        : buildIntermediateAnswer(feedback)}
                    </p>
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost min-h-0 h-5 px-1 leading-none"
                      title={
                        showFinalAnswerByFeedback[feedback.id]
                          ? "Back to hint"
                          : "Show final answer"
                      }
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setShowFinalAnswerByFeedback((prev) => ({
                          ...prev,
                          [feedback.id]: !prev[feedback.id],
                        }));
                      }}
                    >
                      {showFinalAnswerByFeedback[feedback.id] ? "←" : "→"}
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-neutral-600 whitespace-pre-wrap">
                    {feedback.revisedContent}
                  </p>
                )}
              </details>
            ) : (
              <p className="text-xs font-semibold text-neutral-700">
                {feedback.content}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  useEffect(() => {
    if (!props.isClicked) {
      setIsExpanded(false);
      setHoveredProvider(null);
    }
  }, [props.isClicked, setHoveredProvider]);

  // Get cilcle fill color based on categorical dimension
  const getFillColor = (id: number, text: string) => {
    const { currentRevisionItem } = useSharedConfigStore.getState();
    const { revisionList } = useRevisionListStore.getState();
    const currentRevision = revisionList?.find(
      (item) => item.id === currentRevisionItem,
    );

    return currentSelectedItems.includes(id) ||
      currentRevision?.feedback?.includes(id)
      ? "#e5e6e6"
      : getColor(colorDimension)(text as never);
  };

  useEffect(() => {
    const feedbackIDs = relatedFeedbacks.map((item) => item.id);
    const overlapedItemIDs = currentSelectedItems.filter((id) =>
      feedbackIDs.includes(id),
    );
    if (overlapedItemIDs.length === feedbackIDs.length) {
      setSelectBtn("Deselect All");
    } else {
      setSelectBtn("Select All");
    }
  }, [currentSelectedItems, relatedFeedbacks]);

  return (
    <div
      className={cn(
        "relative rounded-lg bg-base-100 overflow-auto text-neutral h-full m-2 my-[10px] cursor-pointer",
        "ring-offset-1 ring-offset-base-100",
        (hoveredSentence &&
          relatedFeedbacks.find((item) =>
            item.detection.includes(hoveredSentence),
          )) ||
          shouldExpand
          ? "ring-info ring-3 scale-[1.01] transition-all duration-150 ease-in-out"
          : "",
      )}
      draggable={props.draggable}
      onDragStart={props.onDragStart}
      onMouseEnter={() => {
        setIsExpanded(true);
        setHoveredProvider(props.feedbackSourceItem.id);
        eventTracker({
          action: "hover on provider card",
          data: {
            provider: props.feedbackSourceItem.id,
          },
        });
      }}
      onMouseLeave={() => {
        if (!props.isClicked) {
          setIsExpanded(false);
          setHoveredProvider(null);
        }
      }}
    >
      <div
        className="px-3 pb-2 bg-white border-2 rounded-lg select-none space-y-2"
        style={{
          borderColor: getColor("provider")(
            props.feedbackSourceItem["provider"] as never,
          ),
        }}
      >
        <div className="flex flex-col gap-2 items-start select-none font-medium">
          <div className="flex flex-row justify-between items-center w-full  pt-3">
            <div className="flex flex-row gap-1 items-center">
              <h1 className={cn("text-sm font-semibold")}>
                <span className="opacity-60">
                  Provider /{" "}
                </span>
                {props.feedbackSourceItem["provider"]}
              </h1>
            </div>
            <button
              className="btn btn-xs text-2xs"
              onClick={() => {
                const allFeedback = useFeedbackStore.getState().feedback;
                const updateCurrentSelectedItems =
                  useSharedConfigStore.getState().updateCurrentSelectedItems;
                const feedbackIDs = allFeedback
                  .filter((item) => item.source === props.feedbackSourceItem.id)
                  .map((item) => item.id);
                const currentSelectedItems =
                  useSharedConfigStore.getState().currentSelectedItems;

                // If overlap with current selected items, remove them
                const overlapedItemIDs = currentSelectedItems.filter((id) =>
                  feedbackIDs.includes(id),
                );
                if (overlapedItemIDs.length === feedbackIDs.length) {
                  // Remove all overlaped items
                  const filteredItems = currentSelectedItems.filter(
                    (id) => !feedbackIDs.includes(id),
                  );
                  updateCurrentSelectedItems(filteredItems);
                  eventTracker({
                    action: "remove all relevant feedback for provider",
                    data: {
                      removedFeedbackIDs: overlapedItemIDs,
                      providerID: props.feedbackSourceItem.id,
                    },
                  });
                  return;
                } else {
                  const mergedItems = Array.from(
                    new Set([...currentSelectedItems, ...feedbackIDs]),
                  );
                  updateCurrentSelectedItems(mergedItems);
                  eventTracker({
                    action: "select all relevant feedback for provider",
                    data: {
                      addedFeedbackIDs: feedbackIDs,
                      providerID: props.feedbackSourceItem.id,
                    },
                  });
                }
              }}
            >
              {selectBtn}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <hr
            className="opacity-20 border-dashed"
            style={{
              borderColor: getColor("provider")(
                props.feedbackSourceItem["provider"] as never,
              ),
            }}
          />
          <div className="flex overflow-x-auto no-scrollbar p-1 h-6">
            {relatedFeedbacks.map((feedback, index) => (
              <div
                className={cn(
                  "flex flex-row gap-1 hover:gap-2 group items-center",
                  "transition-transform duration-500 ease-out",
                )}
                key={feedback.id}
                onMouseEnter={() => {
                  setHoveredItem(feedback.id);
                  eventTracker({
                    action: "hover on feedback bubble in provider card",
                    data: {
                      feedback: feedback.id,
                    },
                  });
                }}
                onMouseLeave={() => setHoveredItem(null)}
                // onClick={(event) =>
                //   handleClick(event, { data: { id: feedback.id } })
                // }
              >
                <div
                  className={cn(
                    "rounded-full w-[18px] h-[18px] flex-shrink-0",
                    "hover:ring-2 hover:ring-info hover:ring-offset-[1px]",
                    "hover:scale-105 transition-all duration-150 ease-in-out",
                    "cursor-pointer",
                    hoveredItem === feedback.id
                      ? "ring-info ring-2 ring-offset-[1px]"
                      : "",
                  )}
                  style={{
                    backgroundColor: getFillColor(
                      feedback.id,
                      feedback[colorDimension] as string,
                    ),
                  }}
                ></div>
                <p
                  className={cn(
                    "text-2xs font-medium",
                    "whitespace-nowrap overflow-hidden transition-all duration-500",
                    "max-w-0 opacity-0",
                    {
                      "max-w-[200px] opacity-100 mx-2":
                        hoveredItem === feedback.id,
                    },
                  )}
                >
                  {typeMap[feedback.type.toLowerCase() as keyof typeof typeMap]}
                </p>
              </div>
            ))}
          </div>
          <hr
            className="opacity-20 border-dashed"
            style={{
              borderColor: getColor("provider")(
                props.feedbackSourceItem["provider"] as never,
              ),
            }}
          />
          {/* <hr
            className="h-px border-0 bg-gradient-to-r from-transparent to-transparent"
            style={{
              backgroundImage: `linear-gradient(to right, transparent, ${getColor(
                "provider",
              )(props.feedbackSourceItem["provider"] as never)}, transparent)`,
            }}
          /> */}
        </div>

        <div
          className={cn(
            "text-xs leading-relaxed overflow-y-auto transition-all duration-1000",
            {
              "line-clamp-3 max-h-[60px]":
                !shouldExpand && !isGeneratedSuggestionProvider,
              "max-h-[1000px]": shouldExpand || isGeneratedSuggestionProvider,
            },
          )}
        >
          {isGeneratedSuggestionProvider ? (
            renderGeneratedSuggestions()
          ) : shouldExpand && hoveredFeedback ? (
            <span>
              <span className={noto_serif.className}>&quot;</span>
              {renderContentWithHighlights(
                props.feedbackSourceItem.content,
                hoveredFeedback.content,
              )}
              <span className={noto_serif.className}>&quot;</span>
            </span>
          ) : props.hideContent ? null : (
            <span className="font-medium">
              <span className={noto_serif.className}>&quot;</span>
              {renderContentWithBgColor(props.feedbackSourceItem.content)}
              <span className={noto_serif.className}>&quot;</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderCard;
