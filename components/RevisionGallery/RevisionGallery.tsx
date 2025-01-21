import React from "react";
import { cn } from "@/lib/utils";

interface RevisionGalleryProps {
  classes?: string;
}

const RevisionGallery = (props: RevisionGalleryProps) => {
  return (
    <div className={cn(props.classes, "bg-white border-b border-gray-100")}>
      RevisionGallery
    </div>
  );
};

export default RevisionGallery;
