import React from "react";
import { cn } from "@/lib/utils";
import { useRevisionListStore, useSharedConfigStore } from "@/lib/store";
import ProviderCard from "@/components/ProviderGallery/ProviderCard";
import { TbPlus } from "react-icons/tb";

interface ProviderGalleryProps {
  classes?: string;
}

const ProviderGallery = (props: ProviderGalleryProps) => {
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
        "bg-white border-b border-gray-100 flex overflow-x-auto gap-2 p-2 no-scrollbar",
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
            className="text-gray-300 group-hover:text-gray-600"
          />
        </div>

        {/* <p className="w-full flex justify-center items-center text-xs text-gray-400 absolute bottom-2 left-0">
          Click to Create a New Revision
        </p> */}
      </div>
      {revisionList
        .slice()
        .reverse()
        .map((item) => (
          <ProviderCard
            key={item.id}
            id={item.id}
            classes="flex-shrink-0 w-52"
          />
        ))}
    </div>
  );
};

export default ProviderGallery;
