import React from "react";
import { cn } from "@/lib/utils";
import { useSharedConfigStore } from "@/lib/store";
import ClusterLegend from "@/components/FeedbackVis/Legend/ClusterLegend";
import SequentialLegend from "@/components/FeedbackVis/Legend/SequentialLegend";

interface LegendProps {
  classes?: string;
}

const Legend = (props: LegendProps) => {
  const [clusterDimension, numericalDimension, colorDimension] =
    useSharedConfigStore((state) => [
      state.clusterDimension,
      state.numericalDimension,
      state.colorDimension,
    ]);

  const isSequential = colorDimension === "sentiment";

  return (
    <div className={cn(props.classes, "flex flex-col space-y-2 select-none")}>
      {isSequential ? (
        <SequentialLegend colorDimension={colorDimension} />
      ) : (
        <ClusterLegend colorDimension={colorDimension} />
      )}
    </div>
  );
};

export default Legend;
