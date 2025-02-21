import React from "react";
import {
  useFeedbackStore,
  useSharedConfigStore,
  useRevisionListStore,
} from "@/lib/store";
import {
  cn,
  getColor,
  getInterpolateColor,
  countWordChanges,
  eventTracker,
} from "@/lib/utils";

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

interface RevisionCardProps {
  classes?: string;
  id: number;
}

const RevisionCard = (props: RevisionCardProps) => {
  const allFeedback = useFeedbackStore((state) => state.feedback);
  const [
    colorDimension,
    clusterDimension,
    currentRevisionItem,
    setCurrentSelectedItems,
    hoveredItem,
    setHoveredItem,
    setCurrentRevisionItem,
  ] = useSharedConfigStore((state) => [
    state.colorDimension,
    state.clusterDimension,
    state.currentRevisionItem,
    state.setCurrentSelectedItems,
    state.hoveredItem,
    state.setHoveredItem,
    state.setCurrentRevisionItem,
  ]);

  const revisionList = useRevisionListStore((state) => state.revisionList);
  const thisRevision = revisionList.find((item) => item.id === props.id);
  const thisFeedbacks = allFeedback.filter(
    (item) => thisRevision?.feedback.includes(item.id) || false,
  );

  return (
    <div
      className={cn(
        props.classes,
        "p-3 border-2 rounded-lg bg-white flex flex-col justify-between hover:ring-success hover:ring-3 hover:scale-[1.01] transition-all duration-150 ease-in-out cursor-pointer w-[310px]",
        currentRevisionItem === props.id ? "ring-success ring-3" : "",
      )}
      onClick={() => {
        setCurrentRevisionItem(props.id);
        setHoveredItem(null);
        setCurrentSelectedItems([]);
        eventTracker({
          action: "click on revision card",
          data: {
            revision: props.id,
          },
        });
      }}
    >
      <div className="space-y-2">
        <div className="flex flex-row justify-between items-center">
          <p className="text-sm font-semibold">
            Version {thisRevision?.id !== undefined && thisRevision.id + 1}{" "}
          </p>
          <div>
            {thisRevision && (
              <div className="flex flex-row gap-1 items-center justify-center">
                <div className="text-xs font-medium text-green-700">
                  +{thisRevision && countWordChanges(thisRevision).added}
                </div>
                <div className="text-xs font-medium text-red-700">
                  -{thisRevision && countWordChanges(thisRevision).deleted}
                </div>
                <div className="flex flex-row gap-0.5">
                  {Array.from({
                    length: Math.floor(
                      countWordChanges(thisRevision).added /
                        ((countWordChanges(thisRevision).added +
                          countWordChanges(thisRevision).deleted) /
                          5),
                    ),
                  }).map((_, index) => (
                    <div
                      key={index}
                      className="w-3 h-3 rounded-sm hover:scale-105 transition-all duration-150 ease-in-out cursor-pointer"
                      style={{
                        backgroundColor: getInterpolateColor(
                          "green",
                          // collectStats(revisionList).maxAdded,
                          400,
                        )(countWordChanges(thisRevision).added),
                      }}
                      // title={`Added: ${countWordChanges(thisRevision).added} words`}
                    />
                  ))}
                  {Array.from({
                    length: Math.floor(
                      countWordChanges(thisRevision).added /
                        ((countWordChanges(thisRevision).added +
                          countWordChanges(thisRevision).deleted) /
                          5),
                    ),
                  }).map((_, index) => (
                    <div
                      key={index}
                      className="w-3 h-3 rounded-sm hover:scale-105 transition-all duration-150 ease-in-out cursor-pointer"
                      style={{
                        backgroundColor: getInterpolateColor(
                          "red",
                          // collectStats(revisionList).maxAdded,
                          400,
                        )(countWordChanges(thisRevision).deleted),
                      }}
                      // title={`Deleted: ${countWordChanges(thisRevision).deleted} words`}
                    />
                  ))}
                  {Array.from({
                    length:
                      5 -
                      (Math.floor(
                        countWordChanges(thisRevision).added /
                          ((countWordChanges(thisRevision).added +
                            countWordChanges(thisRevision).deleted) /
                            5),
                      ) +
                        Math.floor(
                          countWordChanges(thisRevision).deleted /
                            ((countWordChanges(thisRevision).added +
                              countWordChanges(thisRevision).deleted) /
                              5),
                        )),
                  }).map((_, index) => (
                    <div
                      key={index}
                      className="w-3 h-3 rounded-sm hover:scale-105 transition-all duration-150 ease-in-out cursor-pointer bg-base-300 border"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <hr className="border-dashed" />
        <div className="flex overflow-x-auto no-scrollbar p-1 h-6">
          {thisFeedbacks.map((feedback) => (
            <div
              className={cn(
                "flex flex-row gap-1 hover:gap-2 group items-center",
                "transition-transform duration-500 ease-out",
              )}
              key={feedback.id}
              onMouseEnter={() => {
                setHoveredItem(feedback.id);
                eventTracker({
                  action: "hover on feedback bubble in revision card",
                  data: {
                    feedback: feedback.id,
                  },
                });
              }}
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
                  "text-2xs font-medium",
                  "whitespace-nowrap overflow-hidden transition-all duration-500",
                  "max-w-0 opacity-0",
                  {
                    "max-w-[200px] opacity-100 mx-2":
                      hoveredItem === feedback.id,
                  },
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
        <hr className="border-dashed" />
      </div>

      <div className="card-actions justify-start flex">
        <span className="bg-amber-100 text-amber-800 text-2xs px-2.5 py-0.5 rounded">
          # Addressed Feedback: {thisRevision?.feedback.length}
        </span>
        <span className="bg-blue-100 text-blue-800 text-2xs px-2.5 py-0.5 rounded">
          # Revised Sentences: {thisRevision?.revision.length}
        </span>
        <span className="bg-purple-100 text-purple-800 text-2xs px-2.5 py-0.5 rounded">
          # Covered Providers:{" "}
          {new Set(thisFeedbacks.map((item) => item.provider)).size}
        </span>
      </div>
    </div>
  );
};

export default RevisionCard;
