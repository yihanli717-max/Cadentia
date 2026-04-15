# Cadentia - Code Architecture and Implementation Guide

Cadentia is an interactive essay revision system that combines:

- Readability analytics (FRES, ASL, ASW)
- Psycholinguistic analytics (AoA, Concreteness)
- LLM-generated revision suggestions
- Linked visual interfaces (dashboard, suggestion cards, revision tree, essay highlights)

The current implementation is built with Next.js (App Router), React, TypeScript, Zustand, and Tailwind/DaisyUI.

---

## 1. Product Workflow (Implemented)

1. User opens the app and sees the main workspace directly.
2. User writes or pastes an essay in the left panel and clicks `Submit`.
3. The app normalizes the input into sentence objects and stores it in `useEssayStore`.
4. The dashboard automatically triggers:
   - `/api/readability`
   - `/api/psycholinguistic`
5. User clicks `Get Suggestion`:
   - `/api/readability_suggestion`
   - `/api/psycholinguistic_suggestion`
6. Suggestions are rendered as Provider Cards (readability + psycholinguistics).
7. Suggestion items are mirrored in the Revision Tree as metric-specific circles.
8. Selecting circles or cards synchronizes highlighting in essay text (sentence or word level).

---

## 2. Tech Stack

- Framework: Next.js 14 (App Router)
- Language: TypeScript + React 18
- Styling: Tailwind CSS + DaisyUI
- State Management: Zustand + Immer + persist middleware
- Animation and Interaction: Framer Motion, React Contexify
- LLM and Embeddings:
  - OpenAI API
  - DashScope Qwen via OpenAI-compatible endpoint
- Data and Telemetry: Firebase (event tracking)

Key dependency versions are defined in [`package.json`](./package.json).

---

## 3. Repository Structure

```text
app/
  api/
    readability/route.ts
    psycholinguistic/route.ts
    readability_suggestion/route.ts
    psycholinguistic_suggestion/route.ts
    revision/route.ts
    regeneration/route.ts
    embeddings/route.ts
  layout.tsx
  page.tsx

components/
  EssayPanel/
  FeedbackVis/
    Menu.tsx
    RevisionTree.tsx
    PrepStation.tsx
  ProviderGallery/
  Header.tsx

lib/
  store.tsx
  type.tsx
  utils.tsx

data/
  essay*.ts
  feedback*.ts
  source*.ts
```

---

## 4. Core Data Models

Defined in [`lib/type.tsx`](./lib/type.tsx):

- `Sentence`: `{ id, content, paragraph }`
- `FeedbackItem`: unified item for all feedback and suggestion records
- `FeedbackSourceItem`: provider-level card metadata
- `RevisionItem`: generated revision history payload

These types are the contract across API routes, Zustand stores, and UI modules.

---

## 5. Frontend Architecture

### 5.1 Root Layout and Main Workspace

- [`app/layout.tsx`](./app/layout.tsx): global page shell and theme.
- [`app/page.tsx`](./app/page.tsx): three-column workspace:
  - Left: `EssayPanel`
  - Center top: `Menu` dashboard
  - Center body: `FeedbackVis` (`RevisionTree` + `PrepStation`)
  - Right: `ProviderGallery`

### 5.2 Essay Input and Highlighting

Implemented in [`components/EssayPanel/EssayPanel.tsx`](./components/EssayPanel/EssayPanel.tsx):

- Editable essay input mode (`textarea`) with `Submit`.
- Input parser converts free text to `Sentence[]`:
  - Paragraph split by blank lines
  - Sentence split by punctuation
- On submit:
  - writes to `useEssayStore.setEssay(...)`
  - clears generated provider data (`source=100/101`) to avoid stale suggestions
- Rendering mode supports:
  - sentence selection
  - reference sentence
  - lexical highlight (ASW and AoA in red, Concreteness in orange)

### 5.3 Dashboard and Suggestion Trigger

Implemented in [`components/FeedbackVis/Menu.tsx`](./components/FeedbackVis/Menu.tsx):

- Auto-computes metrics on `essay` change via `useEffect`:
  - `POST /api/readability`
  - `POST /api/psycholinguistic`
- Renders benchmark deltas by target audience (`simple/general/knowledgeable`).
- `Get Suggestion` calls both suggestion APIs in parallel.
- Parses and normalizes suggestion payloads into `FeedbackItem[]`.
- Injects provider sources:
  - `100` = Readability
  - `101` = Psycholinguistics

### 5.4 Suggestion/Provider Cards (Revision Ladder UX)

Implemented in [`components/ProviderGallery/ProviderCard.tsx`](./components/ProviderGallery/ProviderCard.tsx):

- Each card groups suggestion items by provider.
- Uses `<details>/<summary>` for collapsible suggestion entries.
- Supports two-stage reveal:
  - Intermediate hint
  - Final answer
- Hint generation:
  - ASL: operation templates (raise/lower/adjust sentence length)
  - ASW/AoA/Concreteness: masked word or phrase hints
- `Select All` syncs selected feedback ids into shared state.

### 5.5 Revision Tree

