import { NextResponse } from "next/server";

const userLevelConfigs = {
  'simple': { MIN_TARGET: 80, MAX_TARGET: 90, ASL_BENCHMARK: 15, ASW_BENCHMARK: 1.3 },
  'general': { MIN_TARGET: 60, MAX_TARGET: 70, ASL_BENCHMARK: 20, ASW_BENCHMARK: 1.5 },
  'knowledgeable': { MIN_TARGET: 30, MAX_TARGET: 50, ASL_BENCHMARK: 25, ASW_BENCHMARK: 1.7 },
};

// 定义 FeedbackItem 的类型（确保与您的 lib/type.tsx 中定义一致）
type FeedbackItem = {
  id: number; // 使用 number，以便前端沿用现有逻辑
  source: number;
  provider: string;
  content: string;
  type: string;
  actionability: number;
  specificity: number;
  justification: number;
  sentiment: number;
  detection: number[]; // 这是关键，用于定位原文句子的 ID 数组
  sentence_count: number;
  word_count: number;
  none: number;
  // 可以添加自定义字段来存储修订内容
  revisedContent?: string; // 可选字段，存储修订示例
};

// --- MODIFICATION START: Rename 'details' field to avoid conflict ---
// 定义 API 响应的类型
type ReadabilitySuggestionResponse = {
  success: boolean;
  feedbackItems?: FeedbackItem[];
  message?: string;
  dashscopeErrorDetails?: any; // 重命名字段，避免与 DashScope API 的 'details' 冲突
};
// --- MODIFICATION END ---

