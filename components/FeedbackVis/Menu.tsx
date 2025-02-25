import React, { useEffect, useState } from "react";
import {
  useEssayStore,
  useFeedbackStore,
  useSharedConfigStore,
  useRevisionListStore,
} from "@/lib/store";
import { cn, getEmbedding, generateRevision, eventTracker } from "@/lib/utils";
import { removeStopwords } from "stopword";

interface MenuProps {
  classes?: string;
}

const Menu = (props: MenuProps) => {
  const essay = useEssayStore((state) => state.essay);
  const allFeedback = useFeedbackStore((state) => state.feedback);
  const [searchedText, setSearchedText] = useState("");

  const [
    clusterDimension,
    setClusterDimension,
    numericalDimension,
    setNumericalDimension,
    colorDimension,
    setColorDimension,
    searchedEmeddings,
    setSearchedEmbeddings,
    similarityThreshold,
    setSimilarityThreshold,
    currentSelectedItems,
    currentRevisionItem,
    setLoading,
    setCurrentSelectedItems,
  ] = useSharedConfigStore((state) => [
    state.clusterDimension,
    state.setClusterDimension,
    state.numericalDimension,
    state.setNumericalDimension,
    state.colorDimension,
    state.setColorDimension,
    state.searchedEmeddings,
    state.setSearchedEmbeddings,
    state.similarityThreshold,
    state.setSimilarityThreshold,
    state.currentSelectedItems,
    state.currentRevisionItem,
    state.setLoading,
    state.setCurrentSelectedItems,
  ]);

  useEffect(() => {
    setSearchedEmbeddings(undefined);
  }, []);

  return (
    <>
      <div
        className={cn(
          props.classes,
          "p-2 gap-3 flex flex-row items-start justify-between",
        )}
      >
        <div className="flex-none flex flex-row gap-2 z-50">
          <div className="dropdown">
            <div
              tabIndex={0}
              role="button"
              className="btn rounded-md text-2xs flex flex-col gap-0.5 shadow-none w-28"
            >
              <span className="opacity-40">Cluster by</span>
              <span className="capitalize">{clusterDimension}</span>
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu bg-base-100 rounded-md z-[1] p-2 shadow text-2xs w-28 mt-1"
            >
              <li title="Type is the target writing element of feedback.">
                <a
                  onClick={() => setClusterDimension("type")}
                  className={clusterDimension === "type" ? "active" : ""}
                >
                  Type
                </a>
              </li>
              <li title="Provider is the source of the feedback.">
                <a
                  onClick={() => setClusterDimension("provider")}
                  className={clusterDimension === "provider" ? "active" : ""}
                >
                  Provider
                </a>
              </li>
            </ul>
          </div>
          <div className="dropdown">
            <div
              tabIndex={0}
              role="button"
              className="btn rounded-md text-2xs flex flex-col gap-0.5 shadow-none w-28"
            >
              <span className="opacity-40">Color by</span>
              <span className="capitalize">{colorDimension}</span>
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu bg-base-100 rounded-md z-[1] p-2 shadow text-2xs w-28 mt-1"
            >
              <li>
                <a
                  onClick={() => setColorDimension("none")}
                  className={colorDimension === "none" ? "active" : ""}
                >
                  None
                </a>
              </li>
              <li title="Justification is whether the feedback is justified with reasons.">
                <a
                  onClick={() => setColorDimension("justification")}
                  className={colorDimension === "justification" ? "active" : ""}
                >
                  Justification
                </a>
              </li>
              <li title="Sentiment is whether the feedback is positive or negative.">
                <a
                  onClick={() => setColorDimension("sentiment")}
                  className={colorDimension === "sentiment" ? "active" : ""}
                >
                  Sentiment
                </a>
              </li>
              <li title="Type is the target writing element of feedback.">
                <a
                  onClick={() => setColorDimension("type")}
                  className={colorDimension === "type" ? "active" : ""}
                >
                  Type
                </a>
              </li>
              <li title="Provider is the source of the feedback.">
                <a
                  onClick={() => setColorDimension("provider")}
                  className={colorDimension === "provider" ? "active" : ""}
                >
                  Provider
                </a>
              </li>
            </ul>
          </div>
          <div className="dropdown">
            <div
              tabIndex={0}
              role="button"
              className="btn rounded-md text-2xs flex flex-col gap-0.5 shadow-none w-28"
            >
              <span className="opacity-40">Size by</span>
              <span className="capitalize">{numericalDimension}</span>
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu bg-base-100 rounded-md z-[1] p-2 shadow text-2xs w-28 mt-1"
            >
              <li title="">
                <a
                  onClick={() => setNumericalDimension("none")}
                  className={numericalDimension === "none" ? "active" : ""}
                >
                  None
                </a>
              </li>
              <li title="Length is the number of words in the feedback.">
                <a
                  onClick={() => setNumericalDimension("length")}
                  className={numericalDimension === "length" ? "active" : ""}
                >
                  Length
                </a>
              </li>
              <li title="Actionability is the number of actionable suggestions in the feedback.">
                <a
                  onClick={() => setNumericalDimension("actionability")}
                  className={
                    numericalDimension === "actionability" ? "active" : ""
                  }
                >
                  Actionability
                </a>
              </li>
              <li title="Specificity is the degree to which the feedback is specific and detailed.">
                <a
                  onClick={() => setNumericalDimension("specificity")}
                  className={
                    numericalDimension === "specificity" ? "active" : ""
                  }
                >
                  Specificity
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex flex-row items-center gap-2">
          <label className="input input-bordered flex items-center gap-2 text-2xs font-medium h-12 ml-2 p-3 rounded-md">
            <input
              type="text"
              value={searchedText}
              onChange={(e) => setSearchedText(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  if (!searchedText) {
                    console.log("No search text");
                    setSearchedEmbeddings(undefined);
                    return;
                  }

                  // Remove stopwords
                  const searchedTextWithoutStopwords = removeStopwords(
                    searchedText.split(" "),
                  ).join(" ");
                  // console.log(
                  //   "Searched text without stopwords: ",
                  //   searchedTextWithoutStopwords,
                  // );
                  const embeddings = await getEmbedding(
                    searchedTextWithoutStopwords,
                  );
                  eventTracker({
                    action: "search",
                    data: {
                      text: searchedText,
                    },
                  });
                  setSearchedEmbeddings(embeddings);
                }
              }}
              className="grow w-60 2xl:w-96"
              placeholder="Relevance to ..."
            />
            <kbd className="kbd kbd-sm">↵</kbd>
          </label>
          {/* <div className="ml-2 flex flex-col gap-1 w-52">
            <p className="text-2xs">
              Feedback Similarity Threshold on Hover: {similarityThreshold}
            </p>
            <input
              type="range"
              min={0}
              max="1"
              value={similarityThreshold}
              step="0.1"
              className="range range-xs"
              onChange={(e) =>
                setSimilarityThreshold(parseFloat(e.target.value))
              }
            />
          </div> */}
        </div>
      </div>
      <div className="absolute right-3 bottom-2 z-50 select-none">
        <button
          className="btn rounded-md btn-neutral text-2xs btn-sm"
          onClick={() => {
            // concatenate currentSelectedItems and feedback list in currentRevisionItem
            const reivisonList = useRevisionListStore.getState().revisionList;
            const currentRevision = reivisonList.find(
              (item) => item.id === currentRevisionItem,
            );
            const currentSelectedItems =
              useSharedConfigStore.getState().currentSelectedItems;
            const toAddressItems = currentSelectedItems.concat(
              currentRevision?.feedback || [],
            );
            // console.log("currentSelectedItems: ", currentSelectedItems);
            console.log("Feedback IDs input to GPT: ", toAddressItems);

            if (!toAddressItems) {
              console.log("No feedback selected");
              return;
            }

            // Find the feedback content of the selected items from the feedback
            const selectedFeedbacks = toAddressItems.map(
              (id) => allFeedback.find((item) => item.id === id)?.content,
            ) as string[];

            // Find the essay
            const essay = useEssayStore.getState().essay;

            // Find the target sentences from the selected feedback items
            const sentences = new Set<string>();
            toAddressItems
              .map((id) => allFeedback.find((item) => item.id === id))
              .forEach((feedback) => {
                feedback?.detection.map((id) => {
                  sentences.add(
                    essay.find((item) => item.id === id)?.content || "",
                  );
                });
              });

            const currentSelectedSentences =
              useSharedConfigStore.getState().currentSelectedSentences;
            const currentRemovedSentences =
              useSharedConfigStore.getState().currentRemovedSentences;

            // Boolean sentences AND currentSelectedSentences
            currentSelectedSentences.forEach((id) => {
              sentences.add(
                essay.find((item) => item.id === id)?.content || "",
              );
            });

            // Boolean sentences AND NOT currentRemovedSentences
            currentRemovedSentences.forEach((id) => {
              sentences.delete(
                essay.find((item) => item.id === id)?.content || "",
              );
            });

            setLoading(true);

            eventTracker({
              action: "apply feedback",
              data: {
                feedback: toAddressItems,
              },
            });

            // Generate the revision
            generateRevision(
              essay,
              selectedFeedbacks,
              Array.from(sentences),
            ).then((revision) => {
              setLoading(false);
              if (revision) {
                setCurrentSelectedItems([]);
                const response = JSON.parse(revision.response);
                const conversation = revision.conversation;

                // add the revision to the revision list
                const { updateRevision } = useRevisionListStore.getState();

                // Update the revision list
                updateRevision({
                  id: currentRevisionItem,
                  feedback: toAddressItems,
                  conversation: conversation,
                  revision: response.revision,
                });
              }
            });
          }}
        >
          Apply
        </button>
      </div>
    </>
  );
};

export default Menu;
