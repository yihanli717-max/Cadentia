import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  useEssayStore,
  useFeedbackStore,
  useSharedConfigStore,
  useRevisionListStore,
} from "@/lib/store";
import { Sentence } from "@/lib/type";
import TextDiff from "@/components/EssayPanel/TextDiff";
import { useContextMenu } from "react-contexify";
import "react-contexify/ReactContexify.css";
import SentenceContextMenu from "@/components/EssayPanel/SentenceContextMenu";
import EditContextMenu from "@/components/EssayPanel/EditContextMenu";
import RegenerateContextMenu from "@/components/EssayPanel/RegenerateContextMenu";
import { TbEdit, TbRefresh } from "react-icons/tb";

const SENTENCE_MENU_ID = "sentence-context-menu";
const EDIT_MENU_ID = "edit-context-menu";
const REGENERATE_MENU_ID = "regenerate-context-menu";

interface EssayPanelProps {
  classes?: string;
}

const EssayPanel = (props: EssayPanelProps) => {
  const [ifClicked, setIfClicked] = useState(false);
  const [clickedSentence, setClickedSentence] = useState<string | null>(null);
  const [contextMenuText, setContextMenuText] = useState([
    "Select all relevant feedback",
    "Remove all relevant feedback",
    "Add to selected sentences",
    "Remove from selected sentences",
  ]);
  // Use context menu from react-contexify
  const { show: showSentenceMenu } = useContextMenu({ id: SENTENCE_MENU_ID });
  const { show: showEditMenu } = useContextMenu({ id: EDIT_MENU_ID });
  const { show: showRegenerateMenu } = useContextMenu({
    id: REGENERATE_MENU_ID,
  });

  const essay = useEssayStore((state) => state.essay);
  const {
    hoveredProvider,
    hoveredItem,
    hoveredSentence,
    currentSelectedItems,
    currentRevisionItem,
    comparisonMode,
    setComparisonMode,
    setHoveredSentence,
    currentSelectedSentences,
  } = useSharedConfigStore();

  const revisionList = useRevisionListStore((state) => state.revisionList);
  const revisionObject = revisionList.find(
    (item) => item.id === currentRevisionItem,
  );

  const allFeedback = useFeedbackStore((state) => state.feedback);
  const hoveredFeedback = useMemo(
    () => allFeedback.find((item) => item.id === hoveredItem),
    [allFeedback, hoveredItem],
  );
  const highlightSentences = useMemo(() => {
    // iterate through hoveredFeedback's plan and get all sentences
    const sentences = new Set<string>();
    hoveredFeedback?.detection.map((id) => {
      sentences.add(essay.find((item) => item.id === id)?.content || "");
    });
    return sentences;
  }, [hoveredFeedback, essay]);

  const paragraphs = useMemo(() => {
    return essay.reduce(
      (acc, curr) => {
        acc[curr.paragraph] = acc[curr.paragraph] || [];
        acc[curr.paragraph].push(curr);
        return acc;
      },
      {} as Record<number, Sentence[]>,
    );
  }, [essay]);

  return (
    <div
      className={cn(
        props.classes +
          " font-normal border-l border-base-200 text-neutral flex flex-col select-none bg-white relative h-screen",
      )}
    >
      <div className="h-14 px-8 bg-white text-neutral flex flex-row items-center gap-2 absolute top-14 z-50 w-full justify-between">
        <p className="font-semibold text-xl">My Essay</p>
        <div className="form-control">
          <label className="label cursor-pointer space-x-2">
            <span className="label-text text-xs ">
              Compare to Orginal Essay
            </span>
            <input
              type="checkbox"
              className="toggle toggle-sm"
              checked={comparisonMode}
              onChange={() => setComparisonMode(!comparisonMode)}
            />
          </label>
        </div>
      </div>
      <div className="text-xs leading-relaxed p-8 pt-28 overflow-y-auto relative grow">
        {Object.entries(paragraphs).map(
          ([paragraph, sections], index, array) => (
            <div
              key={paragraph}
              className={
                (index < array.length - 1 ? "mb-6 " : "") + "cursor-pointer"
              }
            >
              {sections.map((section) => (
                <React.Fragment key={`section-${section.id}`}>
                  <span
                    id={section.id.toString()}
                    className={cn(
                      currentSelectedSentences.includes(section.id) &&
                        "bg-sky-100",
                      revisionObject?.revision.find(
                        (item) => item.original === section.content,
                      ) && "bg-green-100",
                      "transition-all duration-150 ease-in-out",
                      hoveredSentence === section.id ||
                        allFeedback
                          .find((item) => item.source === hoveredProvider)
                          ?.detection.includes(section.id) ||
                        highlightSentences.has(section.content)
                        ? "bg-sky-100"
                        : "",
                      hoveredSentence === section.id ? "underline" : "",
                    )}
                    onMouseEnter={() => setHoveredSentence(section.id)}
                    onMouseLeave={() => {
                      console.log("ifClicked", ifClicked);
                      if (!ifClicked) setHoveredSentence(null);
                    }}
                    onMouseUp={(e) => {
                      // console.log("11", ifClicked);
                      e.stopPropagation();
                      e.preventDefault();

                      setIfClicked(true);
                      setHoveredSentence(section.id);
                      setTimeout(() => {
                        showSentenceMenu({
                          id: SENTENCE_MENU_ID,
                          event: e, // pass the original mouse event
                          props: {
                            sentence: section,
                          },
                        });
                      }, 0);
                    }}
                  >
                    {comparisonMode ? (
                      // if senction.content exit in revisionObject's revision's orginal, then show the text diff via TextDiff component
                      revisionObject &&
                      revisionObject.revision.find(
                        (item) => item.original === section.content,
                      ) ? (
                        <TextDiff
                          oldText={
                            revisionObject?.revision.find(
                              (item) => item.original === section.content,
                            )?.original || ""
                          }
                          newText={
                            revisionObject?.revision.find(
                              (item) => item.original === section.content,
                            )?.revised || ""
                          }
                        />
                      ) : (
                        section.content + " "
                      )
                    ) : (
                      // if senction.content exit in revisionObject's revision's orginal, then show the revision content
                      (revisionObject?.revision.find(
                        (item) => item.original === section.content,
                      )?.revised || section.content) + " "
                    )}
                  </span>
                  {revisionObject?.revision.find(
                    (item) => item.original === section.content,
                  )?.revised && (
                    // <span className="text-xs opacity-60">[edited]</span>
                    <span className="inline-flex translate-y-[1px] ml-[3px]">
                      <span
                        className="size-4 border bg-white rounded-sm join-item flex items-center justify-center text-neutral hover:bg-base-200 active:scale-90 transition-all duration-150 ease-in-out"
                        onClick={(e) => {
                          console.log("clicked", section.content);
                          setClickedSentence(section.content);
                          showEditMenu({
                            id: EDIT_MENU_ID,
                            event: e, // pass the original mouse event
                            props: {
                              sentence: section,
                            },
                          });
                        }}
                      >
                        <TbEdit size={12} />
                      </span>

                      <span
                        className="size-4 border bg-white rounded-sm join-item flex items-center justify-center text-neutral hover:bg-base-200 active:scale-90 transition-all duration-150 ease-in-out"
                        onClick={(e) => {
                          console.log("clicked", section.content);
                          setClickedSentence(section.content);
                          showRegenerateMenu({
                            id: REGENERATE_MENU_ID,
                            event: e, // pass the original mouse event
                            props: {
                              sentence: section,
                            },
                          });
                        }}
                      >
                        <TbRefresh size={12} />
                      </span>
                    </span>
                  )}{" "}
                </React.Fragment>
              ))}
            </div>
          ),
        )}
      </div>

      <SentenceContextMenu
        contextMenuText={contextMenuText}
        setIfClicked={setIfClicked}
      />
      {clickedSentence && <EditContextMenu sentence={clickedSentence} />}
      {clickedSentence && <RegenerateContextMenu sentence={clickedSentence} />}
    </div>
  );
};

export default EssayPanel;
