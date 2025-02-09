import React, { useEffect, useRef, useState } from "react";
import { Menu, Item, useContextMenu } from "react-contexify";
import { useSharedConfigStore, useRevisionListStore } from "@/lib/store";
import { Regenerate } from "@/lib/utils";

const MENU_ID = "regenerate-context-menu";

interface RegenerateContextMenuProps {
  sentence: string;
}

const RegenerateContextMenu = (props: RegenerateContextMenuProps) => {
  const { currentRevisionItem } = useSharedConfigStore();
  const { revisionList, updateRevisedSentence } = useRevisionListStore();
  const revisionObject = revisionList.find(
    (item) => item.id === currentRevisionItem,
  );
  const currentRevisedSentencePair =
    revisionObject &&
    revisionObject.revision.find((item) => item.original === props.sentence);

  const [inputValue, setInputValue] = useState("");
  const [output, setOutput] = useState("");

  const { hideAll } = useContextMenu();

  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const handleRegenerate = async () => {
    if (revisionObject?.conversation === undefined) return;
    const prompt =
      "Further revise the sentence: " +
      currentRevisedSentencePair?.revised +
      "\n" +
      inputValue;
    console.log("Prompt:", prompt);
    await Regenerate(revisionObject?.conversation, prompt).then((res) => {
      console.log("Regenerated value:", res);

      if (res) {
        setOutput(JSON.parse(res).revision[0].revised);
        console.log("Regenerated value:", JSON.parse(res).revision[0].revised);
      }
    });
  };

  const handleConfirm = () => {
    updateRevisedSentence(currentRevisionItem, props.sentence, output || "");
    handleCancel();
  };

  const handleCancel = () => {
    setInputValue("");
    setOutput("");
    hideAll();
  };

  const handleVisibilityChange = (isVisible: boolean) => {
    setInputValue("");
    setOutput("");
  };

  return (
    <Menu
      id={MENU_ID}
      className="no-shadow-menu border text-2xs"
      theme="light"
      animation={false}
      preventDefaultOnKeydown={true}
      onVisibilityChange={handleVisibilityChange}
    >
      <div
        className="menu-input-wrapper p-1 max-w-64"
        onClick={handleInputClick}
      >
        <textarea
          value={inputValue}
          placeholder="Type here"
          className="textarea textarea-bordered text-2xs w-full rounded p-2 h-24"
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
        />

        {output && (
          <div className="bg-blue-100 text-blue-800 text-2xs px-2 py-2 rounded  w-full max-h-32 overflow-y-auto no-scrollbar">
            <span className="font-medium">Output:</span> {output}
          </div>
        )}
      </div>

      <div className="flex justify-between p-1">
        <Item closeOnClick={false} onClick={handleRegenerate}>
          Regenerate
        </Item>
        <Item onClick={handleConfirm}>Confirm</Item>
        <Item onClick={handleCancel}>Cancel</Item>
      </div>
    </Menu>
  );
};

export default RegenerateContextMenu;
