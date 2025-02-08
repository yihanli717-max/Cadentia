import React from "react";
import { Menu, Item } from "react-contexify";
import { useFeedbackStore, useSharedConfigStore } from "@/lib/store";

const MENU_ID = "provider-context-menu";

interface ContextMenuProps {
  contextMenuText: string[];
  setIfClicked: React.Dispatch<React.SetStateAction<boolean>>;
}

const ContextMenu = (props: ContextMenuProps) => {
  const allFeedback = useFeedbackStore((state) => state.feedback);
  const { setCurrentSelectedItems, setHoveredProvider } =
    useSharedConfigStore();

  const handleItemClick = (args: any) => {
    // console.log(args);
    const action = args.data?.action;
    const feedbackSource = args.props?.feedbackSource;

    if (!feedbackSource) return;

    console.log("Action:", action, "Provider ID:", feedbackSource.id);

    const feedbackIDs = allFeedback
      .filter((item) => item.source === feedbackSource.id)
      .map((item) => item.id);

    const currentSelectedItems =
      useSharedConfigStore.getState().currentSelectedItems;

    switch (action) {
      case "Select all relevant feedback":
        // console.log("Select all relevant feedback:", feedbackIDs);
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
      default:
        break;
    }

    setHoveredProvider(null);
    props.setIfClicked(false);
  };

  return (
    <Menu id={MENU_ID} className="no-shadow-menu border text-xs" theme="light">
      {props.contextMenuText.map((text, index) => (
        <Item key={index} onClick={handleItemClick} data={{ action: text }}>
          {text}
        </Item>
      ))}
    </Menu>
  );
};

export default ContextMenu;
