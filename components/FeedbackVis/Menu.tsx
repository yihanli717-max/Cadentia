import React, { useEffect, useState } from "react";
import {
  useEssayStore,
  useFeedbackStore,
  useSharedConfigStore,
  useRevisionListStore,
} from "@/lib/store";
import { cn, getEmbedding, generateRevision } from "@/lib/utils";

interface MenuProps {
  classes?: string;
}

const Menu = (props: MenuProps) => {
  const essay = useEssayStore((state) => state.essay);
  const allFeedback = useFeedbackStore((state) => state.feedback);
  const [searchedText, setSearchedText] = useState("");

  const [
    categoricalDimension,
    setCategoricalDimension,
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
    state.categoricalDimension,
    state.setCategoricalDimension,
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
          "absolute top-0 left-0 p-2 gap-2 flex flex-row items-center z-50",
        )}
      >
        <div className="dropdown">
          <div
            tabIndex={0}
            role="button"
            className="btn text-xs m-1 flex flex-col gap-1 2xl:flex-row"
          >
            <span className="text-gray-400">Cluster by</span>
            <span className="capitalize">{categoricalDimension}</span>
          </div>
          <ul
            tabIndex={0}
            className="dropdown-content menu bg-base-100 rounded-box z-[1] p-2 shadow text-xs w-32"
          >
            <li>
              <a
                onClick={() => setCategoricalDimension("type")}
                className={categoricalDimension === "type" ? "active" : ""}
              >
                Type
              </a>
            </li>
            <li>
              <a
                onClick={() => setCategoricalDimension("provider")}
                className={categoricalDimension === "provider" ? "active" : ""}
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
            className="btn text-xs m-1 flex flex-col gap-1 2xl:flex-row"
          >
            <span className="text-gray-400">Color by</span>
            <span className="capitalize">{colorDimension}</span>
          </div>
          <ul
            tabIndex={0}
            className="dropdown-content menu bg-base-100 rounded-box z-[1] p-2 shadow text-xs w-32"
          >
            <li>
              <a
                onClick={() => setColorDimension("justification")}
                className={colorDimension === "justification" ? "active" : ""}
              >
                Justification
              </a>
            </li>
            <li>
              <a
                onClick={() => setColorDimension("sentiment")}
                className={colorDimension === "sentiment" ? "active" : ""}
              >
                Sentiment
              </a>
            </li>
            <li>
              <a
                onClick={() => setColorDimension("type")}
                className={colorDimension === "type" ? "active" : ""}
              >
                Type
              </a>
            </li>
            <li>
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
            className="btn text-xs m-1 flex flex-col gap-1 2xl:flex-row"
          >
            <span className="text-gray-400">Size by</span>
            <span className="capitalize">{numericalDimension}</span>
          </div>
          <ul
            tabIndex={0}
            className="dropdown-content menu bg-base-100 rounded-box z-[1] p-2 shadow text-xs w-32"
          >
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
                className={numericalDimension === "specificity" ? "active" : ""}
              >
                Specificity
              </a>
            </li>
          </ul>
        </div>
        <label className="input input-bordered flex items-center gap-2 text-xs h-10">
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
                const embeddings = await getEmbedding(searchedText);
                setSearchedEmbeddings(embeddings);
              }
            }}
            className="grow w-60 2xl:w-96"
            placeholder="Relevance to ..."
          />
          <kbd className="kbd kbd-sm">↵</kbd>
        </label>
      </div>
      <div className="absolute left-0 p-2 bottom-2 z-50 w-full flex flex-row justify-between items-end select-none">
        <div className="ml-2 flex flex-col gap-1 w-48">
          <p className="text-xs">Similarity Threshold: {similarityThreshold}</p>
          <input
            type="range"
            min={0}
            max="1"
            value={similarityThreshold}
            step="0.1"
            className="range range-xs"
            onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
          />
        </div>
        <button
          className="btn btn-neutral text-xs mr-2"
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

            setLoading(true);

            // Generate the revision
            const revision = generateRevision(
              essay,
              selectedFeedbacks,
              Array.from(sentences),
            ).then((revision) => {
              setLoading(false);
              if (revision) {
                setCurrentSelectedItems([]);
                console.log(JSON.parse(revision));

                // add the revision to the revision list
                const { revisionList, setRevisionList } =
                  useRevisionListStore.getState();

                // if the revision list already has an item with the same feedback, update the revision
                const existingRevision = revisionList.find(
                  (item) => item.id === currentRevisionItem,
                );
                if (existingRevision) {
                  setRevisionList(
                    revisionList.map((item) =>
                      item.id === currentRevisionItem
                        ? {
                            ...item,
                            feedback: toAddressItems,
                            revision: JSON.parse(revision).revision,
                          }
                        : item,
                    ),
                  );
                } else {
                  setRevisionList([
                    ...revisionList,
                    {
                      id: currentRevisionItem,
                      feedback: toAddressItems,
                      revision: JSON.parse(revision).revision,
                    },
                  ]);
                }
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
