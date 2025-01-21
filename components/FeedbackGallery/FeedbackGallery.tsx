import React, { useState } from "react";
import FeedbackCard from "@/components/FeedbackGallery/FeedbackCard";
import { useFeedbackStore } from "@/lib/store";
import { FeedbackItem } from "@/lib/type";
import { cn } from "@/lib/utils";

type FeedbackGalleryProps = {
  classes?: string;
};

const FeedbackGallery = ({ classes }: FeedbackGalleryProps) => {
  const allFeedback = useFeedbackStore((state) => state.feedback);
  const [selectedFeedback, setSelectedFeedback] = useState<
    FeedbackItem[] | undefined
  >([]);

  return (
    <div className={cn(classes, "bg-gray-50")}>
      <div>
        {allFeedback &&
          (allFeedback.length > 0 ? (
            allFeedback.map((item) => (
              <div key={item.id}>
                <FeedbackCard
                  feedbackItem={item}
                  classes="relative rounded-lg hover:ring-2 ring-gray-300 ring-offset-1 ring-offset-gray-50"
                  close={true}
                  selectedFeedback={selectedFeedback}
                  setSelectedFeedback={setSelectedFeedback}
                />
                {/* <div className="border-t border-dashed border-gray-200 w-full" /> */}
              </div>
            ))
          ) : (
            <p className="mx-6 text-sm text-gray-400 select-none">
              No feedback available.
            </p>
          ))}
      </div>
    </div>
  );
};

export default FeedbackGallery;
