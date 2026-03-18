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
  dashboardOnly?: boolean;
}

const READABILITY_SOURCE_ID = 100;
const READABILITY_PROVIDER_NAME = "Qwen-MAX (Readability)";
const PSYCH_SOURCE_ID = 101;
const PSYCH_PROVIDER_NAME = "Qwen-Plus (Psycholinguistic)";

type PsychScores = {
  aoa: {
    meanAoA: number;
    lateAoARatio: number;
  };
  concreteness: {
    meanConcreteness: number;
    abstractRatio: number;
  };
};


// 鍦ㄧ粍浠跺閮ㄦ垨缁勪欢鍐呴儴椤堕儴瀹氫箟閰嶇疆
// Define User Level Configurations
const userLevelConfigs: Record<string, { MIN_TARGET: number; MAX_TARGET: number; ASL_BENCHMARK: number; ASW_BENCHMARK: number }> = {
  simple: { MIN_TARGET: 80, MAX_TARGET: 90, ASL_BENCHMARK: 15, ASW_BENCHMARK: 1.3 },
  general: { MIN_TARGET: 60, MAX_TARGET: 70, ASL_BENCHMARK: 20, ASW_BENCHMARK: 1.5 },
  knowledgeable: { MIN_TARGET: 30, MAX_TARGET: 50, ASL_BENCHMARK: 25, ASW_BENCHMARK: 1.7 },
};

const psychBenchmarkConfigs: Record<
  "simple" | "general" | "knowledgeable",
  {
    meanAoA: number;
    lateAoARatio: number;
    meanConcreteness: number;
    abstractRatio: number;
  }
> = {
  simple: {
    meanAoA: 2.0,
    lateAoARatio: 0.075,
    meanConcreteness: 4.25,
    abstractRatio: 0.075,
  },
  general: {
    meanAoA: 3.75,
    lateAoARatio: 0.25,
    meanConcreteness: 3.1,
    abstractRatio: 0.25,
  },
  knowledgeable: {
    meanAoA: 5.75,
    lateAoARatio: 0.675,
    meanConcreteness: 1.85,
    abstractRatio: 0.675,
  },
};

