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
        "p-3 border-2 rounded-lg bg-white flex flex-col justify-between hover:ring-success hover:ring-3 hover:scale-[1.01] transition-all duration-150 ease-in-out cursor-pointer",
        currentRevisionItem === props.id ? "ring-success ring-3" : "",
      )}
      onClick={() => {
        setCurrentRevisionItem(props.id);
        setHoveredItem(null);
        setCurrentSelectedItems(thisRevision?.feedback || []);
      }}
    >
      <div className="space-y-2">
        <div className="flex flex-row justify-between items-center">
          <p className="text-sm font-semibold">
            Version {thisRevision?.id !== undefined && thisRevision.id + 1}{" "}
          </p>
          <div className="flex gap-1">
            {thisRevision && (
              <div
                className="w-4 h-4 rounded hover:scale-105 transition-all duration-150 ease-in-out cursor-pointer"
                style={{
                  backgroundColor: getInterpolateColor(
                    "green",
                    // collectStats(revisionList).maxAdded,
                    400,
                  )(countWordChanges(thisRevision).added),
                }}
                title={`Added: ${countWordChanges(thisRevision).added} words`}
              >
                {/* {thisRevision && countWordChanges(thisRevision).added} */}
              </div>
            )}
            {thisRevision && (
              <div
                className="w-4 h-4 rounded hover:scale-105 transition-all duration-150 ease-in-out cursor-pointer"
                style={{
                  backgroundColor: getInterpolateColor(
                    "red",
                    // collectStats(revisionList).maxDeleted,
                    400,
                  )(countWordChanges(thisRevision).deleted),
                }}
                title={`Deleted: ${countWordChanges(thisRevision).deleted} words`}
              >
                {/* {thisRevision && countWordChanges(thisRevision).deleted} */}
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
            className="rounded-full w-[18px] h-[18px] flex-shrink-0 hover:border-2 hover:border-info hover:scale-125 transition-all duration-150 ease-in-out cursor-pointer"
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
      <div className="card-actions justify-start flex mt-1">
        <span className="bg-pink-100 text-pink-800 text-xs px-2.5 py-0.5 rounded">
          # Addressed Feedback: {thisRevision?.feedback.length}
        </span>
        <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded">
          # Revised Sentences: {thisRevision?.revision.length}
        </span>
      </div>
    </div>
  );
};

export default RevisionCard;
