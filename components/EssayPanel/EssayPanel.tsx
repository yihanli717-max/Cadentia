import React, { useEffect, useMemo, useState } from "react";
import { cn, eventTracker } from "@/lib/utils";
import {
  useEssayStore,
  useFeedbackStore,
  useFeedbackSourceStore,
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
const READABILITY_SOURCE_ID = 100;
const PSYCH_SOURCE_ID = 101;

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
  const setEssay = useEssayStore((state) => state.setEssay);
  const [isEditingEssay, setIsEditingEssay] = useState(true);
  const [essayInput, setEssayInput] = useState("");
  const [essayInputError, setEssayInputError] = useState<string | null>(null);
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

  const formatEssayForInput = (sentences: Sentence[]) => {
    if (!sentences.length) return "";
    const paragraphMap = new Map<number, string[]>();
    sentences.forEach((sentence) => {
      if (!paragraphMap.has(sentence.paragraph)) {
        paragraphMap.set(sentence.paragraph, []);
      }
      paragraphMap.get(sentence.paragraph)?.push(sentence.content.trim());
    });
    return Array.from(paragraphMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, items]) => items.filter(Boolean).join(" "))
      .join("\n\n");
  };

  const splitParagraphIntoSentences = (paragraphText: string): string[] => {
    const normalized = paragraphText.replace(/\s+/g, " ").trim();
    if (!normalized) return [];
    const matches = normalized.match(/[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g);
    if (!matches || matches.length === 0) return [normalized];
    return matches.map((item) => item.trim()).filter(Boolean);
  };

  const parseEssayInputToSentences = (inputText: string): Sentence[] => {
    const paragraphs = inputText
      .split(/\n\s*\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    let sentenceId = 1;
    const parsed: Sentence[] = [];

    paragraphs.forEach((paragraphContent, paragraphIndex) => {
      const parsedSentences = splitParagraphIntoSentences(paragraphContent);
      parsedSentences.forEach((sentenceContent) => {
        parsed.push({
          id: sentenceId++,
          content: sentenceContent,
          paragraph: paragraphIndex + 1,
        });
      });
    });

    return parsed;
  };

  const handleSubmitEssay = () => {
    const trimmedInput = essayInput.trim();
    if (!trimmedInput) {
      setEssayInputError("Essay cannot be empty.");
      return;
    }

    const parsedEssay = parseEssayInputToSentences(trimmedInput);
    if (!parsedEssay.length) {
      setEssayInputError("No valid sentence found. Please add essay content.");
      return;
    }

    setEssay(parsedEssay);
    setEssayInputError(null);
    setIsEditingEssay(false);

    const currentFeedback = useFeedbackStore.getState().feedback;
    useFeedbackStore
      .getState()
      .setFeedback(
        currentFeedback.filter(
          (item) =>
            item.source !== READABILITY_SOURCE_ID && item.source !== PSYCH_SOURCE_ID,
        ),
      );

    const { feedbackSource, setFeedbackSource } = useFeedbackSourceStore.getState();
    setFeedbackSource(
      feedbackSource.filter(
        (source) =>
          source.id !== READABILITY_SOURCE_ID && source.id !== PSYCH_SOURCE_ID,
      ),
    );

    const sharedConfig = useSharedConfigStore.getState();
    sharedConfig.setCurrentSelectedItems([]);
    sharedConfig.setCurrentSelectedSentences([]);
    sharedConfig.setCurrentReferenceSentence(null);
    sharedConfig.setHoveredSentence(null);
    sharedConfig.setHoveredItem(null);
    sharedConfig.setHoveredProvider(null);
    sharedConfig.setComparisonMode(false);

    eventTracker({
      action: "submit custom essay",
      data: {
        sentenceCount: parsedEssay.length,
        paragraphCount: Math.max(...parsedEssay.map((item) => item.paragraph)),
      },
    });
  };

  useEffect(() => {
    setEssayInput(formatEssayForInput(essay));
  }, [essay]);

  const lexicalHighlightBySentence = useMemo(() => {
    const map = new Map<number, Map<string, "red" | "orange">>();
    const lexicalTypeToColor = (feedback: any): "red" | "orange" | null => {
      const type = String(feedback.type || "").toLowerCase();
      if (feedback.source === READABILITY_SOURCE_ID && type === "asw") return "red";
      if (feedback.source === PSYCH_SOURCE_ID && type === "aoa") return "red";
      if (feedback.source === PSYCH_SOURCE_ID && type === "concreteness") return "orange";
      return null;
    };

    const selectedLexicalFeedbacks = allFeedback.filter((item) => {
      if (!currentSelectedItems.includes(item.id)) return false;
      return lexicalTypeToColor(item) !== null;
    });

    const activeLexicalFeedbacks = [
      ...selectedLexicalFeedbacks,
      ...(hoveredFeedback && lexicalTypeToColor(hoveredFeedback) ? [hoveredFeedback] : []),
    ];

    activeLexicalFeedbacks.forEach((feedback) => {
      const color = lexicalTypeToColor(feedback);
      if (!color) return;

      const words = (feedback.highlightWords || [])
        .filter((word) => typeof word === "string" && word.trim().length > 0)
        .map((word) => word.toLowerCase());
      if (!words.length) return;

      const targetSentenceIds =
        feedback.detection && feedback.detection.length > 0 ? feedback.detection : [];
      if (!targetSentenceIds.length) return;

      targetSentenceIds.forEach((sentenceId: number) => {
        if (!map.has(sentenceId)) map.set(sentenceId, new Map<string, "red" | "orange">());
        const sentenceWordMap = map.get(sentenceId);
        words.forEach((word) => {
          const existing = sentenceWordMap?.get(word);
          if (!existing) {
            sentenceWordMap?.set(word, color);
          } else if (existing !== "red" && color === "red") {
            sentenceWordMap?.set(word, color);
          }
        });
      });
    });

    return map;
  }, [allFeedback, currentSelectedItems, hoveredFeedback]);

  const renderSentenceWithLexicalHighlight = (
    sentenceText: string,
    sentenceId: number,
  ) => {
    const sentenceHighlightWords = lexicalHighlightBySentence.get(sentenceId);
    if (!sentenceHighlightWords || sentenceHighlightWords.size === 0) {
      return sentenceText + " ";
    }

    const parts = sentenceText.split(/(\s+|[^\w']+)/g);
    return (
      <>
        {parts.map((part, idx) => {
          if (!part) return null;
          const normalized = part.toLowerCase().replace(/^[^a-z']+|[^a-z']+$/g, "");
          const color = normalized ? sentenceHighlightWords.get(normalized) : null;
          if (normalized && color) {
            return (
              <span
                key={`${part}-${idx}`}
                className={
                  color === "red"
                    ? "text-red-500 font-semibold"
                    : "text-orange-500 font-semibold"
                }
              >
                {part}
              </span>
            );
          }
          return <React.Fragment key={`${part}-${idx}`}>{part}</React.Fragment>;
        })}
        {" "}
      </>
    );
  };
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
        <div className="flex flex-row items-center gap-2">
          {isEditingEssay ? (
            <>
              <button
                className="btn btn-xs btn-ghost"
                onClick={() => {
                  setEssayInput(formatEssayForInput(essay));
                  setEssayInputError(null);
                  setIsEditingEssay(false);
                }}
              >
                Cancel
              </button>
              <button className="btn btn-xs btn-neutral" onClick={handleSubmitEssay}>
                Submit
              </button>
            </>
          ) : (
            <button
              className="btn btn-xs btn-outline"
              onClick={() => {
                setEssayInput(formatEssayForInput(essay));
                setEssayInputError(null);
                setComparisonMode(false);
                setIsEditingEssay(true);
              }}
            >
              Edit Essay
            </button>
          )}
        </div>
      </div>
      <div className="text-sm leading-relaxed p-4 pt-24 overflow-y-auto relative grow">
        {isEditingEssay ? (
          <div className="flex h-full flex-col gap-2">
            <textarea
              value={essayInput}
              onChange={(event) => {
                setEssayInput(event.target.value);
                if (essayInputError) {
                  setEssayInputError(null);
                }
              }}
              className="textarea textarea-bordered w-full grow text-sm leading-relaxed"
              placeholder="Type or paste your essay here. Use a blank line to separate paragraphs."
            />
            <div className="flex flex-row items-center justify-between">
              <p className="text-2xs opacity-60">
                Tip: use a blank line between paragraphs.
              </p>
              {essayInputError ? (
                <p className="text-2xs text-red-500">{essayInputError}</p>
              ) : null}
            </div>
          </div>
        ) : (
          Object.entries(paragraphs).map(
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
                        )?.revised ||
                          renderSentenceWithLexicalHighlight(section.content, section.id))
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
          )
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