const Menu = (props: MenuProps) => {
  const dashboardOnly = props.dashboardOnly ?? false;
  const allFeedback = useFeedbackStore((state) => state.feedback);
  const [searchedText, setSearchedText] = useState("");
  const [prompt, setPrompt] = useState("");

  // --- MODIFICATION START: Added state for FRES and loading ---
  const [fres, setFres] = useState<number | null>(null);
  const [asl, setAsl] = useState<number | null>(null);
  const [asw, setAsw] = useState<number | null>(null);
  const [psychScores, setPsychScores] = useState<PsychScores | null>(null);
  const [psychLoading, setPsychLoading] = useState<boolean>(true);
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

    // 鍦?Menu 缁勪欢鍐呴儴
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

  async function loadPsychScores(): Promise<PsychScores | null> {
    setPsychLoading(true);
    try {
      const text = essay.map((s) => s.content).join(" ");
      const res = await fetch("/api/psycholinguistic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        setPsychScores(null);
        return null;
      }

      const data = await res.json();
      if (
        data?.success &&
        typeof data?.scores?.aoa?.meanAoA === "number" &&
        typeof data?.scores?.aoa?.lateAoARatio === "number" &&
        typeof data?.scores?.concreteness?.meanConcreteness === "number" &&
        typeof data?.scores?.concreteness?.abstractRatio === "number"
      ) {
        const nextScores: PsychScores = {
          aoa: {
            meanAoA: data.scores.aoa.meanAoA,
            lateAoARatio: data.scores.aoa.lateAoARatio,
          },
          concreteness: {
            meanConcreteness: data.scores.concreteness.meanConcreteness,
            abstractRatio: data.scores.concreteness.abstractRatio,
          },
        };
        setPsychScores(nextScores);
        return nextScores;
      } else {
        setPsychScores(null);
        return null;
      }
    } catch (error) {
      console.error("Failed to fetch psycholinguistic scores:", error);
      setPsychScores(null);
      return null;
    } finally {
      setPsychLoading(false);
    }
  }

  function parsePsychSuggestionToFeedbackItems(data: any, essayData: any[]): FeedbackItem[] {
    const suggestion = data?.suggestion ?? {};
    const sentenceRevisions: any[] = Array.isArray(suggestion?.sentence_revisions)
      ? suggestion.sentence_revisions
      : [];
    const wordReplacements: any[] = Array.isArray(suggestion?.word_replacements)
      ? suggestion.word_replacements
      : [];
    const priorityActions: any[] = Array.isArray(suggestion?.priority_actions)
      ? suggestion.priority_actions
      : [];

    const items: FeedbackItem[] = [];
    const psychFeedbackIdBase = 998000;

    sentenceRevisions.forEach((item, idx) => {
      const original = typeof item?.original === "string" ? item.original.trim() : "";
      const revised = typeof item?.revised === "string" ? item.revised.trim() : "";
      const effect = typeof item?.expected_effect === "string" ? item.expected_effect.trim() : "psycholinguistic shift";

      if (!original && !revised) return;

      const matchedSentence = essayData.find(
        (s) =>
          (original && (s.content.includes(original) || original.includes(s.content))) ||
          (revised && (s.content.includes(revised) || revised.includes(s.content)))
      );

      items.push({
        id: psychFeedbackIdBase + items.length,
        source: PSYCH_SOURCE_ID,
        provider: PSYCH_PROVIDER_NAME,
        content: `Psycholinguistic Suggestion (${idx + 1}): ${effect}`,
        type: "word-usage",
        actionability: 0.85,
        specificity: 1,
        justification: 0.85,
        sentiment: 0,
        detection: matchedSentence ? [matchedSentence.id] : [],
        sentence_count: matchedSentence ? 1 : 0,
        word_count: original ? original.split(/\s+/).length : 0,
        none: 0,
        revisedContent: revised || original || "No revision content provided.",
      });
    });

    wordReplacements.forEach((item, idx) => {
      const originalWord = typeof item?.original === "string" ? item.original.trim() : "";
      const replacement = typeof item?.replacement === "string" ? item.replacement.trim() : "";
      const effect = typeof item?.expected_effect === "string" ? item.expected_effect.trim() : "psycholinguistic shift";
      if (!originalWord || !replacement) return;

      const matchedSentence = essayData.find((s) =>
        s.content.toLowerCase().includes(originalWord.toLowerCase())
      );

      const highlightWords = [originalWord.toLowerCase()];

      items.push({
        id: psychFeedbackIdBase + items.length,
        source: PSYCH_SOURCE_ID,
        provider: PSYCH_PROVIDER_NAME,
        content: `Word replacement: "${originalWord}" (${effect})`,
        type: "word-usage",
        actionability: 0.8,
        specificity: 0.9,
        justification: 0.8,
        sentiment: 0,
        detection: matchedSentence ? [matchedSentence.id] : [],
        sentence_count: matchedSentence ? 1 : 0,
        word_count: 1,
        none: 0,
        revisedContent: replacement,
        highlightWords,
      });
    });

    if (items.length === 0) {
      priorityActions.forEach((item, idx) => {
        const focus = typeof item?.focus === "string" ? item.focus.trim() : "Psycholinguistic";
        const instruction =
          typeof item?.instruction === "string"
            ? item.instruction.trim()
            : typeof item?.reason === "string"
            ? item.reason.trim()
            : "Revise wording to better match psycholinguistic target.";

        items.push({
          id: psychFeedbackIdBase + items.length,
          source: PSYCH_SOURCE_ID,
          provider: PSYCH_PROVIDER_NAME,
          content: `${focus}: ${instruction}`,
          type: "word-usage",
          actionability: 0.8,
          specificity: 0.8,
          justification: 0.8,
          sentiment: 0,
          detection: [],
          sentence_count: 0,
          word_count: instruction.split(/\s+/).length,
          none: 0,
          revisedContent: `Priority ${idx + 1}: ${instruction}`,
        });
      });
    }

    if (items.length === 0 && typeof suggestion?.raw === "string" && suggestion.raw.trim()) {
      items.push({
        id: psychFeedbackIdBase,
        source: PSYCH_SOURCE_ID,
        provider: PSYCH_PROVIDER_NAME,
        content: "Psycholinguistic suggestion (raw model output)",
        type: "word-usage",
        actionability: 0.7,
        specificity: 0.7,
        justification: 0.7,
        sentiment: 0,
        detection: [],
        sentence_count: 0,
        word_count: suggestion.raw.split(/\s+/).length,
        none: 0,
        revisedContent: suggestion.raw,
      });
    }

    return items;
  }

  // --- MODIFICATION START: Updated useEffect hook ---
  // Load FRES when the component mounts and whenever the essay changes
  useEffect(() => {
    if (essay && essay.length > 0) { // Ensure essay has data before loading
      loadFRES();
      loadPsychScores();
    } else {
      setFres(null); // If essay is empty, clear the FRES
      setAsl(null);  // If essay is empty, clear the ASL
      setAsw(null); // If essay is empty, clear the ASW
      setPsychScores(null);
      setReadabilityLoading(false); // Also clear loading state
      setPsychLoading(false);
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

      const psychScoresForSuggestion = psychScores ?? (await loadPsychScores());
      const [readabilityRes, psychRes] = await Promise.all([
        fetch("/api/readability_suggestion", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fres, asl, asw, text, essay, userLevel }),
        }),
        psychScoresForSuggestion
          ? fetch("/api/psycholinguistic_suggestion", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text,
                scores: psychScoresForSuggestion,
                targetProfile: userLevel,
              }),
            })
          : Promise.resolve(null),
      ]);

      let readabilityItems: FeedbackItem[] = [];
      let readabilityData: any = null;
      let readabilityError: string | null = null;

      if (readabilityRes.ok) {
        readabilityData = await readabilityRes.json();
        if (readabilityData.success && Array.isArray(readabilityData.feedbackItems)) {
          readabilityItems = readabilityData.feedbackItems.map((item: FeedbackItem) => ({
            ...item,
            source: READABILITY_SOURCE_ID,
            provider: READABILITY_PROVIDER_NAME,
          }));
          setParsedReadabilityFeedback(readabilityItems);
        } else {
          readabilityError =
            readabilityData?.message || "Invalid readability suggestion data";
        }
      } else {
        const errorData = await readabilityRes.json().catch(() => ({}));
        console.error("Fetch Readability Suggestion Error:", errorData);
        readabilityError =
          errorData?.message || "Failed to fetch readability suggestion";
      }

      let psychFeedbackItems: FeedbackItem[] = [];
      let psychSuggestionData: any = null;
      let psychError: string | null = null;
      if (psychRes) {
        if (psychRes.ok) {
          psychSuggestionData = await psychRes.json();
          if (psychSuggestionData?.success) {
            psychFeedbackItems = parsePsychSuggestionToFeedbackItems(psychSuggestionData, essay);
          } else {
            psychError =
              psychSuggestionData?.error || "Invalid psycholinguistic suggestion data";
          }
        } else {
          const psychErrorData = await psychRes.json().catch(() => ({}));
          console.error("Fetch Psycholinguistic Suggestion Error:", psychErrorData);
          psychError =
            psychErrorData?.error || "Failed to fetch psycholinguistic suggestion";
        }
      }

      if (readabilityError && psychError) {
        setReadabilitySuggestion(
          `Readability: ${readabilityError}; Psycholinguistic: ${psychError}`,
        );
      } else if (readabilityError) {
        setReadabilitySuggestion(`Readability: ${readabilityError}`);
      } else {
        setReadabilitySuggestion(null);
      }

      const currentFeedbackInStore = useFeedbackStore.getState().feedback;
      const nonGeneratedFeedback = currentFeedbackInStore.filter(
        (f) => f.source !== READABILITY_SOURCE_ID && f.source !== PSYCH_SOURCE_ID
      );
      const updatedFeedbackList = [
        ...nonGeneratedFeedback,
        ...readabilityItems,
        ...psychFeedbackItems,
      ];
      useFeedbackStore.getState().setFeedback(updatedFeedbackList);

      const { feedbackSource, setFeedbackSource } =
        useFeedbackSourceStore.getState();

      const readabilitySummary = readabilityItems
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

      const psychSummary =
        psychSuggestionData?.suggestion?.summary ||
        (Array.isArray(psychSuggestionData?.suggestion?.priority_actions)
          ? psychSuggestionData.suggestion.priority_actions
              .map((item: any) => item?.instruction || item?.reason || "")
              .filter(Boolean)
              .join("\n")
          : "") ||
        psychFeedbackItems.map((item) => item.content).join("\n\n") ||
        psychSuggestionData?.suggestion?.raw ||
        psychSuggestionData?.error;

      const psychProviderCard: FeedbackSourceItem = {
        id: PSYCH_SOURCE_ID,
        provider: PSYCH_PROVIDER_NAME,
        content:
          psychSummary || "Psycholinguistic suggestions generated via Qwen-Plus.",
      };

      const nextFeedbackSource = feedbackSource.filter(
        (source) =>
          source.id !== READABILITY_SOURCE_ID && source.id !== PSYCH_SOURCE_ID
      );
      if (readabilityItems.length > 0) {
        nextFeedbackSource.push(readabilityProviderCard);
      }
      if (psychFeedbackItems.length > 0 || !!psychSummary) {
        nextFeedbackSource.push(psychProviderCard);
      }

      //setShowPlan(readabilityItems.length > 0 || psychFeedbackItems.length > 0 || !!psychSummary);

      setFeedbackSource(nextFeedbackSource);
    } catch (error) {
      console.error("Failed to fetch readability suggestion:", error);
      setReadabilitySuggestion("Error: Failed to fetch suggestion.");
    } finally {
      setSuggestionLoading(false);
    }
  };
  // --- MODIFICATION END ---

