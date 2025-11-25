import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. 接收前端发送的当前指标和文本
    const { fres, asl, asw, text } = await request.json();

    const apiKey = process.env.DASHSCOPE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "DASHSCOPE_API_KEY is not set in environment variables." },
        { status: 500 }
      );
    }

    if (typeof fres !== 'number' || typeof asl !== 'number' || typeof asw !== 'number' || typeof text !== 'string') {
      return NextResponse.json(
        { error: "Invalid input data. Expected fres, asl, asw as numbers and text as string." },
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

Provide 3-5 specific, actionable suggestions to improve readability towards the target range, focusing on the most impactful changes based on ASL and ASW.

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
      return NextResponse.json(
        { error: `DashScope API request failed: ${response.status} ${response.statusText}`, details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    // console.log("DashScope Raw Response:", data); // For debugging

    // 4. 解析 DashScope 响应
    let suggestionText = "Unable to generate suggestion.";
    if (data && data.output && data.output.choices && data.output.choices.length > 0) {
        suggestionText = data.output.choices[0].message.content || "Received empty suggestion.";
    } else {
        console.error("DashScope API response missing expected fields:", data);
    }

    // 5. 返回建议给前端
    return NextResponse.json({ suggestion: suggestionText });

  } catch (error) {
    console.error("Readability Suggestion API error:", error);
    return NextResponse.json(
      { error: "Failed to generate readability suggestion." },
      { status: 500 }
    );
  }
}