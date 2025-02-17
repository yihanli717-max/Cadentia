import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useSharedConfigStore } from "@/lib/store";
import ClusterLegend from "@/components/FeedbackVis/Legend/ClusterLegend";
import SequentialLegend from "@/components/FeedbackVis/Legend/SequentialLegend";
import SizeLegend from "@/components/FeedbackVis/Legend/SizeLegend";
import {
  TbLayoutBottombarCollapseFilled,
  TbLayoutBottombarExpandFilled,
} from "react-icons/tb";

interface LegendProps {
  classes?: string;
  minR: number;
  maxR: number;
}

const Legend = (props: LegendProps) => {
  const { colorDimension, numericalDimension } = useSharedConfigStore();
  const isSequential = colorDimension === "sentiment";

  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div
      className={cn(
        props.classes,
        "flex flex-col select-none bg-white/40 backdrop-blur-lg border border-base-200 rounded-lg p-2 px-3",
        isCollapsed ? "" : "pt-4 space-y-3",
      )}
    >
      {(numericalDimension !== "none" || colorDimension !== "none") && (
        <div
          className={cn(
            "cursor-pointer flex justify-start items-start opacity-40 hover:opacity-100 transition-all duration-150 ease-in-out",
            isCollapsed ? "" : "absolute top-2 left-2",
          )}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <div className="flex flex-row gap-1 items-center">
              <TbLayoutBottombarExpandFilled size={18} />
              <p className="text-2xs font-medium">Click to show full legend</p>
            </div>
          ) : (
            <div className="flex flex-row gap-1 items-center">
              <TbLayoutBottombarCollapseFilled size={18} />
              <p className="text-2xs font-medium">Click to hide legend</p>
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          "transition-all duration-300 ease-in-out flex flex-col ",
          isCollapsed ? "space-y-2" : "space-y-3",
        )}
      >
        {numericalDimension !== "none" && (
          <SizeLegend
            minR={props.minR}
            maxR={props.maxR}
            classes={isCollapsed ? "hidden" : "flex relative"}
          />
        )}
        <hr className={cn("border-dashed", isCollapsed ? "" : "")} />
        {colorDimension !== "none" && (
          <>
            {isSequential ? (
              <SequentialLegend colorDimension={colorDimension} />
            ) : (
              <ClusterLegend colorDimension={colorDimension} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Legend;
