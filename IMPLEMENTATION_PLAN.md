# Research-Aligned Multi-Focus Wheel of Life Redesign

## Summary
- Rework the app from a single-focus coaching flow into a research-aligned session that starts with one wheel, uses a three-lens chooser (`needs attention`, `want to improve`, `excited/ready`), builds an ordered focus queue of 1–3 areas by default, and lets the user continue beyond that queue if they want to keep going.
- Keep the current staged coaching structure, but change the product from “one session = one focus” to “one session = one wheel snapshot plus multiple focus runs.”
- Redesign the active-session UI so the user always sees the current step and latest conversation, while reference content becomes compact and non-disruptive.
- Hide the full summary until the end, then provide a combined final report with copy/download actions.

## Key Changes
- Coaching workflow:
  - Keep `wheel_scoring`, `reflection`, `reality_exploration`, `belief_conflict_exploration`, `goal_creation`, `obstacles`, `next_action`, and `summary`.
  - Redefine `focus_selection` as a three-lens queue builder instead of a one-area picker.
  - Add a lightweight persisted `focus_checkpoint` state after each completed focus run so the user can `continue next focus`, `add another focus`, or `finish session now`.
  - Reflection stays reflective, but the prompt must explicitly surface pattern/surprise/tension and propose candidate areas without prematurely collapsing the user into one answer.
  - Focus selection must explicitly collect: which area most needs attention, which area they most want to improve, and which area they feel most excited/ready to work on. The app then deduplicates those answers into an ordered queue and asks for a short “why now” note per selected area only when needed.
  - Each focus run uses the same coaching stages, but the prompts must better reflect the research: values/identity alignment, concrete “what does a 4/10 look like?” probing, hidden payoff/protective belief exploration, options generation before narrowing, SMART/GROW tightening, and implementation barriers/support.
  - The final combined summary must include all completed focus runs plus one explicit “start here first” action so the session does not end with three equally weighted next steps.

- Data model and backend orchestration:
  - Add a new `focusRuns` table keyed to `sessionId` with ordered records for each selected area. Each run stores `areaName`, `order`, `selectedBecause` (array of the three lens reasons), `whyNow`, `status`, `keyObservations`, `limitingBeliefs`, `finalGoal`, `nextStep`, `commitment`, `startedAt`, `completedAt`.
  - Keep `sessions` as the parent wheel session, but replace the single-focus assumptions with queue metadata such as `activeFocusRunId`, `activeFocusIndex`, `queuedFocusCount`, and `completedFocusCount`. `currentStage` should include `focus_checkpoint`.
  - Add optional `focusRunId` to `messages` so transcript entries can be associated with a specific focus run while keeping reflection and queue-building messages session-level.
  - Keep one `summaries` record per session, but change its payload from a single chosen area to a combined export shape with `wheelScores`, `focusRuns[]`, `overallSummaryText`, `startHereFirst`, and timestamps.
  - Update Convex actions/mutations so `startReflection` remains session-level, `chooseFocusArea` becomes `buildFocusQueue`, `submitStageResponse` writes into the active focus run, and the post-`next_action` transition branches to `focus_checkpoint` instead of directly to `summary`.
  - At `focus_checkpoint`, if more queued runs remain, `continue` activates the next queued run at `reality_exploration`; if the user chooses `add another focus`, reopen the focus-selection chooser with remaining categories only; if the user chooses `finish`, generate the combined summary immediately.

- Prompt and behavior updates:
  - Rewrite the base prompt to explicitly position the coach as an integrated Wheel of Life + SMART + GROW facilitator rather than only a staged questionnaire.
  - Reflection prompt must ask high-quality pattern questions and return up to three candidate areas, not one hard recommendation.
  - Focus selection prompt must reason over score, need, desire, readiness, and “should vs want” tension.
  - Reality prompt must ask what the current score looks like in daily life, what is already working, what a higher score would concretely look like, and what has already been tried.
  - Belief/conflict prompt must explicitly look for hidden payoffs, identity conflicts, and belief evidence-testing without slipping into therapy language.
  - Goal creation prompt must generate options first, then narrow to a SMART, intrinsically motivated goal the user would actually do.
  - Obstacles and next-action prompts must include behavioral design, reminders/support, and a concrete next-24-to-48-hour commitment.
  - Final summary should be assembled deterministically from stored data, with optional model-generated closing copy only if it does not become a blocking dependency.

- UI and interaction redesign:
  - Replace the always-open left sidebar with a compact utility control in the header that opens history/settings on demand. Keep `New session`, history access, and model settings available, but not permanently consuming desktop width.
  - Make the top session header sticky. It should always show the current stage chips, current focus progress such as `Focus 2 of 3`, and a compact provider/model indicator.
  - Keep the active coaching area dominant. During active stages, use the main canvas for transcript + current input, and move wheel context into a compact side card instead of a large duplicated panel.
  - Redesign the compact wheel reference so the radar chart remains visible and labels include scores inline, for example `Relationships 3`, `Money 4`, without a second redundant score column.
  - Hide the full summary card until the actual summary stage. During the session, show only compact contextual information that helps the user act now.
  - Fix transcript ergonomics: auto-scroll the conversation to the latest exchange, preserve the overall viewport after save/response, and restore focus to the active textarea after each response.
  - Add explicit stage handoff copy such as `Reflection complete. Now choose up to 3 focus areas.` and `Focus 1 complete. Continue or finish.`
  - At summary stage, provide `Copy as text`, `Copy as Markdown`, and `Download Markdown` actions. Plain download is sufficient for MVP; printing can stay out of scope.

## Public Interfaces and Types
- `SessionStage` gains `focus_checkpoint`.
- `SessionDetails` must include `focusRuns`, `activeFocusRun`, and combined summary/export metadata so the UI can render focus progress without inferring it from one legacy `focusArea`.
- The focus-selection submit shape changes from `{ focusArea, note }` to a queue-building payload containing the three lens answers plus the ordered selected areas and optional why-now notes.
- Message records gain optional `focusRunId`.
- Session summary/export payload changes from one chosen area to a combined session report containing per-focus sections and a session-level first action.

## Test Plan
- Start a new session, score the wheel, complete reflection, submit three-lens answers, and verify the app creates a deduplicated ordered queue of up to 3 areas.
- Complete one focus run and verify `focus_checkpoint` offers `continue`, `add another focus`, and `finish now`.
- Complete two or three focus runs in one session and verify each run keeps its own observations, beliefs, goal, next step, and commitment.
- Finish after the first focus even when more areas are queued and verify the combined summary only includes completed runs plus a clear first action.
- Add another focus after the initial queue and verify remaining categories are offered without duplicating already-completed runs.
- Reopen a past session from history and verify the sticky header, transcript, compact wheel context, and final combined summary render correctly.
- Verify copy/download actions export the expected combined report in both plain text and Markdown.
- Verify scroll position and input focus stay anchored on the active conversation after every save/response.
- Verify authenticated data scoping still prevents cross-user access to sessions, focus runs, messages, summaries, and settings.

## Assumptions
- Keep the current working auth setup as-is and do not re-open the magic-link vs Google auth decision in this pass.
- Use one initial wheel snapshot per session; do not rescore the wheel between focus runs in the same session.
- Default recommendation is 1–3 selected areas, but the user may continue past that by adding more areas from the same session if they want to work through all eight.
- Keep provider/model switching simple and user-level, with no new agent framework or orchestration abstraction added in this redesign.
