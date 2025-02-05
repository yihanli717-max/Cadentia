import React, { useState, useRef, useEffect } from "react";
import FeedbackCard from "@/components/FeedbackGallery/FeedbackCard";
import {
  useFeedbackStore,
  useSharedConfigStore,
  useRevisionListStore,
} from "@/lib/store";
import { FeedbackItem } from "@/lib/type";
import { cn } from "@/lib/utils";

type FeedbackGalleryProps = {
  classes?: string;
};

const FeedbackGallery = (props: FeedbackGalleryProps) => {
  const [
    hoveredItem,
    setHoveredItem,
    currentSelectedItems,
    numericalDimension,
    currentRevisionItem,
  ] = useSharedConfigStore((state) => [
    state.hoveredItem,
    state.setHoveredItem,
    state.currentSelectedItems,
    state.numericalDimension,
    state.currentRevisionItem,
  ]);

  const revisionList = useRevisionListStore((state) => state.revisionList);
  const currentRevision = revisionList.find(
    (item) => item.id === currentRevisionItem,
  );

  const allFeedbackItems = useFeedbackStore((state) => state.feedback).sort(
    (a, b) => {
      if (!numericalDimension) {
        return 0;
      }
      return (b[numericalDimension] || 0) - (a[numericalDimension] || 0);
    },
  );

  // Ref to store all feedback item refs
  const feedbackRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [ifHovered, setIfHovered] = useState(false);

  // Scroll to the hovered item when it changes
  useEffect(() => {
    if (!ifHovered) {
      if (hoveredItem) {
        const targetRef = feedbackRefs.current.get(hoveredItem);
        if (targetRef) {
          targetRef.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    }
  }, [hoveredItem]);

  return (
    <div className={cn(props.classes, "bg-gray-50 border-r border-gray-100")}>
      <div>
        {allFeedbackItems &&
          (allFeedbackItems.length > 0 ? (
            allFeedbackItems.map((item) => (
              <div
                key={item.id}
                ref={(el) => {
                  if (el) {
                    feedbackRefs.current.set(item.id, el);
                  } else {
                    feedbackRefs.current.delete(item.id);
                  }
                }}
                onMouseEnter={() => {
                  setHoveredItem(item.id);
                  setIfHovered(true);
                }}
                onMouseLeave={() => {
                  setHoveredItem(null);
                  setIfHovered(false);
                }}
              >
                <FeedbackCard
                  feedbackItem={item}
                  classes={cn(
                    "ring-offset-1 ring-offset-gray-50",
                    currentSelectedItems?.find((id) => id === item.id)
                      ? "ring-info ring-3"
                      : "",
                    hoveredItem === item.id
                      ? "ring-info ring-3 scale-[1.01] transition-all duration-150 ease-in-out"
                      : "",
                    currentRevision?.feedback.includes(item.id)
                      ? "ring-success ring-3"
                      : "",
                  )}
                  close={true}
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
