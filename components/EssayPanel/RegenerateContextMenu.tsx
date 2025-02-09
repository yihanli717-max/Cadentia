import React, { useRef, useEffect } from "react";
import { Menu, Item, useContextMenu } from "react-contexify";
import { useFeedbackStore, useSharedConfigStore } from "@/lib/store";

const MENU_ID = "regenerate-context-menu";

interface RegenerateContextMenuProps {}

const RegenerateContextMenu = (props: RegenerateContextMenuProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { hideAll } = useContextMenu();

  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const handleConfirm = () => {
    const value = inputRef.current?.value;
    console.log("Confirmed value:", value);
    hideAll();
  };

  return (
    <Menu
      id={MENU_ID}
      className="no-shadow-menu border text-2xs"
      theme="light"
      animation={false}
    >
      <div className="menu-input-wrapper p-1" onClick={handleInputClick}>
        <textarea
          placeholder="Prompt here"
          className="textarea textarea-bordered text-2xs w-full rounded"
          onClick={handleInputClick}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </div>
      <div className="flex justify-between p-1 -mt-2">
        <Item onClick={handleConfirm}>Regenerate</Item>
        <Item onClick={() => hideAll()}>Cancel</Item>
      </div>
    </Menu>
  );
};

export default RegenerateContextMenu;
