# Feedback Log

## 2026-04-15

### Wheel scoring sliders need clearer scale labels

- Area: wheel scoring screen
- Type: UX polish
- Reported behavior: the sliders update the radar chart interactively, but the slider controls themselves do not clearly show the scoring levels or labels.
- Requested tweak: add visible level markers / labels so it is easier to understand the scale while dragging.
- Constraint: do not change this during an active live session if it risks refreshing or interrupting the app.
- Screenshot context: user noted this while viewing the wheel scoring screen with the interactive radar chart updating correctly.

### Reflection-to-focus handoff is unclear

- Area: transition from reflection to focus selection
- Type: UX flow / information architecture
- Reported behavior: after answering the first coaching question, the app returned a reflection-style response while Step 3 already showed a suggested focus area. The next action was not obvious, and the "Why this one right now?" input felt disconnected from the reflection response.
- User confusion: multiple areas can feel equally important, so being forced to pick one without a clearer explanation created friction, especially across relationships, work, money, and fun/recreation.
- Requested tweak: make the stage handoff explicit with copy such as "Step 2 complete. Now move to Step 3 and choose one focus area."
- Requested tweak: place the prompt for "Why this one right now?" closer to the point in the UI where the user expects to continue the conversation, or otherwise make it visually clearer that the next action is in the left-side step panel.
- Constraint: record only for now; do not change the app during an active live session if it risks interruption.

### Saving a response resets scroll position and hides the active context

- Area: active coaching session layout and scroll behavior
- Type: UX flow / layout
- Reported behavior: when a response saves and the next coach response comes back, the view jumps back toward the top of the scrollable area instead of keeping the user anchored near the active input and latest conversation.
- Impact: while working in later-stage inputs such as obstacles, the user loses sight of the current textarea and has to scroll around to relocate the active part of the session.
- Requested tweak: preserve scroll position after save/response, keep the coach transcript pinned to the latest exchange, and focus the cursor back into the relevant input box so the user can continue typing immediately.
- Requested tweak: keep the conversation oriented around the bottom/latest message rather than requiring manual scrolling to find where the current exchange ended.
- Layout feedback: the persistent model settings sidebar takes space that would be better used for core session content during the session itself.
- Requested tweak: make model settings collapsible or expandable instead of always visible.
- Requested tweak: use the reclaimed desktop space to keep the wheel graph and session summary visible together, since the spider/radar chart is more useful than a permanently exposed settings panel.
- Content feedback: the summary/observations panel is lower-value during the live session because it largely repeats what the user has already read in the coach transcript.
- Constraint: record only for now; do not change the app during an active live session if it risks interruption.

## 2026-04-16

### Submitted response stays in textarea after successful send

- Area: active coaching input
- Type: bug
- Reported behavior: after sending a response, the same text remains in the textarea even though the message also appears in the transcript and the coach has already replied.
- Likely cause observed in code: the frontend was treating a successful action returning `undefined` as a failed submit, so the draft text was preserved incorrectly.
- Requested tweak: clear the textarea immediately on successful submit while still preserving the draft on real errors.
- Constraint: safe to patch during the live session because it does not change stage flow or data shape.

### Active session content sits too low in the viewport

- Area: active session layout / viewport usage
- Type: UX layout
- Reported behavior: after the sticky header, most of the useful content begins too far down the page, so the wheel, focus rail, and active working area are partially or mostly out of view.
- Impact: the user is doing most of the work near the bottom of the screen and has to scroll more than necessary to see the current context.
- Requested tweak: tighten the vertical layout so the active transcript/input and the most useful side context are visible earlier in the viewport.
- Constraint: record only for now; do not change the live session layout mid-survey.

### Focus status panel repeats raw user input instead of adding insight

