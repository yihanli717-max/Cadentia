import React from "react";
import { cn } from "@/lib/utils";
import { useRevisionListStore, useSharedConfigStore } from "@/lib/store";
import RevisionCard from "@/components/RevisionGallery/RevisionCard";
import { TbPlus } from "react-icons/tb";

interface RevisionGalleryProps {
  classes?: string;
}

const RevisionGallery = (props: RevisionGalleryProps) => {
  const [setCurrentSelectedItems, setHoveredItem, setCurrentRevisionItem] =
    useSharedConfigStore((state) => [
      state.setCurrentSelectedItems,
      state.setHoveredItem,
      state.setCurrentRevisionItem,
    ]);
  const [revisionList, createRevision] = useRevisionListStore((state) => [
    state.revisionList,
    state.createRevision,
  ]);

  return (
    <div
      className={cn(
        props.classes,
        "w-full h-[170px] bg-white border-b border-base-200 flex overflow-x-auto gap-2 p-2 no-scrollbar",
      )}
    >
      <div
        className="flex-shrink-0 w-52 p-3 border rounded-lg bg-neutral-50 flex flex-col justify-between border-dashed cursor-pointer relative hover:border-2 hover:border-solid transition-all duration-150 ease-in-out group"
        onClick={() => {
          createRevision();
          setCurrentSelectedItems([]);
          setHoveredItem(null);
          setCurrentRevisionItem(revisionList.length);
        }}
      >
        <div className="w-full flex justify-center items-center h-full">
          <TbPlus
            size={36}
            className="text-base-300 group-hover:opacity-60 font-medium"
          />
        </div>

        {/* <p className="w-full flex justify-center items-center text-xs text-base-300 absolute bottom-2 left-0">
          Click to Create a New Revision
        </p> */}
      </div>
      {revisionList
        .slice()
        .reverse()
        .map((item) => (
          <RevisionCard key={item.id} id={item.id} classes="flex-shrink-0" />
        ))}
    </div>
  );
};

export default RevisionGallery;
