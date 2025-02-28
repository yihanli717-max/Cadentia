import React, { useEffect, useMemo, useState } from "react";
import { cn, eventTracker } from "@/lib/utils";
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
import { TbCheck, TbEdit, TbRefresh } from "react-icons/tb";

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
    "Select all feedback bubbles for this sentence",
    "Remove all feedback bubbles for this sentence",
    "Select this sentence",
    "Remove this sentence",
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
    setCurrentSelectedSentences,
    currentReferenceSentence,
    setCurrentReferenceSentence,
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
          " font-normal border-r border-base-200 text-neutral flex flex-col select-none bg-white relative h-screen",
      )}
    >
      <div className="h-[3rem] px-4 bg-white text-neutral flex flex-row items-center gap-2 absolute top-[3rem] z-50 w-full justify-between">
        <p className="font-semibold text-lg">My Essay</p>
        <div className="form-control">
          <label className="label cursor-pointer space-x-2">
            <span className="label-text text-xs ">
              Compare to Orginal Essay
            </span>
            <input
              type="checkbox"
              className="toggle toggle-sm"
              checked={comparisonMode}
              onChange={() => {
                eventTracker({
                  action: "toggle comparison mode",
                  data: {
                    mode: !comparisonMode,
                  },
                });
                setComparisonMode(!comparisonMode);
              }}
            />
          </label>
        </div>
      </div>
      <div className="text-xs leading-relaxed p-4 pt-24 overflow-y-auto relative grow">
        {Object.entries(paragraphs).map(
          ([paragraph, sections], index, array) => (
            <div
              key={paragraph}
              className={cn(
                (index < array.length - 1 ? "mb-6 " : "") + "cursor-pointer",
                // if the last one, add margin bottom
                index === array.length - 1 ? "mb-96" : "",
              )}
            >
              {sections.map((section) => (
                <React.Fragment key={`section-${section.id}`}>
                  <span
                    id={section.id.toString()}
                    className={cn(
                      "transition-all duration-150 ease-in-out",
                      hoveredSentence === section.id ||
                        allFeedback
                          .find((item) => item.source === hoveredProvider)
                          ?.detection.includes(section.id) ||
                        highlightSentences.has(section.content)
                        ? "bg-sky-100 underline"
                        : "",
                      hoveredSentence === section.id ? "underline" : "",
                      // if the sentence is the last one in the currentSelectedSentences
                      currentReferenceSentence === section.id
                        ? "underline"
                        : "",
                      currentSelectedSentences.includes(section.id) &&
                        "bg-sky-100",
                      currentSelectedSentences.includes(section.id) &&
                        "bg-sky-100" &&
                        revisionObject?.revision.find(
                          (item) => item.original === section.content,
                        ) &&
                        "bg-green-100",
                    )}
                    onMouseEnter={() => {
                      setHoveredSentence(section.id);
                      eventTracker({
                        action: "hover on sentence",
                        data: {
                          sentence: section.id,
                        },
                      });
                    }}
                    onMouseLeave={() => {
                      // console.log("ifClicked", ifClicked);
                      if (!ifClicked) setHoveredSentence(null);
                    }}
                    // onMouseUp={(e) => {
                    //   // console.log("11", ifClicked);
                    //   e.stopPropagation();
                    //   e.preventDefault();

                    //   setIfClicked(true);
                    //   setHoveredSentence(section.id);
                    //   setTimeout(() => {
                    //     showSentenceMenu({
                    //       id: SENTENCE_MENU_ID,
                    //       event: e, // pass the original mouse event
                    //       props: {
                    //         sentence: section,
                    //       },
                    //     });
                    //   }, 0);
                    // }}
                    onClick={(event) => {
                      // if shift key is pressed, then set the reference sentence
                      if (event.shiftKey) {
                        if (currentReferenceSentence === section.id) {
                          setCurrentReferenceSentence(null);
                        } else {
                          setCurrentReferenceSentence(section.id);
                        }

                        eventTracker({
                          action: "set reference sentence",
                          data: {
                            sentence: section.id,
                          },
                        });

                        return;
                      }

                      if (!currentSelectedSentences.includes(section.id)) {
                        setCurrentSelectedSentences([
                          ...currentSelectedSentences,
                          section.id,
                        ]);
                      } else {
                        setCurrentSelectedSentences(
                          currentSelectedSentences.filter(
                            (id) => id !== section.id,
                          ),
                        );
                      }
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
                      {/* <span className="size-4 border bg-white rounded-sm join-item flex items-center justify-center text-neutral hover:bg-base-200 active:scale-90 transition-all duration-150 ease-in-out">
                        <TbCheck size={12} />
                      </span> */}
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
                          eventTracker({
                            action: "click on edit",
                            data: {
                              sentence: section.id,
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
                          eventTracker({
                            action: "click on regenerate",
                            data: {
                              sentence: section.id,
                            },
                          });
                        }}
                      >
                        <TbRefresh size={12} />
                      </span>
                    </span>
                  )}
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
