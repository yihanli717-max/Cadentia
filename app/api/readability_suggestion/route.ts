import { NextResponse } from "next/server";

const userLevelConfigs = {
  'simple': { MIN_TARGET: 80, MAX_TARGET: 90, ASL_BENCHMARK: 15, ASW_BENCHMARK: 1.3 },
  'general': { MIN_TARGET: 60, MAX_TARGET: 70, ASL_BENCHMARK: 20, ASW_BENCHMARK: 1.5 },
  'knowledgeable': { MIN_TARGET: 30, MAX_TARGET: 50, ASL_BENCHMARK: 25, ASW_BENCHMARK: 1.7 },
};

// 瀹氫箟 FeedbackItem 鐨勭被鍨嬶紙纭繚涓庢偍鐨?lib/type.tsx 涓畾涔変竴鑷达級
type FeedbackItem = {
  id: number; // 浣跨敤 number锛屼互渚垮墠绔部鐢ㄧ幇鏈夐€昏緫
  source: number;
  provider: string;
  content: string;
  type: string;
  actionability: number;
  specificity: number;
  justification: number;
  sentiment: number;
  detection: number[]; // 杩欐槸鍏抽敭锛岀敤浜庡畾浣嶅師鏂囧彞瀛愮殑 ID 鏁扮粍
  sentence_count: number;
  word_count: number;
  none: number;
  // 鍙互娣诲姞鑷畾涔夊瓧娈垫潵瀛樺偍淇鍐呭
  revisedContent?: string; // 鍙€夊瓧娈碉紝瀛樺偍淇绀轰緥
  highlightWords?: string[];
};

// --- MODIFICATION START: Rename 'details' field to avoid conflict ---
// 瀹氫箟 API 鍝嶅簲鐨勭被鍨?
type ReadabilitySuggestionResponse = {
  success: boolean;
  feedbackItems?: FeedbackItem[];
  message?: string;
  dashscopeErrorDetails?: any; // 閲嶅懡鍚嶅瓧娈碉紝閬垮厤涓?DashScope API 鐨?'details' 鍐茬獊
};
// --- MODIFICATION END ---

