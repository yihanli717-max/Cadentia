import React, { useState, useRef, useEffect } from "react";
import { ProviderCard } from "@/components/ProviderGallery/ProviderCard";
import {
  useFeedbackStore,
  useSharedConfigStore,
  useFeedbackSourceStore,
} from "@/lib/store";
import { cn } from "@/lib/utils";
import { useContextMenu } from "react-contexify";
import "react-contexify/ReactContexify.css";
import ContextMenu from "@/components/ProviderGallery/ContextMenu";

const MENU_ID = "provider-context-menu";
const GENERATED_PROVIDER_IDS = new Set([100, 101]);

type ProviderGalleryProps = {
  classes?: string;
};

const ProviderGallery = (props: ProviderGalleryProps) => {
  const [ifClicked, setIfClicked] = useState(false);
  const [contextMenuText, setContextMenuText] = useState([
    "Select the entire feedback",
    "Remove the entire feedback",
  ]);
  // Use context menu from react-contexify
  const { show } = useContextMenu({ id: MENU_ID });

  const feedbackSource = useFeedbackSourceStore(
    (state) => state.feedbackSource,
  );
  const { hoveredItem, setHoveredProvider } = useSharedConfigStore();
  const allFeedbackItems = useFeedbackStore((state) => state.feedback);

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

        // Scroll to the source feedback item, ensure bottom of the item is visible
        if (targetElement) {
          setTimeout(() => {
            targetElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "nearest",
            });
          }, 500);
        }
      }
    }
  }, [hoveredItem, allFeedbackItems, isUserHovering]);

  return (
    <div className={cn(props.classes, "bg-base-100 border-l border-base-200")}>
      <div>
        {feedbackSource && feedbackSource.length > 0 ? (
          feedbackSource.filter((item) => GENERATED_PROVIDER_IDS.has(item.id)).map((item) => (
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
              onMouseLeave={() => {
                setIsUserHovering(false);
                setHoveredProvider(null);
              }}
              // onMouseUp={(e) => {
              //   e.stopPropagation();
              //   e.preventDefault();

              //   setIfClicked(true);
              //   setHoveredProvider(item.id);
              //   setTimeout(() => {
              //     show({
              //       id: MENU_ID,
              //       event: e, // pass the original mouse event
              //       props: {
              //         feedbackSource: item,
              //       },
              //     });
              //   }, 0);
              // }}
            >
              <ProviderCard feedbackSourceItem={item} isClicked={ifClicked} />
            </div>
          ))
        ) : (
          <p className="mx-6 text-sm text-base-300 select-none">
            No feedback available.
          </p>
        )}
        <ContextMenu
          contextMenuText={contextMenuText}
          setIfClicked={setIfClicked}
        />
      </div>
    </div>
  );
};

export default ProviderGallery;
