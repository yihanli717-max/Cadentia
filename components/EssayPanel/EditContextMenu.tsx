import React, { useEffect, useRef, useState } from "react";
import { Menu, Item, useContextMenu } from "react-contexify";
import {
  useFeedbackStore,
  useSharedConfigStore,
  useRevisionListStore,
} from "@/lib/store";

const MENU_ID = "edit-context-menu";

interface EditContextMenuProps {
  sentence: string;
}

const EditContextMenu = (props: EditContextMenuProps) => {
  const { currentRevisionItem } = useSharedConfigStore();
  const { revisionList, updateRevisedSentence } = useRevisionListStore();
  const revisionObject = revisionList.find(
    (item) => item.id === currentRevisionItem,
  );
  const currentRevisedSentencePair =
    revisionObject &&
    revisionObject.revision.find((item) => item.original === props.sentence);

  const [inputValue, setInputValue] = useState("");

  const { hideAll } = useContextMenu();

  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setInputValue(e.currentTarget.textContent || "");
  };

  const handleConfirm = () => {
    // console.log("Confirmed value:", inputValue);
    updateRevisedSentence(
      currentRevisionItem,
      props.sentence,
      inputValue || "",
    );
    hideAll();
  };

  useEffect(() => {
    // console.log(
    //   "currentRevisedSentencePair",
    //   currentRevisedSentencePair?.revised,
    // );
    setInputValue(
      currentRevisedSentencePair ? currentRevisedSentencePair.revised : "",
    );
  }, [currentRevisedSentencePair]);

  return (
    <Menu
      id={MENU_ID}
      className="no-shadow-menu border text-2xs"
      theme="light"
      animation={false}
    >
      <div className="menu-input-wrapper p-1" onClick={handleInputClick}>
        <textarea
          value={inputValue}
          placeholder="Type here"
          className="textarea textarea-bordered text-2xs w-full rounded p-2 h-24"
          onChange={(e) => setInputValue(e.target.value)}
        />
      </div>

      <div className="flex justify-between p-1 -mt-2">
        <Item onClick={handleConfirm}>Confirm</Item>
        <Item onClick={() => hideAll()}>Cancel</Item>
      </div>
    </Menu>
  );
};

export default EditContextMenu;
