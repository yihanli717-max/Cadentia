import React, { useRef, useEffect, useState } from "react";
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  useAnimationControls,
} from "framer-motion";
import {
  useFeedbackStore,
  useSharedConfigStore,
  useRevisionListStore,
} from "@/lib/store";
import { getColor, typeMap, cn, eventTracker } from "@/lib/utils";
import { FeedbackItem } from "@/lib/type";

const D3_EASE = [0.645, 0.045, 0.355, 1];
const D3_TRANSITION = {
  type: "tween",
  ease: D3_EASE,
  duration: 0.6,
};

const ProgressRing = ({
  strokeWidth,
  circumference,
  isHovered,
  activeHoverId,
  thisId,
}: {
  strokeWidth: number;
  circumference: number;
  isHovered: boolean;
  activeHoverId: number | null;
  thisId: number;
}) => {
  const controls = useAnimationControls();
  const { hoveredItem, setHoveredItem, currentRevisionItem } =
    useSharedConfigStore();
  const revisionList = useRevisionListStore((state) => state.revisionList);
  const currentRevision = revisionList.find(
    (item) => item.id === currentRevisionItem,
  );

  useEffect(() => {
    if (isHovered) {
      controls.start({
        strokeDashoffset: 0,
        opacity: 1,
        transition: { duration: 0 },
      });
    } else {
      if (currentRevision?.feedback.includes(thisId)) {
        controls.start({
          strokeDashoffset: 0,
          opacity: 1,
          transition: { duration: 0 },
        });
      } else {
        controls.start({
          strokeDashoffset: circumference,
          opacity: 1,
          transition: { duration: 0 },
        });
      }
    }
  }, [isHovered, circumference, controls]);

  return (
    <motion.circle
      cx="50%"
      cy="50%"
      r="45%"
      fill="transparent"
      stroke={isHovered ? "#00b5ff" : "#00a86d"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={circumference}
      initial={{
        strokeDashoffset: circumference,
        opacity: 1,
      }}
      animate={controls}
      whileHover={
        !currentRevision?.feedback.includes(thisId)
          ? {
              stroke: "#00b5ff",
              strokeDashoffset: 0,
              opacity: 1,
              transition: {
                duration: 2,
                ease: D3_EASE,
                delay: isHovered ? 99999 : 0,
              },
            }
          : undefined
      }
      onMouseOver={() => {
        setHoveredItem(thisId);
        eventTracker({
          action: "hover on feedback in prepstation",
          data: { id: thisId },
        });
      }}
      onMouseLeave={() => {
        setHoveredItem(null);
      }}
    />
  );
};

const PrepStation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    clusterDimension,
    currentSelectedItems,
    updateCurrentSelectedItems,
    colorDimension,
    setHoveredItem,
    hoveredItem,
    bubbleRadii,
    currentRevisionItem,
  } = useSharedConfigStore();
  const allFeedback = useFeedbackStore((state) => state.feedback);
  const revisionList = useRevisionListStore((state) => state.revisionList);
  const currentRevision = revisionList.find(
    (item) => item.id === currentRevisionItem,
  );

  const [forceKey, setForceKey] = useState(0);
  const [activeHoverId, setActiveHoverId] = useState<number | null>(null);

  // Ref to store all feedback item refs
  const circleRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [ifHovered, setIfHovered] = useState(false);

  // Scroll to the hovered item when it changes
  useEffect(() => {
    if (!ifHovered) {
      if (hoveredItem) {
        const targetRef = circleRefs.current.get(hoveredItem);
        if (targetRef) {
          targetRef.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    }
  }, [hoveredItem, currentSelectedItems]);

  useEffect(() => {
    setForceKey((prev) => prev + 1);
  }, [bubbleRadii]);

  const allItems = currentSelectedItems.slice().reverse();
  const selectedFeedbacks = allItems
    .map((id) => allFeedback.find((fb) => fb.id === id))
    .filter((fb) => fb !== undefined);

  const cluseredFeedbacks = selectedFeedbacks.reduce(
    (acc, fb) => {
      if (!fb) return acc;

      const key = (fb[clusterDimension] as string).toLowerCase();

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(fb);
      return acc;
    },
    {} as { [key: string]: FeedbackItem[] },
  );

  // console.log("cluseredFeedbacks", cluseredFeedbacks);

  const bubbleVariants = {
    // Removed the hidden state to prevent initial enter animation
    visible: {
      scale: 1,
      opacity: 1,
    },
    exit: {
      scale: 0.6,
      opacity: 0,
      transition: D3_TRANSITION,
    },
  };

  const handleDragEnd = (
    id: number,
    info: { point: { x: number; y: number } },
  ) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const { x, y } = info.point;

    const buffer = 20;
    const isOutside =
      x < containerRect.left - buffer ||
      x > containerRect.right + buffer ||
      y < containerRect.top - buffer ||
      y > containerRect.bottom + buffer;

    if (isOutside) {
      eventTracker({
        action: "remove feedback from prepstation",
        data: {
          feedbackID: id,
        },
      });

      const { currentSelectedItems, setHoveredItem } =
        useSharedConfigStore.getState();

      if (currentSelectedItems.includes(id)) {
        updateCurrentSelectedItems(
          currentSelectedItems.filter((itemId) => itemId !== id),
        );
        setHoveredItem(null);
      }
    }
  };

  const getCircleProps = (radius: number) => {
    const strokeWidth = 2;
    const ringOffset = 3;
    const effectiveRadius = radius + ringOffset;
    const circumference = 2 * Math.PI * (effectiveRadius - strokeWidth);
    return {
      strokeWidth,
      center: effectiveRadius,
      circumference,
      viewBoxSize: effectiveRadius * 2,
      offset: ringOffset,
    };
  };

  return (
    <div className="absolute top-[68px] right-0 flex flex-col p-2 max-h-[450px] overflow-y-auto bg-base-100/50 select-none no-scrollbar">
      {Object.entries(
        Object.keys(typeMap).reduce(
          (acc, typeKey) => {
            // console.log("typeKey", typeKey);
            if (cluseredFeedbacks[typeKey]) {
              acc[typeKey] = cluseredFeedbacks[typeKey];
            }
            return acc;
          },
          {} as { [key: string]: FeedbackItem[] },
        ),
      ).map(([key, feedbacks]) => (
        <div
          key={key + Math.random()}
          className={cn(
            "flex flex-col w-12 gap-1 items-center transition-all duration-500 max-h-[67px] hover:max-h-60",
            feedbacks.find((fb) => fb?.id === hoveredItem) ? "max-h-60" : "",
          )}
        >
          <p className="text-2xs w-full text-center">
            {typeMap[key as keyof typeof typeMap]} ({feedbacks.length})
          </p>
          <div
            ref={containerRef}
            className="flex flex-col items-center gap-2 bg-white/40 backdrop-blur-lg overflow-y-auto w-10 py-2 no-scrollbar border-x border-base-200 max-h-24"
            key={`prepstation-${key}`}
          >
            <LayoutGroup>
              <AnimatePresence>
                {feedbacks.map((fb) => {
                  if (!fb) return null;
                  // const radius = bubbleRadii[fb.id] || 0;
                  const radius = 9;
                  const color = getColor(colorDimension)(
                    fb[colorDimension] as never,
                  );
                  const {
                    strokeWidth,
                    center,
                    circumference,
                    viewBoxSize,
                    offset,
                  } = getCircleProps(radius);
                  const isHovered = hoveredItem === fb.id;

                  return (
                    <motion.div
                      ref={(el) => {
                        if (el) {
                          circleRefs.current.set(fb.id, el);
                        } else {
                          circleRefs.current.delete(fb.id);
                        }
                      }}
                      key={fb.id + Math.random()}
                      layout
                      // Removed "initial" prop to prevent initial animation
                      animate="visible"
                      exit="exit"
                      variants={bubbleVariants}
                      className="flex-shrink-0 relative"
                      drag
                      dragSnapToOrigin
                      dragElastic={0.2}
                      onDragEnd={(_, info) => handleDragEnd(fb.id, info)}
                      style={{
                        width: radius * 2,
                        height: radius * 2,
                        borderRadius: "50%",
                        backgroundColor: color,
                        cursor: "grab",
                        zIndex: 9999,
                      }}
                      whileDrag={{
                        cursor: "grabbing",
                        scale: 1.05,
                      }}
                      onHoverStart={() => {
                        setActiveHoverId(fb.id);
                        setIfHovered(true);
                      }}
                      onHoverEnd={() => {
                        setActiveHoverId(null);
                        setHoveredItem(null);
                        setIfHovered(false);
                      }}
                    >
                      <motion.svg
                        width={viewBoxSize}
                        height={viewBoxSize}
                        className="absolute"
                        style={{
                          top: -offset,
                          left: -offset,
                          rotate: 0,
                        }}
                      >
                        <ProgressRing
                          strokeWidth={strokeWidth}
                          circumference={circumference + 8}
                          isHovered={isHovered}
                          activeHoverId={activeHoverId}
                          thisId={fb.id}
                        />
                      </motion.svg>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </LayoutGroup>
          </div>
          <hr className="bg-black" />
        </div>
      ))}
    </div>
  );
};

export default PrepStation;
