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
  const allFeedback = useFeedbackStore((state) => state.feedback);
  const [searchedText, setSearchedText] = useState("");

  const [
    categoricalDimension,
    setCategoricalDimension,
    numericalDimension,
    setNumericalDimension,
    searchedEmeddings,
    setSearchedEmbeddings,
    similarityThreshold,
    setSimilarityThreshold,
    currentSelectedItems,
  ] = useSharedConfigStore((state) => [
    state.categoricalDimension,
    state.setCategoricalDimension,
    state.numericalDimension,
    state.setNumericalDimension,
    state.searchedEmeddings,
    state.setSearchedEmbeddings,
    state.similarityThreshold,
    state.setSimilarityThreshold,
    state.currentSelectedItems,
  ]);

  return (
    <>
      <div
        className={cn(
          props.classes,
          "absolute top-0 left-0 p-2 gap-2 flex flex-row items-center z-50",
        )}
      >
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn text-xs m-1">
            <span className="text-gray-400">Color by</span>
            <span className="capitalize">{categoricalDimension}</span>
          </div>
          <ul
            tabIndex={0}
            className="dropdown-content menu bg-base-100 rounded-box z-[1] w-full p-2 shadow"
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
          <div tabIndex={0} role="button" className="btn text-xs m-1 h-10">
            <span className="text-gray-400">Size by</span>
            <span className="capitalize">{numericalDimension}</span>
          </div>
          <ul
            tabIndex={0}
            className="dropdown-content menu bg-base-100 rounded-box z-[1] w-full p-2 shadow"
          >
            <li title="Length is the number of words in the feedback.">
              <a
                onClick={() => setNumericalDimension("length")}
                className={numericalDimension === "length" ? "active" : ""}
              >
                Length
              </a>
            </li>
            {/* <li title="Helpfulness is the sum of actionability, specificity, and justification.">
            <a
              onClick={() => setNumericalDimension("helpfulness")}
              className={numericalDimension === "helpfulness" ? "active" : ""}
            >
              Helpfulness
            </a>
          </li> */}
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
            <li title="Justification is the degree to which the feedback is justified with reasons or evidence.">
              <a
                onClick={() => setNumericalDimension("justification")}
                className={
                  numericalDimension === "justification" ? "active" : ""
                }
              >
                Justification
              </a>
            </li>
            <li title="Sentiment is the degree to which the feedback is positive (small) or negative (big).">
              <a
                onClick={() => setNumericalDimension("sentiment")}
                className={numericalDimension === "sentiment" ? "active" : ""}
              >
                Sentiment
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
            className="grow 2xl:w-96"
            placeholder="Relevance to ..."
          />
          <kbd className="kbd kbd-sm">↵</kbd>
        </label>
      </div>
      <div className="absolute left-0 p-2 bottom-2 z-50 w-full flex flex-row justify-between items-end">
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
          className="btn btn-neutral text-xs mr-4"
          onClick={() => {
            // Find the feedback content of the selected items from the feedback
            const selectedFeedbacks = currentSelectedItems.map(
              (id) => allFeedback.find((item) => item.id === id)?.content,
            ) as string[];

            // Find the target sentences from the selected feedback items
            const sentences = new Set<string>();
            currentSelectedItems
              .map((id) => allFeedback.find((item) => item.id === id))
              .forEach((feedback) => {
                feedback?.plan.forEach((item) => {
                  sentences.add(item.sentence);
                });
              });
            console.log(sentences);

            // Find the essay
            const essay = useEssayStore.getState().essay;

            // Generate the revision
            const revision = generateRevision(
              essay,
              selectedFeedbacks,
              Array.from(sentences),
            ).then((revision) => {
              if (revision) {
                console.log(JSON.parse(revision));
                // add the revision to the revision list
                const { revisionList, setRevisionList } =
                  useRevisionListStore.getState();

                setRevisionList([
                  ...revisionList,
                  {
                    id: 0,
                    feedback: currentSelectedItems,
                    revision: JSON.parse(revision).revision,
                  },
                ]);
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
