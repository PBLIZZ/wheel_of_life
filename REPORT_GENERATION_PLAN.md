# Report Generation Plan

## Goal

Replace the current plain-text session summary with a polished in-app report workflow that can:

- generate a high-quality single-session report
- render that report as branded HTML
- export it to PDF
- later compare multiple sessions over time

## What We Learned

The successful external workflow did **not** require `research.md` or the original product prompt. A strong result was produced from:

- the full conversation transcript
- the saved in-app summary/report
- the wheel scores
- a careful prompt asking the model to infer conservatively instead of fabricate

That means the app can support two useful report modes:

1. `Transcript-first report`
   Best when the full conversation is available and the report should feel rich and interpretive.

2. `Structured-data report`
   Best when speed and determinism matter more than tone and nuance.

The best product version should support both, with transcript-first as the default for single-session reports.

## Proposed Architecture

### Phase 1: Single-Session HTML Report

Build a dedicated report-generation action that runs after the coaching summary is saved.

Inputs:

- session metadata
- wheel scores
- completed focus runs
- saved summary
- full transcript
- optional prior session summary for comparison

Outputs:

- report title
- executive summary
- wheel analysis
- per-area notes
- focus run sections
- recurring tensions and beliefs
- strongest next move
- optional score deltas vs prior session

Recommended output format:

- LLM returns structured JSON, not final PDF
- app renders branded HTML from that JSON

Why:

- better layout consistency
- easier styling and iteration
- easier PDF generation
- easier support for single-session and multi-session report variants

### Phase 2: HTML to PDF

Use browser rendering to convert report HTML to PDF.

Recommended path:

- Playwright or Chromium print-to-PDF

Product behavior:

- show the finished report in-app
- offer `Download PDF`
- optionally offer `Download HTML`

### Phase 3: Multi-Session Review Report

Add a report mode that combines selected completed sessions.

Useful sections:

- score trends across time
- recurring focus areas
- repeating limiting beliefs or tensions
- actions repeatedly chosen
- progress and regression summary
- recommended next session focus

## Prompt Strategy

Keep report prompting separate from coaching prompting.

Prompt assets:

1. `coach system prompt`
   Locked and versioned.

2. `report generation prompt`
   Separate and easier to tune for writing quality and presentation.

3. `report rendering template`
   Owned by the app, not by the model.

## UX Requirements

The report should feel closer to the external PDFs that worked well.

Visual requirements:

- real spider chart with web rings and radial spokes
- category color system carried into the report
- crisp section hierarchy
- editorial layout rather than raw data dump
- optional delta markers against prior session
- explored areas get richer treatment
- unaddressed areas stay intentionally light

## Implementation Order

1. Add report prompt file and version it explicitly.
2. Add `reportHtml` or `reportJson` storage to summaries or a new reports table.
3. Build a single-session report renderer in React/HTML.
4. Add PDF export.
5. Add previous-session comparison.
6. Add multi-session report selection and synthesis.

## Prompt Asset Policy

The coaching prompt is currently performing very well and should be treated as a product asset.

Recommended safeguards:

- keep prompts in dedicated files
- add clear version headers
- avoid casual inline edits across the codebase
- record notable prompt revisions in changelog notes

## Open Choices

- whether to store final report HTML in Convex or regenerate on demand
- whether comparison defaults to the immediately previous session or a user-selected baseline
- whether to expose transcript-first vs structured-data report mode in the UI or keep it internal
