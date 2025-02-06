import React, { useState, useRef, useEffect } from "react";
import { ProviderCard } from "@/components/ProviderGallery/ProviderCard";
import {
  useFeedbackStore,
  useSharedConfigStore,
  useRevisionListStore,
} from "@/lib/store";
import { feedbackSource } from "@/data/source";
import { cn } from "@/lib/utils";

type ProviderGalleryProps = {
  classes?: string;
};

const ProviderGallery = (props: ProviderGalleryProps) => {
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

  const allFeedbackItems = useFeedbackStore((state) => state.feedback);
  const revisionList = useRevisionListStore((state) => state.revisionList);
  const currentRevision = revisionList.find(
    (item) => item.id === currentRevisionItem,
  );

  const feedbackRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [isUserHovering, setIsUserHovering] = useState(false);
  const targetFeedback = allFeedbackItems.find(
    (item) => item.id === hoveredItem,
  );

  useEffect(() => {
    if (!isUserHovering && hoveredItem) {
      // Find the target feedback item

      if (targetFeedback) {
        // Find the source feedback item
        const sourceId = targetFeedback.source;
        const targetElement = feedbackRefs.current.get(sourceId);

        // Scroll to the source feedback item
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }
    }
  }, [hoveredItem, allFeedbackItems, isUserHovering]);

  return (
    <div className={cn(props.classes, "bg-base-100 border-r border-base-200")}>
      <div>
        {feedbackSource && feedbackSource.length > 0 ? (
          feedbackSource.map((item) => (
            <div
              key={item.id}
              ref={(el) => {
                if (el) {
                  feedbackRefs.current.set(item.id, el);
                } else {
                  feedbackRefs.current.delete(item.id);
                }
              }}
              onMouseEnter={() => setIsUserHovering(true)}
              onMouseLeave={() => setIsUserHovering(false)}
            >
              <ProviderCard feedbackSourceItem={item} />
            </div>
          ))
        ) : (
          <p className="mx-6 text-sm text-base-300 select-none">
            No feedback available.
          </p>
        )}
      </div>
    </div>
  );
};

export default ProviderGallery;