const renderMetricComparison = (value: number, type: 'FRES' | 'ASL' | 'ASW') => {
    // 1. 鑾峰彇褰撳墠閰嶇疆
    const config = userLevelConfigs[userLevel] || userLevelConfigs['general'];
    
    // 2. 纭畾鐩爣鍊?
    let target = 0;
    if (type === 'FRES') {
        target = (config.MIN_TARGET + config.MAX_TARGET) / 2;
    } else if (type === 'ASL') {
        target = config.ASL_BENCHMARK;
    } else if (type === 'ASW') {
        target = config.ASW_BENCHMARK;
    }

    // 3. 璁＄畻宸€?
    const diff = value - target;
    
    // 濡傛灉宸€奸潪甯稿皬锛屼笉鏄剧ず
    if (Math.abs(diff) < 0.05) return null;

    // 4. 鏍规嵁闇€姹傚畾涔夐鑹插拰鍥炬爣鏂瑰悜
    // 闇€姹傦細绾㈣壊鍚戜笂绠ご浠ｈ〃瓒呭嚭 (diff > 0)锛岀豢鑹插悜涓嬬澶翠唬琛ㄤ綆浜?(diff < 0)
    const isHigh = diff > 0;
    
    return (
        <span className="ml-2 inline-flex items-center gap-0.5" title={`Target: ${target}`}>
            {isHigh ? (
                 // Red Up Arrow
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-red-500">
                  <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                </svg>
            ) : (
                 // Green Down Arrow
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-green-500">
                  <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                </svg>
            )}
            
            {/* 鏁板瓧鏄剧ず (棰滆壊璺熼殢绠ご) */}
            <span className={`text-xs font-bold ${isHigh ? 'text-red-500' : 'text-green-500'}`}>
                {Math.abs(diff).toFixed(1)}
            </span>
        </span>
    );
};