export async function POST(request: Request) {
  try {
    // 1. 接收前端发送的当前指标、文本和句子信息
    const { fres, asl, asw, text, essay, userLevel } = await request.json(); // <--- 添加 userLevel 参数

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

    // 根据用户选择的级别获取对应的配置
    type UserLevel = 'simple' | 'general' | 'knowledgeable';
    const level: UserLevel = (userLevel === 'simple' || userLevel === 'general' || userLevel === 'knowledgeable') 
      ? userLevel as UserLevel
      : 'general'; // 默认使用 'general'
    const config = userLevelConfigs[level];

    // 2. 创建独立的 Prompt 模板函数
    const createASLPrompt = (fres: number, asl: number, asw: number, text: string) => {
      // 定义目标范围
      const MIN_TARGET = config.MIN_TARGET;
      const MAX_TARGET = config.MAX_TARGET;
    
      // 1. 确定优化方向和具体指令
      let goalDescription = "";
      let specificInstructions = "";
    
      if (fres < MIN_TARGET) {
        // 场景 A：分数太低（太难），需要增加分数 -> 降低 ASL
        goalDescription = `The current FRES (${fres}) is BELOW the target range (${MIN_TARGET}-${MAX_TARGET}). The text is too difficult to read. We need to **INCREASE** the score by **DECREASING** Average Sentence Length (ASL).`;
        specificInstructions = `
    - **Shorten sentences:** Break long, complex sentences into two or more shorter sentences.
    - **Reduce complexity:** Remove unnecessary relative clauses or separate them into standalone sentences.
    - **Simplify structure:** Avoid excessive use of semi-colons or conjunctions that string many ideas together.
    - **Aim for clarity:** Make the text punchier and more direct.`;
    
      } else if (fres > MAX_TARGET) {
        // 场景 B：分数太高（太简单），需要降低分数 -> 增加 ASL
        goalDescription = `The current FRES (${fres}) is ABOVE the target range (${MIN_TARGET}-${MAX_TARGET}). The text is too simple or choppy. We need to **DECREASE** the score by **INCREASING** Average Sentence Length (ASL) to achieve a more professional or mature flow.`;
        specificInstructions = `
    - **Combine sentences:** Merge short, choppy sentences into compound or complex sentences using appropriate conjunctions (and, but, although, because).
    - **Increase flow:** Use subordinating clauses to show relationships between ideas rather than listing them separately.
    - **Vary sentence structure:** Introduce introductory phrases or dependent clauses to add rhythm and depth.
    - **Avoid fragmentation:** Ensure the text reads as a cohesive narrative rather than a list of simple statements.`;
    
      } else {
        // 场景 C：分数在范围内
        goalDescription = `The current FRES (${fres}) is WITHIN the target range (${MIN_TARGET}-${MAX_TARGET}). The readability is generally good.`;
        specificInstructions = `
    - Focus on maintaining the current Average Sentence Length while ensuring sentence variety.
    - Only suggest changes if a specific sentence is awkwardly long or monotonously short.
    - Ensure the rhythm of the text is engaging.`;
      }
    
      // 2. 生成最终 Prompt
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
    Provide 3-5 specific, actionable suggestions as many as possible. For each suggestion, provide an example in this format:
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
    
      let goalDescription = "";
      let specificInstructions = "";
    
      if (fres < MIN_TARGET) {
        // 场景 A：分数太低（太难） -> 需要降低 ASW
        goalDescription = `The current FRES (${fres}) is BELOW the target range (${MIN_TARGET}-${MAX_TARGET}). The vocabulary is likely too complex or academic. We need to **INCREASE** the score by **DECREASING** Average Syllables per Word (ASW).`;
        specificInstructions = `
    - **Simplify Vocabulary:** Replace long, multi-syllable words with shorter, simpler synonyms (e.g., use "buy" instead of "purchase", "use" instead of "utilize").
    - **Remove Jargon:** Replace technical or bureaucratic jargon with plain English alternatives.
    - **Explain Simply:** If a complex word is necessary, ensure it is the simplest version possible.
    - **Aim for Accessibility:** Make the word choices understandable to a wider audience.`;
    
      } else if (fres > MAX_TARGET) {
        // 场景 B：分数太高（太简单） -> 需要提高 ASW
        goalDescription = `The current FRES (${fres}) is ABOVE the target range (${MIN_TARGET}-${MAX_TARGET}). The vocabulary may feel too childish, generic, or repetitive. We need to **DECREASE** the score by **INCREASING** Average Syllables per Word (ASW) to achieve a more professional tone.`;
        specificInstructions = `
    - **Enhance Precision:** Replace generic, single-syllable words with more precise, multi-syllable alternatives (e.g., use "demonstrate" instead of "show", "significant" instead of "big").
    - **Elevate Tone:** Use more professional or sophisticated vocabulary suitable for a business or educated context.
    - **Avoid Repetition:** Use varied synonyms to add depth to the writing.
    - **Specific Terminology:** Use industry-appropriate terminology where it adds clarity and authority, even if the words are longer.`;
    
      } else {
        // 场景 C：分数达标
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
    Provide 3-5 specific, actionable suggestions. For each suggestion, provide an example in this format:
    - **Original:** "[exact sentence from the original text]"
    - **Revised:** "[suggested revision of that sentence]" (Ensure the sentence structure remains mostly the same, but the vocabulary changes to reflect the goal of ${fres < MIN_TARGET ? "simplifying" : "elevating"} word choice)
    
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

    // 3. 改进的分流机制：基于“基准偏差”而非“扣分权重”

    // --- 配置基准线 (根据 Plain English 标准设定) ---
    const BENCHMARK_ASL = config.ASL_BENCHMARK;  // 理想最大句长
    const BENCHMARK_ASW = config.ASW_BENCHMARK; // 理想最大音节密度 (1.4-1.5 是分水岭)

    // 假设你已经有了 fres, asl, asw, userLevelConfigs 等变量

    // 1. 获取目标配置
    const TARGET_MID = (config.MIN_TARGET + config.MAX_TARGET) / 2;

    // 2. 计算偏差
    const fresGap = Math.abs(fres - TARGET_MID);
    const isTooHard = fres < config.MIN_TARGET;
    const isTooEasy = fres > config.MAX_TARGET;

    // 初始化 flag
    let finalShouldCallASL = false;
    let finalShouldCallASW = false;

    // === 修改后的激进逻辑 ===

    if (isTooHard || isTooEasy) {
        // 策略：如果 FRES 偏差超过 5 分 (Gap > 5)，这通常意味着结构性问题，
        // 单靠修 ASL 或 ASW 很难拉回来，必须双管齐下。
        if (fresGap > 5) {
            finalShouldCallASL = true;
            finalShouldCallASW = true;
        } 
        // 如果偏差较小 (5分以内)，再看具体是谁在拖后腿
        else {
            // ASL 只要有一点点超标 (比如 > benchmark + 1) 就修
            if (Math.abs(asl - config.ASL_BENCHMARK) > 1) {
                finalShouldCallASL = true;
            }
            // ASW 只要有一点点超标 (比如 > benchmark + 0.05) 就修
            // ASW 的系数是 84.6，非常敏感，所以稍微超标就要修
            if (Math.abs(asw - config.ASW_BENCHMARK) > 0.05) {
                finalShouldCallASW = true;
            }
            
            // 兜底：如果上面都没命中，但总分依然不达标，默认开 ASW (因为它对分数影响最大)
            if (!finalShouldCallASL && !finalShouldCallASW) {
                finalShouldCallASW = true; 
            }
        }
    }
    // else { 分数达标，不调用 }


    // 4. 辅助函数：调用 DashScope API
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

    // 5. 分别调用 API（如果需要）
    const allSuggestionTexts: Array<{ text: string; type: "ASL" | "ASW" }> = [];

    if (finalShouldCallASL) {
      try {
        const aslPrompt = createASLPrompt(fres, asl, asw, text);
        const aslText = await callDashScopeAPI(aslPrompt);
        if (aslText && aslText.trim().length > 50) { // 确保有实际内容
          allSuggestionTexts.push({ text: aslText, type: "ASL" });
        }
      } catch (error) {
        console.error("Failed to fetch ASL suggestions:", error);
        // 继续处理其他请求，不中断
      }
    }

    if (finalShouldCallASW) {
      try {
        const aswPrompt = createASWPrompt(fres, asl, asw, text);
        const aswText = await callDashScopeAPI(aswPrompt);
        if (aswText && aswText.trim().length > 50) { // 确保有实际内容
          allSuggestionTexts.push({ text: aswText, type: "ASW" });
        }
      } catch (error) {
        console.error("Failed to fetch ASW suggestions:", error);
        // 继续处理其他请求，不中断
      }
    }

    // 如果没有任何建议生成，返回错误
    if (allSuggestionTexts.length === 0) {
      return NextResponse.json<ReadabilitySuggestionResponse>(
        { success: false, message: "Failed to generate any readability suggestions. Please check the API response." },
        { status: 500 }
      );
    }

    // 6. 解析所有 suggestion texts 并创建 FeedbackItems
    const feedbackItems: FeedbackItem[] = [];
    const readabilityFeedbackIdBase = 999000;

    // 辅助函数：解析单个 suggestion text
    const parseSuggestionText = (suggestionText: string, type: "ASL" | "ASW") => {
      const lines = suggestionText.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // 查找包含 "Original:" 的行
        if (line.includes('**Original:**')) {
          const originalMatch = line.match(/\*\*Original:\*\*\s*"([^"]+)"/);
          if (originalMatch) {
            const originalSentence = originalMatch[1].trim(); // 提取并去除首尾空格

            // 在 essay 数组中查找匹配的句子
            const matchedSentenceIndex = essay.findIndex(s => s.content.includes(originalSentence) || originalSentence.includes(s.content));

            if (matchedSentenceIndex !== -1) {
              const detectionId = essay[matchedSentenceIndex].id; // 获取原文句子的 ID

              // 查找下一个 "Revised:" 行作为详细内容
              let revisedContent = "No revised content found.";
              for (let j = i + 1; j < lines.length; j++) {
                if (lines[j].includes('**Revised:**')) {
                  const revisedMatch = lines[j].match(/\*\*Revised:\*\*\s*"([^"]+)"/);
                  if (revisedMatch) {
                    revisedContent = revisedMatch[1].trim(); // 提取并去除首尾空格
                  }
                  break; // 找到后跳出内层循环
                }
                // 如果遇到下一个建议项（如 "###" 或另一个 "Original:"），则停止查找 Revised
                if (lines[j].startsWith('###') || lines[j].includes('**Original:**')) {
                  break;
                }
              }

              // 创建反馈项对象，使用对应的 type
              const feedbackItem: FeedbackItem = {
                id: readabilityFeedbackIdBase + feedbackItems.length,
                source: 0, // 使用一个特殊数字表示是readability suggestion
                provider: "Qwen-MAX (Readability)",
                content: `Readability Suggestion: ${originalSentence.substring(0, 50)}...`,
                type: type, // 使用 ASL 或 ASW
                actionability: 0.8 + Math.random() * 0.2,
                specificity: 1,
                justification: 0.7 + Math.random() * 0.3,
                sentiment: 0,
                detection: [detectionId], // 关键：将找到的原文 ID 放入数组
                sentence_count: 1,
                word_count: originalSentence.split(/\s+/).length,
                none: 0,
                revisedContent: revisedContent
              };

              feedbackItems.push(feedbackItem);
            } else {
              console.warn(`Original sentence not found in essay: "${originalSentence}"`);
            }
          }
        }
      }
    };

    // 解析所有 suggestion texts
    for (const { text, type } of allSuggestionTexts) {
      parseSuggestionText(text, type);
    }

    // 7. 返回解析后的反馈项数组给前端（包含 ASL 和/或 ASW 的建议）
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