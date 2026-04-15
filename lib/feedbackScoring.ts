type ActionabilityScoreInput = {
  type: string;
  detection?: number[];
  highlightWords?: string[];
  revisedContent?: string;
  wordCount?: number;
  isFallback?: boolean;
};

const GENERIC_REVISION_PATTERNS = [
  /^simpler term$/i,
  /^specific example$/i,
  /^more concrete phrase$/i,
  /^use a more suitable synonym$/i,
  /^fallback asl action:/i,
  /^split or combine one sentence to move asl toward benchmark\.?$/i,
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function countWords(value: string): number {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function isGenericRevision(revisedContent: string): boolean {
  const trimmed = revisedContent.trim();
  if (!trimmed) return true;
  return GENERIC_REVISION_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function getLocalizabilityScore(
  detectionCount: number,
  highlightCount: number,
): number {
  if (detectionCount > 0 && highlightCount > 0) return 1;
  if (detectionCount > 0) return 0.82;
  if (highlightCount > 0) return 0.68;
  return 0.3;
}

function getScopeScore(type: string, lexicalSpan: number): number {
  const normalizedType = type.trim().toLowerCase();

  if (normalizedType === "asl") return 0.42;
  if (lexicalSpan <= 1) return normalizedType === "concreteness" ? 0.92 : 1;
  if (lexicalSpan <= 3) return normalizedType === "concreteness" ? 0.78 : 0.84;
  if (lexicalSpan <= 6) return 0.66;
  return 0.52;
}

function getClarityScore(
  type: string,
  revisedContent: string,
  genericRevision: boolean,
): number {
  if (!revisedContent.trim()) return 0.2;
  if (genericRevision) return 0.35;

  const normalizedType = type.trim().toLowerCase();
  const revisedWordCount = countWords(revisedContent);

  if (normalizedType === "asl") {
    if (revisedWordCount >= 8) return 0.88;
    if (revisedWordCount >= 4) return 0.8;
    return 0.65;
  }

  if (revisedWordCount <= 3) return 1;
  if (revisedWordCount <= 6) return 0.9;
  return 0.8;
}

function getConfidenceScore(
  detectionCount: number,
  highlightCount: number,
  isFallback: boolean,
  genericRevision: boolean,
): number {
  if (isFallback) return 0.2;
  if (detectionCount > 0 && highlightCount > 0) return genericRevision ? 0.82 : 1;
  if (detectionCount > 0 || highlightCount > 0) return genericRevision ? 0.68 : 0.82;
  return genericRevision ? 0.35 : 0.5;
}

export function computeActionabilityScore(
  input: ActionabilityScoreInput,
): number {
  const detectionCount = input.detection?.length ?? 0;
  const highlightCount =
    input.highlightWords?.filter((word) => word.trim().length > 0).length ?? 0;
  const revisedContent = input.revisedContent?.trim() ?? "";
  const lexicalSpan = Math.max(input.wordCount ?? 0, highlightCount, 1);
  const genericRevision = isGenericRevision(revisedContent);

  const localizability = getLocalizabilityScore(detectionCount, highlightCount);
  const scope = getScopeScore(input.type, lexicalSpan);
  const clarity = getClarityScore(input.type, revisedContent, genericRevision);
  const confidence = getConfidenceScore(
    detectionCount,
    highlightCount,
    input.isFallback ?? false,
    genericRevision,
  );

  const score =
    0.35 * localizability +
    0.25 * scope +
    0.25 * clarity +
    0.15 * confidence;

  const adjustedScore =
    score *
    (input.isFallback ? 0.65 : 1) *
    (genericRevision && !(input.isFallback ?? false) ? 0.85 : 1);

  return Number(clamp(adjustedScore, 0.2, 1).toFixed(3));
}