export async function POST(request: Request) {
  try {
    // 1. 鎺ユ敹鍓嶇鍙戦€佺殑褰撳墠鎸囨爣銆佹枃鏈拰鍙ュ瓙淇℃伅
    const { fres, asl, asw, text, essay, userLevel } = await request.json(); // <--- 娣诲姞 userLevel 鍙傛暟

    const apiKey = process.env.DASHSCOPE_API_KEY;

    if (!apiKey) {
      return NextResponse.json<ReadabilitySuggestionResponse>(
        { success: false, message: "DASHSCOPE_API_KEY is not set in environment variables." },
        { status: 500 }
      );
    }

    if (typeof fres !== 'number' || typeof asl !== 'number' || typeof asw !== 'number' || typeof text !== 'string' || !Array.isArray(essay)) {
      return NextResponse.json<ReadabilitySuggestionResponse>(
        { success: false, message: "Invalid input data. Expected fres, asl, asw as numbers, text as string, and essay as an array." },
        { status: 400 }
      );
    }

    // 鏍规嵁鐢ㄦ埛閫夋嫨鐨勭骇鍒幏鍙栧搴旂殑閰嶇疆
    type UserLevel = 'simple' | 'general' | 'knowledgeable';
    const level: UserLevel = (userLevel === 'simple' || userLevel === 'general' || userLevel === 'knowledgeable') 
      ? userLevel as UserLevel
      : 'general'; // 榛樿浣跨敤 'general'
    const config = userLevelConfigs[level];

    // 2. 鍒涘缓鐙珛鐨?Prompt 妯℃澘鍑芥暟
    const createASLPrompt = (fres: number, asl: number, asw: number, text: string) => {
      // 瀹氫箟鐩爣鑼冨洿
      const MIN_TARGET = config.MIN_TARGET;
      const MAX_TARGET = config.MAX_TARGET;
      const aslStatus = asl < config.ASL_BENCHMARK ? "below" : asl > config.ASL_BENCHMARK ? "above" : "within";
    
      // 1. 纭畾浼樺寲鏂瑰悜鍜屽叿浣撴寚浠?
      let goalDescription = "";
      let specificInstructions = "";
    
      if (fres < MIN_TARGET) {
        // 鍦烘櫙 A锛氬垎鏁板お浣庯紙澶毦锛夛紝闇€瑕佸鍔犲垎鏁?-> 闄嶄綆 ASL
        goalDescription = `The current FRES (${fres}) is BELOW the target range (${MIN_TARGET}-${MAX_TARGET}). The text is too difficult to read. We need to **INCREASE** the score by **DECREASING** Average Sentence Length (ASL).`;
        specificInstructions = `
    - **Shorten sentences:** Break long, complex sentences into two or more shorter sentences.
    - **Reduce complexity:** Remove unnecessary relative clauses or separate them into standalone sentences.
    - **Simplify structure:** Avoid excessive use of semi-colons or conjunctions that string many ideas together.
    - **Aim for clarity:** Make the text punchier and more direct.`;
    
      } else if (fres > MAX_TARGET) {
        // 鍦烘櫙 B锛氬垎鏁板お楂橈紙澶畝鍗曪級锛岄渶瑕侀檷浣庡垎鏁?-> 澧炲姞 ASL
        goalDescription = `The current FRES (${fres}) is ABOVE the target range (${MIN_TARGET}-${MAX_TARGET}). The text is too simple or choppy. We need to **DECREASE** the score by **INCREASING** Average Sentence Length (ASL) to achieve a more professional or mature flow.`;
        specificInstructions = `
    - **Combine sentences:** Merge short, choppy sentences into compound or complex sentences using appropriate conjunctions (and, but, although, because).
    - **Increase flow:** Use subordinating clauses to show relationships between ideas rather than listing them separately.
    - **Vary sentence structure:** Introduce introductory phrases or dependent clauses to add rhythm and depth.
    - **Avoid fragmentation:** Ensure the text reads as a cohesive narrative rather than a list of simple statements.`;
    
      } else {
        // 鍦烘櫙 C锛氬垎鏁板湪鑼冨洿鍐?
        goalDescription = `The current FRES (${fres}) is WITHIN the target range (${MIN_TARGET}-${MAX_TARGET}). The readability is generally good.`;
        specificInstructions = `
    - Focus on maintaining the current Average Sentence Length while ensuring sentence variety.
    - Only suggest changes if a specific sentence is awkwardly long or monotonously short.
    - Ensure the rhythm of the text is engaging.`;
      }
    
      // 2. 鐢熸垚鏈€缁?Prompt
      return `
    You are an expert writing coach analyzing text readability using the Flesch Reading-Ease Score (FRES).
    
    The target FRES range for "Plain English" is ${MIN_TARGET} to ${MAX_TARGET}.
    The FRES formula is: FRES = 206.835 - 1.015 * (Average Sentence Length) - 84.6 * (Average Syllables per Word).
    
    **Current Statistics:**
    - FRES: ${fres}
    - ASL (Words per Sentence): ${asl}
    - ASW (Syllables per Word): ${asw}
    
    **Goal:**
    ${goalDescription}
    
    **Instructions:**
    You MUST FOCUS ONLY on ASL (Average Sentence Length).
    - Do NOT propose changes that primarily simplify or complicate word choice (ASW).
    - Instead, apply the following strategies to adjust sentence length:
    ${specificInstructions}
    
    **Output Requirement:**
    Per-metric quota rule for ASL:
    - If ASL is NOT on benchmark (status: ${aslStatus}), you MUST provide 1-5 suggestions targeting ASL.
    - If ASL is on benchmark (status: ${aslStatus}), you may provide 0 suggestions.

    For each suggestion, provide an example in this format:
    - **Original:** "[exact sentence(s) from text]"
    - **Revised:** "[suggested revision]" (Make sure this revision reflects the goal of ${fres < MIN_TARGET ? "shortening" : "lengthening/combining"} sentences)
    
    Original text:
    "${text}"
    
    Suggestions:
    1. ...
    2. ...
    3. ...
    4. ...
    5. ...
    `.trim();
    };

    const createASWPrompt = (fres: number, asl: number, asw: number, text: string) => {
      const MIN_TARGET = config.MIN_TARGET;
      const MAX_TARGET = config.MAX_TARGET;
      const aswStatus = asw < config.ASW_BENCHMARK ? "below" : asw > config.ASW_BENCHMARK ? "above" : "within";
    
      let goalDescription = "";
      let specificInstructions = "";
    
      if (fres < MIN_TARGET) {
        // 鍦烘櫙 A锛氬垎鏁板お浣庯紙澶毦锛?-> 闇€瑕侀檷浣?ASW
        goalDescription = `The current FRES (${fres}) is BELOW the target range (${MIN_TARGET}-${MAX_TARGET}). The vocabulary is likely too complex or academic. We need to **INCREASE** the score by **DECREASING** Average Syllables per Word (ASW).`;
        specificInstructions = `
    - **Simplify Vocabulary:** Replace long, multi-syllable words with shorter, simpler synonyms (e.g., use "buy" instead of "purchase", "use" instead of "utilize").
    - **Remove Jargon:** Replace technical or bureaucratic jargon with plain English alternatives.
    - **Explain Simply:** If a complex word is necessary, ensure it is the simplest version possible.
    - **Aim for Accessibility:** Make the word choices understandable to a wider audience.`;
    
      } else if (fres > MAX_TARGET) {
        // 鍦烘櫙 B锛氬垎鏁板お楂橈紙澶畝鍗曪級 -> 闇€瑕佹彁楂?ASW
        goalDescription = `The current FRES (${fres}) is ABOVE the target range (${MIN_TARGET}-${MAX_TARGET}). The vocabulary may feel too childish, generic, or repetitive. We need to **DECREASE** the score by **INCREASING** Average Syllables per Word (ASW) to achieve a more professional tone.`;
        specificInstructions = `
    - **Enhance Precision:** Replace generic, single-syllable words with more precise, multi-syllable alternatives (e.g., use "demonstrate" instead of "show", "significant" instead of "big").
    - **Elevate Tone:** Use more professional or sophisticated vocabulary suitable for a business or educated context.
    - **Avoid Repetition:** Use varied synonyms to add depth to the writing.
    - **Specific Terminology:** Use industry-appropriate terminology where it adds clarity and authority, even if the words are longer.`;
    
      } else {
        // 鍦烘櫙 C锛氬垎鏁拌揪鏍?
        goalDescription = `The current FRES (${fres}) is WITHIN the target range (${MIN_TARGET}-${MAX_TARGET}). The vocabulary level is appropriate.`;
        specificInstructions = `
    - Focus on maintaining the current complexity of word choice.
    - Only suggest changes if a specific word is used incorrectly or repetitively.
    - Ensure the tone remains consistent.`;
      }
    
      return `
    You are an expert writing coach analyzing text readability using the Flesch Reading-Ease Score (FRES).
    
    The target FRES range for "Plain English" is ${MIN_TARGET} to ${MAX_TARGET}.
    The FRES formula is: FRES = 206.835 - 1.015 * (Average Sentence Length) - 84.6 * (Average Syllables per Word).
    
    **Current Statistics:**
    - FRES: ${fres}
    - ASL (Words per Sentence): ${asl}
    - ASW (Syllables per Word): ${asw}
    
    **Goal:**
    ${goalDescription}
    
    **Instructions:**
    You MUST FOCUS ONLY on ASW (Average Syllables per Word).
    - Do NOT propose changes that primarily shorten or lengthen sentences (ASL).
    - Instead, apply the following strategies to adjust word choice:
    ${specificInstructions}
    
    **Output Requirement:**
    Per-metric quota rule for ASW:
    - If ASW is NOT on benchmark (status: ${aswStatus}), you MUST provide 1-5 suggestions targeting ASW.
    - If ASW is on benchmark (status: ${aswStatus}), you may provide 0 suggestions.

    For each suggestion, provide a WORD-LEVEL replacement in this exact format:
    - **Original Word:** "[exact word from the original text]"
    - **Replacement Word:** "[single replacement word]"
    - **Context Sentence:** "[the sentence containing the original word]"
    
    Original text:
    "${text}"
    
    Suggestions:
    1. ...
    2. ...
    3. ...
    4. ...
    5. ...
    `.trim();
    };

    // 3. Readability metric routing:
    // call each model branch whenever that metric is off benchmark.
    const BENCHMARK_ASL = config.ASL_BENCHMARK;
    const BENCHMARK_ASW = config.ASW_BENCHMARK;
    const METRIC_EPSILON = 0.05;

    const finalShouldCallASL = Math.abs(asl - BENCHMARK_ASL) > METRIC_EPSILON;
    const finalShouldCallASW = Math.abs(asw - BENCHMARK_ASW) > METRIC_EPSILON;


    // 4. 杈呭姪鍑芥暟锛氳皟鐢?DashScope API
    const callDashScopeAPI = async (prompt: string): Promise<string> => {
      const response = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen-max",
          input: {
            messages: [
              { role: "system", content: "You are a helpful assistant." },
              { role: "user", content: prompt }
            ]
          },
          parameters: {
            result_format: "message",
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("DashScope API Error:", response.status, response.statusText, errorData);
        throw new Error(`DashScope API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data && data.output && data.output.choices && data.output.choices.length > 0) {
        return data.output.choices[0].message.content || "Received empty suggestion.";
      } else {
        console.error("DashScope API response missing expected fields:", data);
        throw new Error("DashScope API returned invalid response structure.");
      }
    };

    // 5. 鍒嗗埆璋冪敤 API锛堝鏋滈渶瑕侊級
    const allSuggestionTexts: Array<{ text: string; type: "ASL" | "ASW" }> = [];

    if (finalShouldCallASL) {
      try {
        const aslPrompt = createASLPrompt(fres, asl, asw, text);
        const aslText = await callDashScopeAPI(aslPrompt);
        if (aslText && aslText.trim().length > 50) { // 纭繚鏈夊疄闄呭唴瀹?
          allSuggestionTexts.push({ text: aslText, type: "ASL" });
        }
      } catch (error) {
        console.error("Failed to fetch ASL suggestions:", error);
        // 缁х画澶勭悊鍏朵粬璇锋眰锛屼笉涓柇
      }
    }

    if (finalShouldCallASW) {
      try {
        const aswPrompt = createASWPrompt(fres, asl, asw, text);
        const aswText = await callDashScopeAPI(aswPrompt);
        if (aswText && aswText.trim().length > 50) { // 纭繚鏈夊疄闄呭唴瀹?
          allSuggestionTexts.push({ text: aswText, type: "ASW" });
        }
      } catch (error) {
        console.error("Failed to fetch ASW suggestions:", error);
        // 缁х画澶勭悊鍏朵粬璇锋眰锛屼笉涓柇
      }
    }

    // If all readability metrics are on benchmark, return empty suggestions.
    if (allSuggestionTexts.length === 0) {
      return NextResponse.json<ReadabilitySuggestionResponse>(
        { success: true, feedbackItems: [] },
      );
    }

    // 6. Parse suggestion texts and build feedback items
    const feedbackItems: FeedbackItem[] = [];
    const readabilityFeedbackIdBase = 999000;
    const MAX_PER_METRIC = 5;

    const parseASLText = (suggestionText: string) => {
      const lines = suggestionText.split('\n');
      let count = 0;

      for (let i = 0; i < lines.length; i++) {
        if (count >= MAX_PER_METRIC) break;
        const line = lines[i];
        if (line.includes('**Original:**')) {
          const originalMatch = line.match(/\*\*Original:\*\*\s*"([^"]+)"/);
          if (originalMatch) {
            const originalSentence = originalMatch[1].trim();
            const matchedSentenceIndex = essay.findIndex(s => s.content.includes(originalSentence) || originalSentence.includes(s.content));

            if (matchedSentenceIndex !== -1) {
              const detectionId = essay[matchedSentenceIndex].id;

              let revisedContent = "No revised content found.";
              for (let j = i + 1; j < lines.length; j++) {
                if (lines[j].includes('**Revised:**')) {
                  const revisedMatch = lines[j].match(/\*\*Revised:\*\*\s*"([^"]+)"/);
                  if (revisedMatch) {
                    revisedContent = revisedMatch[1].trim();
                  }
                  break;
                }
                if (lines[j].startsWith('###') || lines[j].includes('**Original:**')) {
                  break;
                }
              }

              const feedbackItem: FeedbackItem = {
                id: readabilityFeedbackIdBase + feedbackItems.length,
                source: 0,
                provider: "Qwen-MAX (Readability)",
                content: `ASL Suggestion: ${originalSentence.substring(0, 50)}...`,
                type: "ASL",
                actionability: 0.8 + Math.random() * 0.2,
                specificity: 1,
                justification: 0.7 + Math.random() * 0.3,
                sentiment: 0,
                detection: [detectionId],
                sentence_count: 1,
                word_count: originalSentence.split(/\s+/).length,
                none: 0,
                revisedContent: revisedContent
              };

              feedbackItems.push(feedbackItem);
              count++;
            } else {
              console.warn(`Original sentence not found in essay: "${originalSentence}"`);
            }
          }
        }
      }
    };

    const parseASWText = (suggestionText: string) => {
      const regex =
        /\*\*Original Word:\*\*\s*"([^"]+)"[\s\S]*?\*\*Replacement Word:\*\*\s*"([^"]+)"(?:[\s\S]*?\*\*Context Sentence:\*\*\s*"([^"]+)")?/gi;
      const matches = Array.from(suggestionText.matchAll(regex)).slice(0, MAX_PER_METRIC);

      matches.forEach((match) => {
        const originalWord = (match[1] || "").trim();
        const replacementWord = (match[2] || "").trim();
        const contextSentence = (match[3] || "").trim();
        if (!originalWord || !replacementWord) return;

        const normalizedOriginal = originalWord.toLowerCase();
        const matchedSentence = contextSentence
          ? essay.find((s) => s.content.includes(contextSentence) || contextSentence.includes(s.content))
          : essay.find((s) => s.content.toLowerCase().includes(normalizedOriginal));

        const highlightWords = originalWord
          .split(/\s+/)
          .map((word) => word.trim().toLowerCase())
          .filter(Boolean);

        feedbackItems.push({
          id: readabilityFeedbackIdBase + feedbackItems.length,
          source: 0,
          provider: "Qwen-MAX (Readability)",
          content: `ASW word replacement: "${originalWord}"`,
          type: "ASW",
          actionability: 0.8 + Math.random() * 0.2,
          specificity: 1,
          justification: 0.7 + Math.random() * 0.3,
          sentiment: 0,
          detection: matchedSentence ? [matchedSentence.id] : [],
          sentence_count: matchedSentence ? 1 : 0,
          word_count: 1,
          none: 0,
          revisedContent: replacementWord,
          highlightWords,
        });
      });
    };

    for (const { text, type } of allSuggestionTexts) {
      if (type === "ASL") {
        parseASLText(text);
      } else {
        parseASWText(text);
      }
    }

    const aslCount = feedbackItems.filter((item) => item.type === "ASL").length;
    const aswCount = feedbackItems.filter((item) => item.type === "ASW").length;

    if (finalShouldCallASL && aslCount === 0) {
      feedbackItems.push({
        id: readabilityFeedbackIdBase + feedbackItems.length,
        source: 0,
        provider: "Qwen-MAX (Readability)",
        content: "ASL fallback: revise one sentence length toward benchmark.",
        type: "ASL",
        actionability: 0.75,
        specificity: 0.7,
        justification: 0.8,
        sentiment: 0,
        detection: [],
        sentence_count: 0,
        word_count: 8,
        none: 0,
        revisedContent:
          "Fallback ASL action: split or combine one sentence to move ASL toward benchmark.",
      });
    }

    if (finalShouldCallASW && aswCount === 0) {
      feedbackItems.push({
        id: readabilityFeedbackIdBase + feedbackItems.length,
        source: 0,
        provider: "Qwen-MAX (Readability)",
        content: "ASW fallback word replacement",
        type: "ASW",
        actionability: 0.75,
        specificity: 0.7,
        justification: 0.8,
        sentiment: 0,
        detection: [],
        sentence_count: 0,
        word_count: 1,
        none: 0,
        revisedContent: "use a more suitable synonym",
        highlightWords: [],
      });
    }

    // 7. Return parsed readability feedback
    return NextResponse.json<ReadabilitySuggestionResponse>(
        { success: true, feedbackItems: feedbackItems }
    );

  } catch (error) {
    console.error("Readability Suggestion API error:", error);
    return NextResponse.json<ReadabilitySuggestionResponse>(
      { success: false, message: "Failed to generate readability suggestion." },
      { status: 500 }
    );
  }
}
