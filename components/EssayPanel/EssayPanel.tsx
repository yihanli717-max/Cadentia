"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  useEssayStore,
  useFeedbackStore,
  useSharedConfigStore,
} from "@/lib/store";
import { Sentence } from "@/lib/type";
import { stat } from "fs";

interface EssayPanelProps {
  classes?: string;
}

const EssayPanel = (props: EssayPanelProps) => {
  const [hoveredItem, currentSelectedItems] = useSharedConfigStore((state) => [
    state.hoveredItem,
    state.currentSelectedItems,
  ]);
  const allFeedback = useFeedbackStore((state) => state.feedback);
  const hoveredFeedback = useMemo(
    () => allFeedback.find((item) => item.id === hoveredItem),
    [allFeedback, hoveredItem],
  );
  const highlightSentences = useMemo(() => {
    // iterate through hoveredFeedback's plan and get all sentences
    const sentences = new Set<string>();
    hoveredFeedback?.plan.forEach((item) => {
      sentences.add(item.sentence);
    });
    // console.log(sentences);
    return sentences;
  }, [hoveredFeedback]);
  const currentSelectedFeedbacks = useMemo(
    () =>
      currentSelectedItems.map((id) =>
        allFeedback.find((item) => item.id === id),
      ),
    [currentSelectedItems, allFeedback],
  );
  const currentSelectedSentences = useMemo(() => {
    const sentences = new Set<string>();
    currentSelectedFeedbacks.forEach((feedback) => {
      feedback?.plan.forEach((item) => {
        sentences.add(item.sentence);
      });
    });
    return sentences;
  }, [currentSelectedFeedbacks]);

  const essay = useEssayStore((state) => state.essay);
  const paragraphs = useMemo(() => {
    return essay.reduce(
      (acc, curr) => {
        acc[curr.paragraph] = acc[curr.paragraph] || [];
        acc[curr.paragraph].push(curr);
        return acc;
      },
      {} as Record<number, Sentence[]>,
    );
  }, [essay]);

  return (
    <div
      className={cn(
        props.classes +
          " font-normal border-l border-gray-100 text-gray-800 flex flex-col select-none bg-white relative h-screen",
      )}
    >
      <div className="h-16 font-semibold pl-8 text-xl bg-white border-gray-100 text-gray-800 py-4 flex flex-row items-center gap-2">
        <p>My Essay</p>
      </div>
      <div className="text-sm leading-relaxed p-8 overflow-y-auto relative grow">
        {Object.entries(paragraphs).map(
          ([paragraph, sections], index, array) => (
            <div
              key={paragraph}
              className={
                (index < array.length - 1 ? "mb-6 " : "") + "cursor-pointer"
              }
            >
              {sections.map((section) => (
                <React.Fragment key={`section-${section.id}`}>
                  <span
                    id={section.id.toString()}
                    className={cn(
                      highlightSentences.has(section.content)
                        ? "bg-blue-100"
                        : "",
                      currentSelectedSentences.has(section.content)
                        ? "bg-yellow-100"
                        : "",
                    )}
                  >
                    {section.content + " "}
                  </span>
                </React.Fragment>
              ))}
            </div>
          ),
        )}
      </div>
    </div>
  );
};

export default EssayPanel;
