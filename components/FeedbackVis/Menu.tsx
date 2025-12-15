import React, { useEffect, useState } from "react";
import {
  useEssayStore,
  useFeedbackStore,
  useSharedConfigStore,
  useRevisionListStore,
  useFeedbackSourceStore,
} from "@/lib/store";
import { cn, getEmbedding, generateRevision, eventTracker } from "@/lib/utils";
import { removeStopwords } from "stopword";
// --- MODIFICATION START: Import FeedbackItem ---
import { FeedbackItem, FeedbackSourceItem } from "@/lib/type"; // Add this import
// --- MODIFICATION END ---

interface MenuProps {
  classes?: string;
}

const READABILITY_SOURCE_ID = 999;
const READABILITY_PROVIDER_NAME = "Qwen-MAX (Readability)";

const Menu = (props: MenuProps) => {
  const allFeedback = useFeedbackStore((state) => state.feedback);
  const [searchedText, setSearchedText] = useState("");
  const [prompt, setPrompt] = useState("");

  // --- MODIFICATION START: Added state for FRES and loading ---
  const [fres, setFres] = useState<number | null>(null);
  const [asl, setAsl] = useState<number | null>(null);
  const [asw, setAsw] = useState<number | null>(null);
  const [readabilityLoading, setReadabilityLoading] = useState<boolean>(true); // Added loading state
  // --- MODIFICATION END ---

  // --- MODIFICATION START: Add state for suggestion and loading ---
  const [readabilitySuggestion, setReadabilitySuggestion] = useState<string | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState<boolean>(false);
  // --- MODIFICATION END ---

  // --- MODIFICATION START: Add state for parsed readability feedback ---
  const [parsedReadabilityFeedback, setParsedReadabilityFeedback] = useState<FeedbackItem[] | null>(null);
  // --- MODIFICATION END ---

  // --- MODIFICATION START: Added state for user level selection ---
  const [userLevel, setUserLevel] = useState<"simple" | "general" | "knowledgeable">("general");
  // --- MODIFICATION END ---

  // --- MODIFICATION START: Added essay store hook ---
  const essay = useEssayStore((state) => state.essay); // Get the current essay from the store
  // --- MODIFICATION END ---

    // 在 Menu 组件内部
  const [showPlan, setShowPlan] = useState(false);


  async function loadFRES() {
    setReadabilityLoading(true); // Start loading
    try {
      // Join the essay sentences into a single text string
      const text = essay.map(s => s.content).join(' ');

      const res = await fetch("/api/readability", {
        method: "POST", // Use POST method
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }), // Send the text in the request body
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("API Error:", errorData.error);
        setFres(null);
        setAsl(null);
        setAsw(null);
        return;
      }

      const data = await res.json();

      // Check if the response structure matches the new POST API
      if (data && data.success && typeof data.scores.FRES === "number" && typeof data.scores.ASL === "number" && typeof data.scores.ASW === "number") {
        setFres(data.scores.FRES); // Access FRES from data.scores.FRES
        setAsl(data.scores.ASL);   // Access ASL from data.scores.ASL
        setAsw(data.scores.ASW);   // Access ASW from data.scores.ASW
      } else {
        setFres(null);
        setAsl(null);
        setAsw(null);
      }
    } catch (error) {
      console.error("Failed to fetch FRES:", error);
      setFres(null);
      setAsl(null);
      setAsw(null);
    } finally {
      setReadabilityLoading(false); // End loading
    }
  }
  // --- MODIFICATION END ---

  // --- MODIFICATION START: Updated useEffect hook ---
  // Load FRES when the component mounts and whenever the essay changes
  useEffect(() => {
    if (essay && essay.length > 0) { // Ensure essay has data before loading
      loadFRES();
    } else {
      setFres(null); // If essay is empty, clear the FRES
      setAsl(null);  // If essay is empty, clear the ASL
      setAsw(null); // If essay is empty, clear the ASW
      setReadabilityLoading(false); // Also clear loading state
    }
  }, [essay]); // Dependency is the essay state
  // --- MODIFICATION END ---

  

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
    updateCurrentSelectedItems,
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
    state.updateCurrentSelectedItems,
  ]);

  const { revisionList } = useRevisionListStore();
  const currentRevision = revisionList.find(
    (item) => item.id === currentRevisionItem,
  );

  useEffect(() => {
    setSearchedEmbeddings(undefined);
  }, []);

  // --- MODIFICATION START: Update fetchReadabilitySuggestion ---
  const fetchReadabilitySuggestion = async () => {
    if (!essay || essay.length === 0 || typeof fres !== 'number' || typeof asl !== 'number' || typeof asw !== 'number') {
      console.warn("Cannot fetch suggestion: Missing text or metrics.");
      setReadabilitySuggestion("Cannot generate suggestion: Text or metrics unavailable.");
      return;
    }
    
    setSuggestionLoading(true);
    // Optional: Clear old readability suggestions UI state
    setParsedReadabilityFeedback(null);
    setShowPlan(false);

    try {
      const text = essay.map(s => s.content).join(' ');

      const res = await fetch("/api/readability_suggestion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fres, asl, asw, text, essay, userLevel }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("Fetch Suggestion Error:", errorData);
        setReadabilitySuggestion(`Error: ${errorData.message || 'Failed to fetch suggestion'}`);
        return;
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.feedbackItems)) {
        // --- MODIFICATION START: Update Global Feedback Store (Corrected) ---
        setShowPlan(true);
        // Get the *current* feedback list from the store
        const currentFeedbackInStore = useFeedbackStore.getState().feedback; // <--- Get current feedback

        // Filter out *old* readability suggestions from the current list (optional, to avoid duplicates on multiple clicks)
        // Assuming readability suggestions have provider: "Qwen-MAX (Readability)" or source: 999
        const nonReadabilityFeedback = currentFeedbackInStore.filter(f => f.provider !== "Qwen-MAX (Readability)" && f.source !== 999); // <--- Use the fetched list

        // Combine the non-readability feedback with the *new* readability suggestions from the API
        //const updatedFeedbackList = [...nonReadabilityFeedback, ...data.feedbackItems]; // <--- Combine lists
        const updatedFeedbackList = [ ...data.feedbackItems]; // <--- Combine lists

        // Update the global feedback store with the new combined list
        useFeedbackStore.getState().setFeedback(updatedFeedbackList); // <--- Update the store state

        // Also update the local state for UI display (if you still want to show them separately initially)
        setParsedReadabilityFeedback(data.feedbackItems);
        // --- MODIFICATION END ---

        // --- NEW: ensure a provider card exists for readability suggestions ---
        const { feedbackSource, setFeedbackSource } =
          useFeedbackSourceStore.getState();

        const readabilitySummary = data.feedbackItems
          .map((item: FeedbackItem) => {
            const originalSentence = item.detection
              ?.map(
                (sentenceId) =>
                  essay.find((sentence) => sentence.id === sentenceId)
                    ?.content,
              )
              .filter(Boolean)
              .join(" ");

            if (originalSentence && item.revisedContent) {
              return `Original: "${originalSentence}"\nRevised: "${item.revisedContent}"`;
            }

            if (item.revisedContent) {
              return `Revised: "${item.revisedContent}"`;
            }

            return item.content;
          })
          .join("\n\n");

        const readabilityProviderCard: FeedbackSourceItem = {
          id: READABILITY_SOURCE_ID,
          provider: READABILITY_PROVIDER_NAME,
          content:
            readabilitySummary ||
            "Readability suggestions generated via Qwen-MAX.",
        };

        if (
          feedbackSource.some((source) => source.id === READABILITY_SOURCE_ID)
        ) {
          setFeedbackSource(
            feedbackSource.map((source) =>
              source.id === READABILITY_SOURCE_ID
                ? readabilityProviderCard
                : source,
            ),
          );
        } else {
          setFeedbackSource([...feedbackSource, readabilityProviderCard]);
        }
      } else {
          console.error("API returned error or invalid data", data);
          setReadabilitySuggestion(`Error: ${data.message || 'Received invalid data from API'}`);
      }
    } catch (error) {
      console.error("Failed to fetch readability suggestion:", error);
      setReadabilitySuggestion("Error: Failed to fetch suggestion.");
    } finally {
      setSuggestionLoading(false);
    }
  };
  // --- MODIFICATION END ---

  return (
    <>
      {/* --- MODIFICATION START: Updated Readability Display (show FRES, ASL, ASW, and formula) --- */}
      <div
        className="absolute right-4 top-4 bg-base-100 shadow-md rounded-md px-3 py-2 z-50"
        style={{ border: "1px solid rgba(255,255,255,0.15)" }}
      >
        {/* User Level Selection */}
        <div className="mb-3 pb-2 border-b border-base-300">
          <span className="text-xs opacity-50 mb-1 block">Target Audience</span>
          <div className="flex flex-row gap-1">
            <button
              onClick={() => setUserLevel("simple")}
              className={cn(
                "btn btn-xs text-2xs px-2 py-1",
                userLevel === "simple" ? "btn-active" : "btn-ghost"
              )}
            >
              Simple
            </button>
            <button
              onClick={() => setUserLevel("general")}
              className={cn(
                "btn btn-xs text-2xs px-2 py-1",
                userLevel === "general" ? "btn-active" : "btn-ghost"
              )}
            >
              General
            </button>
            <button
              onClick={() => setUserLevel("knowledgeable")}
              className={cn(
                "btn btn-xs text-2xs px-2 py-1",
                userLevel === "knowledgeable" ? "btn-active" : "btn-ghost"
              )}
            >
              Knowledgeable
            </button>
          </div>
        </div>
        <span className="text-xs opacity-50">Readability</span>
        <div className="text-sm ml-2">
          {readabilityLoading ? (
            <span>Calculating...</span>
          ) : (
            <>
              {typeof fres === "number" && typeof asl === "number" && typeof asw === "number" ? (
                <>
                  <div className="text-base font-medium">FRES (Overall Readability Score): {fres.toFixed(1)}</div>
                  <div>ASL (Average Sentence Length): {asl.toFixed(2)}</div>
                  <div>ASW (Average Number of Syllables per Word): {asw.toFixed(2)}</div>                  
                  <div className="text-xs opacity-75 mt-1">Formula: FRES = 206.835 - 1.015 * ASL - 84.6 * ASW</div>
                  {/* Add button to get suggestion */}
                  <button
                    onClick={fetchReadabilitySuggestion}
                    disabled={suggestionLoading} // Disable while loading
                    className="mt-2 text-xs btn btn-xs btn-outline"
                  >
                    {suggestionLoading ? "Generating..." : "Get Suggestion"}
                  </button>

                  {/* Improvement Plan Text - 只有当 showPlan 为 true 时显示 */}
                  {showPlan && !suggestionLoading && (
                    <div className="mt-3 pt-2 border-t border-base-300 animate-in fade-in slide-in-from-top-2 duration-300">
                      <p className="text-xs font-semibold mb-1 text-primary">Improvement Plan:</p>
                      <p className="text-xs text-base-content/80 leading-relaxed text-justify">
                        Each circle in the menu is related to a sentence in your essay.<br /> The color and size represent the issue type and <br /> improvement actionability respectively. <br /> We recommend you to revise the bigger ones first <br /> according to the provider card on the right.<br /> Then you can improve your essay's readability faster.
                      </p>
                    </div>
                  )}
                  
                </>
              ) : (
                <span>N/A</span>
              )}
            </>
          )}
        </div>
      </div>
      {/* --- MODIFICATION END --- */}
      <div
        className={cn(
          props.classes,
          "p-2 gap-2 flex flex-row items-start justify-between",
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
              <li title="Provider is the source of the feedback.">
                <a
                  onClick={() => setClusterDimension("provider")}
                  className={clusterDimension === "provider" ? "active" : ""}
                >
                  Provider
                </a>
              </li>
              <li title="Type is the target writing element of feedback.">
                <a
                  onClick={() => setClusterDimension("type")}
                  className={clusterDimension === "type" ? "active" : ""}
                >
                  Type
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
              <li title="Provider is the source of the feedback.">
                <a
                  onClick={() => setColorDimension("provider")}
                  className={colorDimension === "provider" ? "active" : ""}
                >
                  Provider
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
          <label className="input input-bordered flex items-center gap-2 text-xs font-medium h-12 p-3 rounded-md">
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
              placeholder="Search for feedback ..."
            />
            <kbd
              className="kbd kbd-sm cursor-pointer"
              onClick={async () => {
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
              }}
            >
              ↵
            </kbd>
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
      <div className="absolute right-3 bottom-2 z-50 select-none flex gap-2">
        <label className="input input-bordered flex items-center gap-2 text-xs font-medium h-12 ml-2 p-3 rounded-md">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="grow w-56 2xl:w-96"
            placeholder="Your prompt along with the feedback ..."
          />
        </label>
        <button
          className="btn rounded-md btn-neutral text-xs"
          onClick={() => {
            const clusterDimension =
              useSharedConfigStore.getState().clusterDimension;
            const numericalDimension =
              useSharedConfigStore.getState().numericalDimension;
            const colorDimension =
              useSharedConfigStore.getState().colorDimension;

            // concatenate currentSelectedItems and feedback list in currentRevisionItem
            const reivisonList = useRevisionListStore.getState().revisionList;
            const currentSelectedItems =
              useSharedConfigStore.getState().currentSelectedItems;
            // console.log("currentSelectedItems: ", currentSelectedItems);
            console.log("Feedback IDs input to GPT: ", currentSelectedItems);

            if (!currentSelectedItems) {
              console.log("No feedback selected");
              return;
            }

            // Find the feedback content of the selected items from the feedback
            const selectedFeedbacks = currentSelectedItems.map(
              (id) => allFeedback.find((item) => item.id === id)?.content,
            ) as string[];

            // Find the essay
            const essay = useEssayStore.getState().essay;

            // Find the target sentences from the selected feedback items
            const currentSelectedSentences =
              useSharedConfigStore.getState().currentSelectedSentences;
            // find the sentences from Essay based on the currentSelectedSentences id
            const sentences = new Set<string>();
            essay.forEach((sentence) => {
              if (currentSelectedSentences.includes(sentence.id)) {
                sentences.add(sentence.content);
              }
            });

            console.log(
              "Selected Sentences: ",
              currentSelectedSentences,
              sentences,
            );

            setLoading(true);

            // Generate the revision
            generateRevision(
              prompt,
              essay,
              selectedFeedbacks,
              Array.from(sentences),
            ).then((revision) => {
              eventTracker({
                action: "apply feedback",
                data: {
                  prompt: prompt,
                  feedback: selectedFeedbacks,
                  sentences: Array.from(sentences),
                },
              });

              setLoading(false);
              setPrompt("");
              if (revision) {
                const response = JSON.parse(revision.response);
                const conversation = revision.conversation;

                // add the revision to the revision list
                const { updateRevision } = useRevisionListStore.getState();

                // Update the revision list
                updateRevision({
                  id: currentRevisionItem,
                  feedback: currentSelectedItems,
                  conversation: conversation,
                  revision: response.revision,
                  clusterDimension: clusterDimension,
                  numericalDimension: numericalDimension,
                  colorDimension: colorDimension,
                });
              }
            });
          }}
        >
          {currentRevision && currentRevision?.revision.length > 0
            ? "Regenerate"
            : "Apply"}
        </button>
      </div>
    </>
  );
};

export default Menu;
