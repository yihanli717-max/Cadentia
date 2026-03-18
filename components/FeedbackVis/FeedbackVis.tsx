import React from "react";
import { cn } from "@/lib/utils";
import PrepStation from "@/components/FeedbackVis/PrepStation";
import RevisionTree from "@/components/FeedbackVis/RevisionTree";

interface FeedbackVisProps {
  classes?: string;
}

const FeedbackVis = (props: FeedbackVisProps) => {
  return (
    <div className={cn(props.classes, "relative")}>
      <RevisionTree />
      <PrepStation />
    </div>
  );
};

export default FeedbackVis;
