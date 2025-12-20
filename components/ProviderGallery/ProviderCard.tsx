"use client";
import React, { useEffect, useState } from "react";
import { FeedbackSourceItem } from "@/lib/type";
import { cn, getColor, isSimilarSentence, eventTracker } from "@/lib/utils";
import {
  useSharedConfigStore,
  useFeedbackStore,
  useRevisionListStore,
} from "@/lib/store";
import { noto_serif } from "@/app/fonts";
import { cosineSimilarity } from "fast-cosine-similarity";
import { set } from "firebase/database";

const typeMap = {
  claim: "Claims/Ideas",
  reasoning: "Warrent/Reasoning/Backing",
  evidence: "Evidence",
  rebuttal: "Rebuttal/Reservation",
  orthography: "Convention/Grammar/Spelling",
  organization: "Organization",
  "word-usage": "Word Usage/Clarity",
  others: "General Content",
};

const READABILITY_SOURCE_ID = 0;

type ProviderCardProps = {
  feedbackSourceItem: FeedbackSourceItem;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  hideContent?: boolean;
  isClicked?: boolean;
};

export const ProviderCard = (props: ProviderCardProps) => {
  const [selectBtn, setSelectBtn] = useState("Select All");
  const revisionList = useRevisionListStore((state) => state.revisionList);
  const [isExpanded, setIsExpanded] = useState(false);
  const allFeedbackItems = useFeedbackStore((state) => state.feedback);
  const {
    currentSelectedItems,
    setHoveredProvider,
    hoveredSentence,
    hoveredItem,
    setHoveredItem,
    colorDimension,
  } = useSharedConfigStore();
  const selectedFeedbackItems = allFeedbackItems.filter((item) =>
    currentSelectedItems.includes(item.id),
  );
  const isReadabilityProvider =
    props.feedbackSourceItem.id === READABILITY_SOURCE_ID;

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

  const renderReadabilitySuggestions = () => {
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
            <p className="text-xs font-semibold text-neutral-700">
              {feedback.content}
            </p>
            {feedback.revisedContent ? (
              <p className="mt-1 text-xs text-neutral-600">
                {feedback.revisedContent}
              </p>
            ) : null}
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
  }, [props.isClicked]);

  // Handle click event
  const handleClick = (event: React.MouseEvent, d: any) => {
    // console.log("Clicked on feedback", d.data.id);

    if (event.shiftKey) {
      // console.log("Shift key pressed");
      event.preventDefault();

      const { similarityThreshold } = useSharedConfigStore.getState();
      const clickedEmbeddings = allFeedbackItems.find(
        (item) => item.id === d.data.id,
      )?.embeddings as number[];

      if (!clickedEmbeddings) return;

      const matchedIds = allFeedbackItems
        .filter((item) => {
          if (!item.embeddings) return false;
          const similarity = Math.abs(
            cosineSimilarity(clickedEmbeddings, item.embeddings),
          );
          return similarity > similarityThreshold;
        })
        .map((item) => item.id);

      const { currentSelectedItems, updateCurrentSelectedItems } =
        useSharedConfigStore.getState();
      const combinedIds = Array.from(
        new Set([...currentSelectedItems, ...matchedIds]),
      );
      updateCurrentSelectedItems(combinedIds);

      eventTracker({
        action: "add all similar feedback to prepstation",
        data: {
          feedbackID: d.data.id,
          similarIDs: matchedIds,
        },
      });
      return;
    }
  };

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
                  Provider {props.feedbackSourceItem["id"]} /{" "}
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
                !shouldExpand && !isReadabilityProvider,
              "max-h-[1000px]": shouldExpand || isReadabilityProvider,
            },
          )}
        >
          {isReadabilityProvider ? (
            renderReadabilitySuggestions()
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
