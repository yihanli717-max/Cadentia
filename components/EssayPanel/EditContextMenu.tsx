import React, { useEffect, useRef, useState } from "react";
import { StyledMenu } from "@/components/ContextMenu/StyledMenu";
import { Item, useContextMenu } from "react-contexify";
import { useSharedConfigStore, useRevisionListStore } from "@/lib/store";
import { eventTracker } from "@/lib/utils";

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
    eventTracker({
      action: "update revised sentence by edit",
      data: {
        sentence: props.sentence,
        prevRevision:
          currentRevisedSentencePair && currentRevisedSentencePair.revised,
        newRevision: inputValue,
      },
    });
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
    <StyledMenu
      id={MENU_ID}
      className="no-shadow-menu border text-2xs"
      theme="light"
      animation={false}
      preventDefaultOnKeydown={true}
    >
      <div className="menu-input-wrapper p-1" onClick={handleInputClick}>
        <textarea
          value={inputValue}
          placeholder="Type here"
          className="textarea textarea-bordered text-2xs w-full rounded p-2 h-24"
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
        />
      </div>

      <div className="flex justify-between p-1">
        <Item onClick={handleConfirm}>Confirm</Item>
        <Item onClick={() => hideAll()}>Cancel</Item>
      </div>
    </StyledMenu>
  );
};

export default EditContextMenu;
