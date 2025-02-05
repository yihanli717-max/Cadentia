import React from "react";
import { cn } from "@/lib/utils";
import { useSharedConfigStore } from "@/lib/store";
import ClusterLegend from "@/components/FeedbackVis/Legend/ClusterLegend";
import SequentialLegend from "@/components/FeedbackVis/Legend/SequentialLegend";
import SizeLegend from "@/components/FeedbackVis/Legend/SizeLegend";

interface LegendProps {
  classes?: string;
  minR: number;
  maxR: number;
}

const Legend = (props: LegendProps) => {
  const { colorDimension } = useSharedConfigStore();

  const isSequential = colorDimension === "sentiment";

  return (
    <div className={cn(props.classes, "flex flex-col space-y-5 select-none")}>
      {isSequential ? (
        <SequentialLegend colorDimension={colorDimension} />
      ) : (
        <ClusterLegend colorDimension={colorDimension} />
      )}
      <SizeLegend minR={props.minR} maxR={props.maxR} />
    </div>
  );
};

export default Legend;
