import React from "react";
import { StyledMenu } from "@/components/ContextMenu/StyledMenu";
import { Item } from "react-contexify";
import { useFeedbackStore, useSharedConfigStore } from "@/lib/store";

const MENU_ID = "sentence-context-menu";

interface SentenceContextMenuProps {
  contextMenuText: string[];
  setIfClicked: React.Dispatch<React.SetStateAction<boolean>>;
}

const SentenceContextMenu = (props: SentenceContextMenuProps) => {
  const allFeedback = useFeedbackStore((state) => state.feedback);
  const {
    setHoveredSentence,
    setCurrentSelectedItems,
    currentSelectedSentences,
    setCurrentSelectedSentences,
  } = useSharedConfigStore();

  const handleItemClick = (args: any) => {
    // console.log(args);
    const action = args.data?.action;
    const sentence = args.props?.sentence;

    if (!sentence) return;

    console.log("Action:", action, "Sentence ID:", sentence.id);

    const feedbackIDs = allFeedback
      .filter((item) => item.detection.includes(sentence.id))
      .map((item) => item.id);

    const currentSelectedItems =
      useSharedConfigStore.getState().currentSelectedItems;

    switch (action) {
      case "Select all relevant feedback":
        const mergedItems = Array.from(
          new Set([...currentSelectedItems, ...feedbackIDs]),
        );
        setCurrentSelectedItems(mergedItems);
        break;
      case "Remove all relevant feedback":
        const filteredItems = currentSelectedItems.filter(
          (id) => !feedbackIDs.includes(id),
        );
        setCurrentSelectedItems(filteredItems);
        break;
      case "Add to selected sentences":
        const newItems = Array.from(
          new Set([...currentSelectedSentences, sentence.id]),
        );
        setCurrentSelectedSentences(newItems);
        break;
      case "Remove from selected sentences":
        const removedItems = currentSelectedSentences.filter(
          (id) => id !== sentence.id,
        );
        setCurrentSelectedSentences(removedItems);
        break;
      default:
        break;
    }
  };

  const handleVisibilityChange = (isVisible: boolean) => {
    if (!isVisible) {
      console.log("isVisible");
      props.setIfClicked(false);
      setHoveredSentence(null);
    }
  };

  return (
    <StyledMenu
      id={MENU_ID}
      className="no-shadow-menu border text-2xs"
      theme="light"
      onVisibilityChange={handleVisibilityChange}
    >
      {props.contextMenuText.map((text, index) => (
        <Item key={index} onClick={handleItemClick} data={{ action: text }}>
          {text}
        </Item>
      ))}
    </StyledMenu>
  );
};

export default SentenceContextMenu;
