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
  collectStats,
} from "@/lib/utils";

interface RevisionCardProps {
  classes?: string;
  id: number;
}

const RevisionCard = (props: RevisionCardProps) => {
  const allFeedback = useFeedbackStore((state) => state.feedback);
  const [
    categoricalDimension,
    currentRevisionItem,
    setCurrentSelectedItems,
    setHoveredItem,
    setCurrentRevisionItem,
  ] = useSharedConfigStore((state) => [
    state.categoricalDimension,
    state.currentRevisionItem,
    state.setCurrentSelectedItems,
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
        "p-3 border-2 rounded-lg bg-white flex flex-col justify-between hover:ring-success hover:ring-3 hover:scale-[1.01] transition-all duration-150 ease-in-out cursor-pointer w-60",
        currentRevisionItem === props.id ? "ring-success ring-3" : "",
      )}
      onClick={() => {
        setCurrentRevisionItem(props.id);
        setHoveredItem(null);
        setCurrentSelectedItems([]);
      }}
    >
      <div className="space-y-2">
        <div className="flex flex-row justify-between items-center">
          <p className="text-sm font-semibold">
            Version {thisRevision?.id !== undefined && thisRevision.id + 1}{" "}
          </p>
          <div className="flex gap-1">
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
                      className="w-3 h-3 rounded-sm hover:scale-105 transition-all duration-150 ease-in-out cursor-pointer"
                      style={{
                        backgroundColor: getInterpolateColor(
                          "green",
                          // collectStats(revisionList).maxAdded,
                          400,
                        )(countWordChanges(thisRevision).added),
                      }}
                      title={`Added: ${countWordChanges(thisRevision).added} words`}
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
                      className="w-3 h-3 rounded-sm hover:scale-105 transition-all duration-150 ease-in-out cursor-pointer"
                      style={{
                        backgroundColor: getInterpolateColor(
                          "red",
                          // collectStats(revisionList).maxAdded,
                          400,
                        )(countWordChanges(thisRevision).deleted),
                      }}
                      title={`Deleted: ${countWordChanges(thisRevision).deleted} words`}
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
                    <div className="w-3 h-3 rounded-sm hover:scale-105 transition-all duration-150 ease-in-out cursor-pointer bg-gray-300 border" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <hr />
      </div>

      <div className="flex gap-1 overflow-x-auto no-scrollbar p-1">
        {thisFeedbacks.map((feedback) => (
          <div
            key={feedback.id}
            className="rounded-full w-[18px] h-[18px] flex-shrink-0 hover:ring-2 hover:ring-info hover:ring-offset-[0.5px] hover:scale-105 transition-all duration-150 ease-in-out cursor-pointer"
            style={{
              backgroundColor: getColor(categoricalDimension)(
                feedback[categoricalDimension],
              ),
            }}
            onMouseEnter={() => setHoveredItem(feedback.id)}
            onMouseLeave={() => setHoveredItem(null)}
          ></div>
        ))}
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
