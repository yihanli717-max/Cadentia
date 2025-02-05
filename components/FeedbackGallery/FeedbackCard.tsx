"use client";

import React, { useState, useEffect } from "react";
import HelpfulnessVis from "@/components/FeedbackGallery/HelpfulnessVis";
import { FeedbackSourceItem, FeedbackItem } from "@/lib/type";
import { cn, isSimilarSentence, getColor } from "@/lib/utils";
import { feedbackSource } from "@/data/source";
import { useSharedConfigStore } from "@/lib/store";
import { TbX, TbClipboardText } from "react-icons/tb";
import { noto_serif } from "@/app/fonts";

type FeedbackCardProps = {
  planStage?: number;
  classes: string;
  feedbackItem: FeedbackItem;
  close?: boolean;
  selectedFeedback?: FeedbackItem[];
  setSelectedFeedback?: (feedback: FeedbackItem[] | undefined) => void;
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  hideContent?: boolean;
};

const typeMap = {
  claim: "Claims/Ideas",
  reasoning: "Warrent/Reasoning/Backing",
  evidence: "Evidence",
  rebuttal: "Rebuttal/Reservation",
  others: "General Content",
  orthography: "Convention/Grammar/Spelling",
  organization: "Organization",
  "word-usage": "Word Usage/Clarity",
};

export const FeedbackCard = (props: FeedbackCardProps) => {
  const [showSource, setShowSource] = useState(false);
  const [newFeedbackContent, setNewFeedbackContent] = useState("");

  const [categoricalDimension, colorDimension] = useSharedConfigStore(
    (state) => [state.categoricalDimension, state.colorDimension],
  );

  const handleMouseEnterCheckSource = () => {
    // find id = props.feedbackItem.source in feedbackSource
    const data = feedbackSource.find(
      (item: FeedbackSourceItem) => item.id === props.feedbackItem.source,
    );

    if (data) setNewFeedbackContent(data.content);
  };

  const handleMouseLeaveCheckSource = () => {
    setNewFeedbackContent("");
  };

  useEffect(() => {
    if (showSource) handleMouseEnterCheckSource();
    else handleMouseLeaveCheckSource();
  }, [showSource]);

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

  const handleDismiss = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const menu = window.confirm("Dismiss this feedback item?");
    if (menu) {
      props.setSelectedFeedback &&
        props.setSelectedFeedback(
          props.selectedFeedback?.filter(
            (feedback) => feedback.id !== props.feedbackItem.id,
          ),
        );
    }
  };

  return (
    <div
      className={cn(
        props.classes,
        "relative rounded-lg bg-gray-50 overflow-auto text-gray-800 h-full m-2 my-[10px] cursor-pointer",
      )}
      draggable={props.draggable}
      onDragStart={props.onDragStart}
      onClick={() => {
        const { currentSelectedItems, setCurrentSelectedItems } =
          useSharedConfigStore.getState();

        const newSelectedFeedbacks = currentSelectedItems.includes(
          props.feedbackItem.id,
        )
          ? currentSelectedItems.filter((id) => id !== props.feedbackItem.id)
          : [...currentSelectedItems, props.feedbackItem.id];

        setCurrentSelectedItems(newSelectedFeedbacks);
      }}
    >
      <div
        className="px-3 pb-2 bg-white border-2 rounded-lg select-none space-y-2"
        style={{
          borderColor: getColor(colorDimension)(
            props.feedbackItem[colorDimension] as never,
          ),
        }}
      >
        <div className="flex flex-col gap-2 items-start select-none font-medium">
          <div className="flex flex-row justify-between items-center w-full">
            <div className="flex flex-row gap-1 items-center pt-3">
              <div
                className={cn(
                  showSource ? "text-gray-800" : "text-gray-400",
                  "text-xs font-normal cursor-pointer",
                )}
                onClick={(e) => {
                  // Avoid the event to be propagated to the parent div
                  setShowSource(!showSource);
                  e.stopPropagation();
                }}
              >
                <div className="flex flex-row gap-2 items-center">
                  <TbClipboardText size={20} />
                  {/* <p>Source: {props.feedbackItem.file}</p> */}
                </div>
              </div>
              <h1 className={cn("text-sm font-semibold")}>
                {categoricalDimension === "type"
                  ? typeMap[
                      props.feedbackItem.type.toLowerCase() as keyof typeof typeMap
                    ]
                  : props.feedbackItem[categoricalDimension]}
              </h1>
            </div>

            <div className="flex flex-row gap-1 items-center pt-3">
              <HelpfulnessVis
                id={props.feedbackItem.id}
                sentiment={props.feedbackItem.sentiment}
                actionability={props.feedbackItem.actionability}
                justification={props.feedbackItem.justification}
                specificity={props.feedbackItem.specificity}
                hideContent={props.hideContent}
              />

              {/* {!props.planStage && props.close && (
                <div onClick={handleDismiss} className="cursor-pointer">
                  <TbX size={20} />
                </div>
              )} */}
            </div>
          </div>
        </div>

        <hr
          className="opacity-20"
          style={{
            borderColor: getColor(colorDimension)(
              props.feedbackItem[colorDimension] as never,
            ),
          }}
        />

        <div className={cn("text-xs leading-relaxed max-h-40 overflow-y-auto")}>
          {newFeedbackContent ? (
            <span>
              &quot;
              {renderContentWithHighlights(
                newFeedbackContent,
                props.feedbackItem.content,
              )}
              &quot;
            </span>
          ) : props.hideContent ? null : (
            <span className="font-medium">
              &quot;{props.feedbackItem.content}&quot;
            </span>
          )}
        </div>

        <span className="card-actions justify-start flex mt-1">
          <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded">
            {categoricalDimension === "type"
              ? props.feedbackItem["provider"]
              : typeMap[
                  props.feedbackItem.type.toLowerCase() as keyof typeof typeMap
                ]}
          </span>
        </span>
      </div>
    </div>
  );
};

export default FeedbackCard;
