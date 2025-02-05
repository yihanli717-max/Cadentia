"use client";
import React, { useState } from "react";
import { FeedbackSourceItem } from "@/lib/type";
import { cn, getColor, isSimilarSentence } from "@/lib/utils";
import { useSharedConfigStore, useFeedbackStore } from "@/lib/store";
import { noto_serif } from "@/app/fonts";

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

type ProviderCardProps = {
  feedbackSourceItem: FeedbackSourceItem;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  hideContent?: boolean;
};

export const ProviderCard = (props: ProviderCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const allFeedbackItems = useFeedbackStore((state) => state.feedback);
  const [hoveredItem, setHoveredItem, colorDimension] = useSharedConfigStore(
    (state) => [state.hoveredItem, state.setHoveredItem, state.colorDimension],
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

    return newContentSentences.map((sentence, index) => {
      if (isSimilarSentence(sentence, originalContentSentences)) {
        return (
          <span key={index} className="font-medium">
            {sentence}{" "}
          </span>
        );
      } else {
        return (
          <span key={index} className="opacity-60">
            {sentence}{" "}
          </span>
        );
      }
    });
  };

  return (
    <div
      className={cn(
        "relative rounded-lg bg-gray-50 overflow-auto text-gray-800 h-full m-2 my-[10px] cursor-pointer",
        "ring-offset-1 ring-offset-gray-50",
        shouldExpand
          ? "ring-info ring-3 scale-[1.01] transition-all duration-150 ease-in-out"
          : "",
      )}
      draggable={props.draggable}
      onDragStart={props.onDragStart}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
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
          <div className="flex flex-row justify-between items-center w-full">
            <div className="flex flex-row gap-1 items-center pt-3">
              <h1 className={cn("text-sm font-semibold")}>
                <span className="opacity-60">
                  Provider {props.feedbackSourceItem["id"]}:{" "}
                </span>
                {props.feedbackSourceItem["provider"]}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <hr
            className="opacity-20"
            style={{
              borderColor: getColor("provider")(
                props.feedbackSourceItem["provider"] as never,
              ),
            }}
          />
          <div className="flex gap-1 overflow-x-auto no-scrollbar p-1">
            {relatedFeedbacks.map((feedback) => (
              <div
                className="flex flex-row gap-2 group items-center"
                key={feedback.id}
                onMouseEnter={() => setHoveredItem(feedback.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <div
                  className={cn(
                    "rounded-full w-[18px] h-[18px] flex-shrink-0 hover:ring-2 hover:ring-info hover:ring-offset-[1px] hover:scale-105 transition-all duration-150 ease-in-out cursor-pointer",
                    hoveredItem === feedback.id
                      ? "ring-info ring-2 ring-offset-[1px]"
                      : "",
                  )}
                  style={{
                    backgroundColor: getColor(colorDimension)(
                      feedback[colorDimension] as never,
                    ),
                  }}
                ></div>
                <p
                  className={cn(
                    "hidden group-hover:block transition-all duration-150 ease-in-out text-2xs font-medium",
                    hoveredItem === feedback.id ? "block" : "",
                  )}
                >
                  {
                    typeMap[
                      feedback["type"].toLowerCase() as keyof typeof typeMap
                    ]
                  }
                </p>
              </div>
            ))}
          </div>
          <hr
            className="opacity-20"
            style={{
              borderColor: getColor("provider")(
                props.feedbackSourceItem["provider"] as never,
              ),
            }}
          />
        </div>

        <div
          className={cn(
            "text-2xs leading-relaxed overflow-y-auto transition-all duration-500",
            {
              "line-clamp-3 max-h-[60px]": !shouldExpand,
              "max-h-[1000px]": shouldExpand,
            },
          )}
        >
          {shouldExpand && hoveredFeedback ? (
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
              {props.feedbackSourceItem.content}
              <span className={noto_serif.className}>&quot;</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderCard;
