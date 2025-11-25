import { NextResponse } from "next/server";

// ----------------------
// 1. Count syllables
// ----------------------
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return 0;

  const vowels = "aeiouy";
  let syllables = 0;
  let prevVowel = false;

  for (const char of word) {
    const isVowel = vowels.includes(char);
    if (isVowel && !prevVowel) {
      syllables++;
    }
    prevVowel = isVowel;
  }

  // silent e
  if (word.endsWith("e") && syllables > 1) {
    syllables--;
  }

  return Math.max(1, syllables);
}

// ----------------------
// 2. ASW
// ----------------------
function averageSyllablesPerWord(text: string): number {
  const words = text.match(/[a-zA-Z]+/g) || [];
  if (!words.length) return 0;

  let total = 0;
  for (const w of words) total += countSyllables(w);
  return total / words.length;
}

// ----------------------
// 3. ASL
// ----------------------
function averageSentenceLength(text: string): number {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const words = text.match(/[a-zA-Z]+/g) || [];
  return sentences.length === 0 ? 0 : words.length / sentences.length;
}

// ----------------------
// 4. Compute FRES
// ----------------------
function computeFRES(text: string) {
  const ASL = averageSentenceLength(text);
  const ASW = averageSyllablesPerWord(text);
  const FRES = 206.835 - 1.015 * ASL - 84.6 * ASW;
  return { ASL, ASW, FRES }; // 返回 ASL, ASW, FRES
}

// ----------------------
// 5. POST API route (Modified)
// ----------------------
export async function POST(request: Request) {
  try {
    const { text } = await request.json(); // 从请求体获取文本

    if (typeof text !== 'string' || text.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or empty text provided.",
        },
        { status: 400 } // 400 表示客户端错误
      );
    }

    const scores = computeFRES(text); // 使用传入的 text 计算

    return NextResponse.json({
      success: true,
      scores, // 包含 ASL, ASW, FRES
    });
  } catch (err) {
    console.error("Readability API error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to compute readability.",
      },
      { status: 500 }
    );
  }
}
