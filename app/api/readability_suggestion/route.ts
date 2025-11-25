import { NextResponse } from "next/server";

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
    const { fres, asl, asw, text, essay } = await request.json(); // <--- 添加 essay 参数

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

    // 2. 构建 Prompt (使用您之前重构的 Prompt)
    const prompt = `
You are an expert writing coach analyzing text readability using the Flesch Reading-Ease Score (FRES).

The target FRES range for "Plain English" is 60 to 70.
The FRES formula is: FRES = 206.835 - 1.015 * (Average Sentence Length) - 84.6 * (Average Syllables per Word).
- Average Sentence Length (ASL) is the average number of words per sentence.
- Average Syllables per Word (ASW) is the average number of syllables per word.

For the provided text:
- Current FRES: ${fres}
- Current ASL: ${asl}
- Current ASW: ${asw}

The goal is to achieve a FRES between 60 and 70. Based on the current FRES and the values of ASL and ASW, identify the primary readability issue(s) and provide specific, actionable revision suggestions.

- If FRES is too low (e.g., < 60), it indicates the text is difficult to read. Focus on whether ASL is too high (long sentences) or ASW is too high (complex words), or both, and suggest targeted changes (e.g., "Break sentence X into two shorter ones" or "Replace word 'Y' with simpler 'Z'").
- If FRES is too high (e.g., > 70), it indicates the text is too simple. This is generally less common for improvement goals but could involve suggesting slightly more formal language if appropriate, though this is often not the primary concern.
- If FRES is within 60-70, you can provide a positive note or suggest minor enhancements.

Provide 3-5 specific, actionable suggestions to improve readability towards the target range, focusing on the most impactful changes based on ASL and ASW. For each suggestion, if possible, provide an example in the format:
- **Original:** "[exact sentence from the original text]"
- **Revised:** "[suggested revision of that sentence]"

Original text:
"${text}"

Suggestions:
1. ...
2. ...
3. ...
...
    `.trim();

    // 3. 调用 DashScope API (直接 HTTP 请求)
    const response = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen-max", // 选择合适的模型
        input: {
          messages: [
            { role: "system", content: "You are a helpful assistant." }, // 可选
            { role: "user", content: prompt }
          ]
        },
        parameters: {
            result_format: "message",
            // temperature: 0.7, // 可选参数
            // max_tokens: 500, // 可选参数，根据需要调整
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // 防止解析错误
      console.error("DashScope API Error:", response.status, response.statusText, errorData);
      // --- MODIFICATION START: Use renamed field ---
      return NextResponse.json<ReadabilitySuggestionResponse>(
        { success: false, message: `DashScope API request failed: ${response.status} ${response.statusText}`, dashscopeErrorDetails: errorData }, // 使用新的字段名
        { status: response.status }
      );
      // --- MODIFICATION END ---
    }

    const data = await response.json();
    // console.log("DashScope Raw Response:", data); // For debugging

    // 4. 解析 DashScope 响应
    let suggestionText = "Unable to generate suggestion.";
    if (data && data.output && data.output.choices && data.output.choices.length > 0) {
        suggestionText = data.output.choices[0].message.content || "Received empty suggestion.";
    } else {
        console.error("DashScope API response missing expected fields:", data);
        return NextResponse.json<ReadabilitySuggestionResponse>(
            { success: false, message: "DashScope API returned invalid response structure." },
            { status: 500 }
        );
    }

    // --- MODIFICATION START: Parse the suggestion text and match to essay ---
    const feedbackItems: FeedbackItem[] = [];
    const readabilityFeedbackIdBase = 999000;
    const lines = suggestionText.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // 查找包含 "Original:" 的行
      if (line.includes('**Original:**')) {
        const originalMatch = line.match(/\*\*Original:\*\*\s*"([^"]+)"/);
        if (originalMatch) {
          const originalSentence = originalMatch[1].trim(); // 提取并去除首尾空格

          // 在 essay 数组中查找匹配的句子
          const matchedSentenceIndex = essay.findIndex(s => s.content.includes(originalSentence) || originalSentence.includes(s.content)); // 可能需要更精确的匹配逻辑

          if (matchedSentenceIndex !== -1) {
            // 找到匹配，获取其 ID (Synthia 通常使用 0-based index 作为 ID，但 data 文件中有时是 1-based)
            // 假设 essay[s].id 是 0-based，如果是 1-based 则 detectionId = matchedSentenceIndex + 1
            // 为了兼容性，先假设是 0-based index 作为 ID，或者直接使用索引
            // 但根据 feedback1.ts 示例，detection 是 1-based ID，所以需要检查 essay 结构
            // console.log("Essay Item Example:", essay[0]); // Debug: Check essay structure
            // 假设 essay[i] 有 id 字段，且是 1-based
            const detectionId = essay[matchedSentenceIndex].id; // <--- 获取原文句子的 ID

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

            // 创建反馈项对象 (符合 FeedbackItem 类型)
            const feedbackItem: FeedbackItem = {
              id: readabilityFeedbackIdBase + feedbackItems.length,
              source: 999, // 使用一个特殊数字表示是readability suggestion
              provider: "Qwen-MAX (Readability)",
              content: `Readability Suggestion: ${originalSentence.substring(0, 50)}...`, // 或者是建议的类型，如 "Break Long Sentences"
              type: "Readability",
              actionability: 1,
              specificity: 0.7, // 示例值
              justification: 1,
              sentiment: 0, // 示例值
              detection: [detectionId], // 关键：将找到的原文 ID 放入数组
              sentence_count: 1, // 示例值
              word_count: originalSentence.split(/\s+/).length, // 示例值
              none: 0, // 示例值
              // 添加自定义字段来存储 revised 内容，方便后续显示
              revisedContent: revisedContent
            };

            feedbackItems.push(feedbackItem);
          } else {
              console.warn(`Original sentence not found in essay: "${originalSentence}"`);
          }
        }
      }
    }
    // --- MODIFICATION END ---

    // 5. 返回解析后的反馈项数组给前端
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