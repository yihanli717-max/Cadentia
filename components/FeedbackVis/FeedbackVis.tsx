import React from "react";
import { cn } from "@/lib/utils";
import Menu from "@/components/FeedbackVis/Menu";
import PrepStation from "@/components/FeedbackVis/PrepStation";
import RevisionTree from "@/components/FeedbackVis/RevisionTree";

interface FeedbackVisProps {
  classes?: string;
}

const FeedbackVis = (props: FeedbackVisProps) => {
  return (
    <div className={cn(props.classes, "relative")}>
      <Menu classes="absolute top-0 left-1" />
      <RevisionTree />
      <PrepStation />
    </div>
  );
};

export default FeedbackVis;