Implemented in [`components/FeedbackVis/RevisionTree.tsx`](./components/FeedbackVis/RevisionTree.tsx):

- Static root hierarchy:
  - `Revision Plan`
  - `Readability` -> `ASL`, `ASW`
  - `Psycholinguistics` -> `AoA`, `Concreteness`
- Dynamic children:
  - direction node (on-benchmark / raise / lower guidance)
  - circle nodes from generated suggestions
- Circle visuals:
  - color by metric
  - size by `actionability`
  - toggle selection (selected -> gray)
- Clicking circles updates selected feedback and essay highlights.

### 5.6 Prep Station

Implemented in [`components/FeedbackVis/PrepStation.tsx`](./components/FeedbackVis/PrepStation.tsx):

- Auxiliary selected-feedback container with animated bubbles.
- Supports drag-remove interaction from selection.

---

## 6. Backend API Architecture

### 6.1 Readability Metrics

File: [`app/api/readability/route.ts`](./app/api/readability/route.ts)

- Computes:
  - `ASL` (average words per sentence)
  - `ASW` (average syllables per word)
  - `FRES = 206.835 - 1.015*ASL - 84.6*ASW`
- Input: `{ text }`
- Output: `{ success, scores: { ASL, ASW, FRES } }`

### 6.2 Psycholinguistic Metrics

File: [`app/api/psycholinguistic/route.ts`](./app/api/psycholinguistic/route.ts)

- Computes:
  - `meanAoA`, `lateAoARatio`, AoA burden
  - `meanConcreteness`, `abstractRatio`, abstractness burden
- Pipeline:
  1. Extract content words
  2. Lookup in built-in AoA and Concreteness lexicons
  3. If coverage is low, call LLM for backfill ratings (OpenAI or Qwen-compatible)
  4. Heuristic fallback for still-missing words
- Env key strategy:
  - prefer `OPENAI_API_KEY`
  - fallback to `DASHSCOPE_API_KEY`

### 6.3 Readability Suggestion Generation

File: [`app/api/readability_suggestion/route.ts`](./app/api/readability_suggestion/route.ts)

- Uses benchmark-aware prompts for ASL and ASW.
- Calls Qwen (`qwen-max`) via DashScope HTTP endpoint.
- Parses LLM text into structured `FeedbackItem`s:
  - ASL: sentence-level replacements
  - ASW: word-level replacements (+ `highlightWords`)
- Per-metric behavior:
  - only trigger metric flow if off-benchmark
  - enforce `1-5` items via parse + fallback logic

### 6.4 Psycholinguistic Suggestion Generation

File: [`app/api/psycholinguistic_suggestion/route.ts`](./app/api/psycholinguistic_suggestion/route.ts)

- Independent metric flows (`aoa`, `concreteness`) based on benchmark evaluation.
- Prompt requires strict JSON output.
- Qwen call through OpenAI-compatible client:
  - model: `qwen-plus`
  - base URL: DashScope compatible endpoint
- Enforces `1-5` suggestions per off-benchmark metric (with fallback replacements).

### 6.5 Revision Rewrite APIs

- [`app/api/revision/route.ts`](./app/api/revision/route.ts):
  - generates revised sentences from selected feedback + optional prompt
- [`app/api/regeneration/route.ts`](./app/api/regeneration/route.ts):
  - continues an existing revision conversation
- Both use Zod response formatting for structured output.

### 6.6 Embeddings API

- [`app/api/embeddings/route.ts`](./app/api/embeddings/route.ts)
- Wrapper around OpenAI embeddings endpoint for search and semantic features.

---

## 7. State Management (Zustand)

File: [`lib/store.tsx`](./lib/store.tsx)

Main stores:

- `useEssayStore`: current essay sentences
- `useFeedbackStore`: all feedback items
- `useFeedbackSourceStore`: provider card sources
- `useSharedConfigStore`: UI and global interaction state
  - target reader level
  - current selected feedback ids and sentences
  - hovered provider/item/sentence
  - readability + psych metrics
- `useRevisionListStore`: revision history and applied outputs

All major stores are persisted via Zustand `persist`.

---

## 8. End-to-End Data Flow (Code-Level)

1. Essay Submit
   - `EssayPanel.handleSubmitEssay()` -> `useEssayStore.setEssay(parsedEssay)`
2. Metric Auto Refresh
   - `Menu.useEffect([essay])` -> fetch readability + psych metrics
3. Suggestion Generation
   - `Menu.fetchReadabilitySuggestion()` -> calls both suggestion endpoints
4. UI Materialization
   - new `FeedbackItem`s -> Provider cards + Revision tree circles
5. Interaction Sync
   - card/circle selection -> `currentSelectedItems`
   - essay highlights update from selected detection ids + `highlightWords`

---

## 9. Environment Variables

Create `.env` in project root:

```bash
OPENAI_API_KEY=...
DASHSCOPE_API_KEY=...
```

Notes:

- Psycholinguistic scoring route can use either OpenAI or DashScope.
- Suggestion routes are currently configured around DashScope and Qwen.

---

## 10. Local Development

```bash
npm install
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Then open:

```text
http://127.0.0.1:3000
```

Build check:

```bash
npm run build
```

