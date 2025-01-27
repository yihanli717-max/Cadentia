import React from "react";
import { cn } from "@/lib/utils";
import RevisionCard from "@/components/RevisionGallery/RevisionCard";

interface RevisionGalleryProps {
  classes?: string;
}

const RevisionGallery = (props: RevisionGalleryProps) => {
  return (
    <div
      className={cn(
        props.classes,
        "bg-white border-b border-gray-100 inline-flex gap-2 p-2",
      )}
    >
      <RevisionCard id={0} />
      <RevisionCard id={0} />
    </div>
  );
};

export default RevisionGallery;
