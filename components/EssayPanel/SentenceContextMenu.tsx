import React from "react";
import { StyledMenu } from "@/components/ContextMenu/StyledMenu";
import { Item } from "react-contexify";
import { useFeedbackStore, useSharedConfigStore } from "@/lib/store";
import { eventTracker } from "@/lib/utils";

const MENU_ID = "sentence-context-menu";

interface SentenceContextMenuProps {
  contextMenuText: string[];
  setIfClicked: React.Dispatch<React.SetStateAction<boolean>>;
}

const SentenceContextMenu = (props: SentenceContextMenuProps) => {
  const allFeedback = useFeedbackStore((state) => state.feedback);
  const {
    setHoveredSentence,
    updateCurrentSelectedItems,
    currentSelectedSentences,
    setCurrentSelectedSentences,
    currentRemovedSentences,
    setCurrentRemovedSentences,
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
      case "Select all feedback bubbles for this sentence":
        const mergedItems = Array.from(
          new Set([...currentSelectedItems, ...feedbackIDs]),
        );
        updateCurrentSelectedItems(mergedItems);
        eventTracker({
          action: "select all relevant feedback for sentence",
          data: {
            feedbackIDs,
            sentenceID: sentence.id,
          },
        });
        break;
      case "Remove all feedback bubbles for this sentence":
        const filteredItems = currentSelectedItems.filter(
          (id) => !feedbackIDs.includes(id),
        );
        updateCurrentSelectedItems(filteredItems);
        eventTracker({
          action: "remove all relevant feedback for sentence",
          data: {
            feedbackIDs,
            sentenceID: sentence.id,
          },
        });
        break;
      case "Select this sentence":
        // Add to currentSelectedSentences
        let newItems = Array.from(
          new Set([...currentSelectedSentences, sentence.id]),
        );
        setCurrentSelectedSentences(newItems);

        // Remove from currentRemovedSentences
        newItems = currentRemovedSentences.filter((id) => id !== sentence.id);
        setCurrentRemovedSentences(newItems);

        eventTracker({
          action: "add sentence to selected sentences",
          data: {
            sentenceID: sentence.id,
            selectedSentences: newItems,
          },
        });
        break;
      case "Remove this sentence":
        // Remove from currentSelectedSentences
        let removedItems = currentSelectedSentences.filter(
          (id) => id !== sentence.id,
        );
        setCurrentSelectedSentences(removedItems);

        // Add to currentRemovedSentences
        removedItems = Array.from(
          new Set([...currentRemovedSentences, sentence.id]),
        );
        setCurrentRemovedSentences(removedItems);

        eventTracker({
          action: "remove sentence from selected sentences",
          data: {
            sentenceID: sentence.id,
            removedSentences: removedItems,
          },
        });
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