- Area: focus status rail
- Type: UX content / information design
- Reported behavior: the rail repeats details already present in the transcript, such as selected-because reasons and the raw why-now note, without adding much value during the live session.
- User preference: repeated source text is less useful than synthesized insight.
- Requested tweak: repurpose the focus status panel to show higher-value synthesis, for example distilled observations, emerging beliefs, tensions, fears, conflicts, or other reasoning-friendly coaching insights generated from the conversation.
- Constraint: record only for now; do not rework the rail while the user is actively completing the survey.

### Live session visual design feels dull and the wheel reference needs a richer treatment

- Area: active session visual design
- Type: UX / visual design direction
- Reported behavior: the current interface feels visually flat and overly beige/brown/grey, and the wheel reference area does not feel polished enough.
- Specific feedback: the category list beside the wheel does not look good, and the wheel itself should feel more deliberate and expressive.
- Requested tweak: move toward a more colorful, more purposeful visual language rather than the current muted neutral palette.
- Constraint: record only for now; do not redesign the live session mid-survey.

### Final downloadable report should feel closer to the provided PDF example

- Area: summary/report export
- Type: UX / visual design / report design
- Reference file: `/Users/peterjamesblizzard/Piranesi/000 Planning & Goals/000.03 Life Balance Assessment/Wheel-of-Life-2026-Q2.pdf`
- User expectation: the final downloadable report should have a richer editorial feel, stronger color usage, and a more polished presentation closer to the referenced PDF.
- Requested tweak: use the PDF as inspiration for hierarchy, color, and overall finish when redesigning the end-of-session report.
- Constraint: record only for now; do not rework report generation until the active survey is complete.

### Use chakra-inspired colors for wheel categories in the post-survey redesign

- Area: wheel/category visual system
- Type: UX / visual design system
- Requested direction:
  - Relationships: blue/teal
  - Work: brown
  - Money: red
  - Personal Growth: yellow
  - Fun/Recreation: pale mandarin orange
  - Emotional Wellbeing: deeper coral orange
  - Environment: pink
  - Health: teal
- User note: color mapping should feel more vivid and meaningful, loosely inspired by chakra associations.
- Constraint: record only for now; apply after the current live session ends.

### Add a ninth wheel section for purpose/contribution/spirituality after the current session

- Area: wheel structure
- Type: product scope / content model
- Requested tweak: add a ninth category for purpose, contribution, or spirituality after the active session is complete.
- Requested color direction: indigo or violet.
- Constraint: do not change the current session’s wheel structure while the user is actively completing the survey.

### Successful external workflow for high-quality PDF report generation

- Area: summary/export pipeline
- Type: implementation reference
- Reference file: `/Users/peterjamesblizzard/Piranesi/000 Planning & Goals/000.03 Life Balance Assessment/wheel_of_life_report_2026-04-16.pdf`
- User-provided successful input bundle to Claude:
  - full transcript of the conversation
  - copy of the report generated in-app
  - wheel score pattern / wheel reference
  - explicit instruction not to hallucinate and to infer only where justified
- Initial prompt summary:
  - make this into a PDF
  - use the conversation as richer context
  - infer carefully rather than invent
  - produce a tight 2-3 page output
  - render a coloured wheel and zone visualisation
- Follow-up clarification that improved output:
  - only use what is directly supported for unexplored zones
  - coloured wheel with zone scores visualised
  - keep length tight
  - correct the chart so it is a real spider chart with radials/web rings, not a pie-like shape
- Outcome notes from the external workflow:
  - HTML -> PDF worked well
  - proper spider chart with concentric web rings and radial spokes
  - delta column showing changes vs prior session was valuable
  - minimally explored zones stayed intentionally minimal rather than being overfilled
- Product implication:
  - the app should implement a dedicated report-generation stage or post-summary action using the saved transcript, saved structured session summary, wheel scores, prompt context, and research context
  - preferred implementation path is LLM-generated structured report content or HTML, then app-owned HTML template rendering, then PDF generation via browser print-to-PDF
- Prompt/provenance note:
  - the current coaching prompt is performing very well and should be version-controlled and protected from casual editing