const renderPsychMetricComparison = (
  value: number,
  type: "meanAoA" | "lateAoARatio" | "meanConcreteness" | "abstractRatio"
) => {
  const config = psychBenchmarkConfigs[userLevel] || psychBenchmarkConfigs.general;
  const target = config[type];
  const diff = value - target;

  if (Math.abs(diff) < 0.005) return null;
  const isHigh = diff > 0;
  const diffText =
    type === "lateAoARatio" || type === "abstractRatio"
      ? Math.abs(diff).toFixed(2)
      : Math.abs(diff).toFixed(1);

  return (
    <span className="ml-2 inline-flex items-center gap-0.5" title={`Target: ${target.toFixed(2)}`}>
      {isHigh ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-red-500">
          <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-green-500">
          <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
        </svg>
      )}
      <span className={`text-xs font-bold ${isHigh ? "text-red-500" : "text-green-500"}`}>
        {diffText}
      </span>
    </span>
  );
};

  return (
    <>
      {/* --- MODIFICATION START: Updated Readability Display (show FRES, ASL, ASW, and formula) --- */}
      <div
        className={cn(
          "bg-base-100 shadow-md rounded-md px-3 py-2 z-50",
          dashboardOnly ? "h-full w-full shadow-none border-0" : "absolute right-4 top-4",
        )}
        style={{ border: dashboardOnly ? "none" : "1px solid rgba(255,255,255,0.15)" }}
      >
        <div className="flex h-full flex-col gap-3">
          <div className="grid grid-cols-[180px_1fr_auto] items-center gap-3 border-b border-base-300 pb-2">
            <div className="text-2xs font-semibold uppercase opacity-60 whitespace-nowrap">
              Target Audience Level
            </div>
            <div className="flex flex-row flex-wrap gap-1">
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
            <button
              onClick={fetchReadabilitySuggestion}
              disabled={suggestionLoading}
              className="btn btn-xs btn-outline"
            >
              {suggestionLoading ? "Generating..." : "Get Suggestion"}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs opacity-50 mb-1">Readability</p>
              {readabilityLoading ? (
                <span>Calculating...</span>
              ) : typeof fres === "number" && typeof asl === "number" && typeof asw === "number" ? (
                <div className="space-y-1">
                  <div className="flex items-center">
                    <span>FRES: {fres.toFixed(1)}</span>
                    {renderMetricComparison(fres, "FRES")}
                  </div>
                  <div className="flex items-center">
                    <span>ASL: {asl.toFixed(2)}</span>
                    {renderMetricComparison(asl, "ASL")}
                  </div>
                  <div className="flex items-center">
                    <span>ASW: {asw.toFixed(2)}</span>
                    {renderMetricComparison(asw, "ASW")}
                  </div>
                  <div className="text-2xs opacity-70">
                    FRES = 206.835 - 1.015*ASL - 84.6*ASW
                  </div>
                </div>
              ) : (
                <span>N/A</span>
              )}
            </div>

            <div>
              <p className="text-xs opacity-50 mb-1">Psycholinguistic</p>
              {psychLoading ? (
                <span>Calculating...</span>
              ) : psychScores ? (
                <div className="space-y-1">
                  <div className="flex items-center">
                    <span>AoA Mean: {psychScores.aoa.meanAoA.toFixed(2)}</span>
                    {renderPsychMetricComparison(psychScores.aoa.meanAoA, "meanAoA")}
                  </div>
                  <div className="flex items-center">
                    <span>Late AoA Ratio: {psychScores.aoa.lateAoARatio.toFixed(2)}</span>
                    {renderPsychMetricComparison(psychScores.aoa.lateAoARatio, "lateAoARatio")}
                  </div>
                  <div className="flex items-center">
                    <span>Concreteness Mean: {psychScores.concreteness.meanConcreteness.toFixed(2)}</span>
                    {renderPsychMetricComparison(psychScores.concreteness.meanConcreteness, "meanConcreteness")}
                  </div>
                  <div className="flex items-center">
                    <span>Abstract Ratio: {psychScores.concreteness.abstractRatio.toFixed(2)}</span>
                    {renderPsychMetricComparison(psychScores.concreteness.abstractRatio, "abstractRatio")}
                  </div>
                </div>
              ) : (
                <span>N/A</span>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* --- MODIFICATION END --- */}
      {!dashboardOnly && (
        <>
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
              鈫?
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
      )}
    </>
  );
};

export default Menu;
