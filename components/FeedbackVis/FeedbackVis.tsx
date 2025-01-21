import React from "react";
import { cn } from "@/lib/utils";

interface FeedbackVisProps {
  classes?: string;
}

const FeedbackVis = (props: FeedbackVisProps) => {
  return <div className={cn(props.classes, "bg-white")}>FeedbackVis</div>;
};

export default FeedbackVis;
