import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  useEssayStore,
  useFeedbackStore,
  useSharedConfigStore,
  useRevisionListStore,
} from "@/lib/store";
import { Sentence } from "@/lib/type";
import TextDiff from "@/components/EssayPanel/TextDiff";

interface EssayPanelProps {
  classes?: string;
}

const EssayPanel = (props: EssayPanelProps) => {
  const [
    hoveredItem,
    currentSelectedItems,
    currentRevisionItem,
    comparisonMode,
    setComparisonMode,
  ] = useSharedConfigStore((state) => [
    state.hoveredItem,
    state.currentSelectedItems,
    state.currentRevisionItem,
    state.comparisonMode,
    state.setComparisonMode,
  ]);

  const revisionList = useRevisionListStore((state) => state.revisionList);
  const revisionObject = revisionList.find(
    (item) => item.id === currentRevisionItem,
  );

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
      <div className="h-16 px-8 bg-white text-gray-800 flex flex-row items-center gap-2 absolute top-16 z-50 w-full justify-between">
        <p className="font-semibold text-xl">My Essay</p>
        <div className="form-control">
          <label className="label cursor-pointer space-x-2">
            <span className="label-text text-xs ">
              Compare to Orginal Essay
            </span>
            <input
              type="checkbox"
              className="toggle toggle-sm"
              checked={comparisonMode}
              onChange={() => setComparisonMode(!comparisonMode)}
            />
          </label>
        </div>
      </div>
      <div className="text-sm leading-relaxed p-8 pt-32 overflow-y-auto relative grow">
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
                      currentSelectedSentences.has(section.content)
                        ? "bg-sky-100"
                        : "",
                      revisionObject?.revision.find(
                        (item) => item.original === section.content,
                      ) && "bg-green-100",
                      "transition-all duration-150 ease-in-out",
                      highlightSentences.has(section.content)
                        ? "bg-sky-100"
                        : "",
                    )}
                  >
                    {comparisonMode ? (
                      // if senction.content exit in revisionObject's revision's orginal, then show the text diff via TextDiff component
                      revisionObject &&
                      revisionObject.revision.find(
                        (item) => item.original === section.content,
                      ) ? (
                        <TextDiff
                          oldText={
                            revisionObject?.revision.find(
                              (item) => item.original === section.content,
                            )?.original || ""
                          }
                          newText={
                            revisionObject?.revision.find(
                              (item) => item.original === section.content,
                            )?.revised || ""
                          }
                        />
                      ) : (
                        section.content + " "
                      )
                    ) : (
                      // if senction.content exit in revisionObject's revision's orginal, then show the revision content
                      (revisionObject?.revision.find(
                        (item) => item.original === section.content,
                      )?.revised || section.content) + " "
                    )}
                    {!comparisonMode && // if senction.content exit in revisionObject's revision's orginal, then show the revision content
                      revisionObject?.revision.find(
                        (item) => item.original === section.content,
                      )?.revised && (
                        <span className="text-xs text-gray-400">[edited]</span>
                      )}{" "}
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
