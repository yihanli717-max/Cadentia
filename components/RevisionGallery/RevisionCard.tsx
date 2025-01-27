import React from "react";
import {
  useFeedbackStore,
  useSharedConfigStore,
  useRevisionListStore,
} from "@/lib/store";
import { getColor } from "@/lib/utils";

interface RevisionCardProps {
  id: number;
}

const RevisionCard = (props: RevisionCardProps) => {
  const allFeedback = useFeedbackStore((state) => state.feedback);
  const [categoricalDimension, currentRevisionItem] = useSharedConfigStore(
    (state) => [state.categoricalDimension, state.currentRevisionItem],
  );
  const revisionList = useRevisionListStore((state) => state.revisionList);
  const thisRevision = revisionList.find((item) => item.id === props.id);
  const thisFeedbacks = allFeedback.filter(
    (item) => thisRevision?.feedback.includes(item.id) || false,
  );

  return (
    <div className="w-52 p-3 border-2 rounded-lg bg-white flex flex-col justify-between hover:ring-info hover:ring-3 hover:scale-[1.01] transition-all duration-150 ease-in-out">
      <div className="flex flex-wrap gap-1">
        {thisFeedbacks.map((feedback) => (
          <div
            key={feedback.id}
            className="rounded-full w-5 h-5"
            style={{
              backgroundColor: getColor(categoricalDimension)(
                feedback[categoricalDimension],
              ),
            }}
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
