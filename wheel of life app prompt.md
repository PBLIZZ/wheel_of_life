Build the simplest working private MVP; optimize for shipping today, not for production hardening.

Act as a senior full-stack product engineer. Create a private personal coaching web app called “Wheel of Life Coach” using React, Vite, TypeScript, Convex, and Convex Auth.

Original intent to preserve and implement:
Why do some Wheel of Life test scores and goal-setting sessions far outperform others? What is it that the top 1% of coaches include when doing a Wheel of Life goal-setting session that determines the success or failure of the participant’s ability to achieve their goals, or even know what their goals are, or even begin taking action against their goals? How do they determine conflicting belief systems that would paralyze the participant in achieving their goal? How do they rate the level of satisfaction? What kind of questions do they ask? How do they outperform mediocre coaches so well? What is the secret sauce?

Clarification 1 to incorporate:
This app should not just be a generic chatbot. It should replicate the strengths of an excellent coaching session using a structured process. The AI should help me get through the exercise and arrive at real goals I would actually do, based on how I really feel, after identifying genuine internal conflict or limiting beliefs. The app should use API calls to general-purpose LLMs, not fine-tuning. The prompting should be strong but not brittle, and safety should be considered. A hybrid structured flow is preferred over a completely free-form chat.

Clarification 2 to incorporate:
Do not over-engineer this. I do not want something that takes days to build. I want a one-shot app that more or less works out of the box. Use Convex with Convex Agent or an equivalent Convex-friendly pattern so different LLM providers can be used in the app in an agnostic way. I want to be able to switch models/providers later using API keys I supply. Keep it practical, lean, and shippable.

Primary objective:
Help one real authenticated user complete a structured Wheel of Life coaching exercise, identify limiting or conflicting beliefs, and finish with one realistic goal plus one concrete next step they would actually do.

Non-goals:
- No multi-user collaboration features
- No teams
- No billing
- No analytics
- No admin dashboard
- No enterprise architecture
- No unnecessary abstractions
- No speculative future-proofing that slows delivery
- No giant framework for agents or orchestration
- No over-designed UI that takes excessive time

Authentication model:
- Use Convex Auth.
- Keep auth simple and minimal.
- Preferred auth method: magic link email.
- If email/password is materially faster in your implementation, you may use it, but magic link is preferred.
- Only authenticated users can access sessions, messages, summaries, and LLM actions.
- Scope all user data to the authenticated user.
- Use proper server-side authorization checks using auth context, not client-only protection.
- Keep the auth implementation lean and pragmatic.
- Add setup instructions for auth and required environment variables.
- If password reset or advanced auth flows are omitted, list them as intentionally simplified in the MVP.

AI model architecture:
- The app must support different LLM providers in an agnostic way.
- Prefer a simple provider/model selector in settings or configuration.
- Assume I will provide API keys via environment variables or secure backend configuration.
- Use Convex Agent if it helps, but keep the implementation simple.
- The app should use:
  1. one stable base system prompt for the coach
  2. stage-specific prompt/instruction blocks injected depending on the current stage
- Do not rely on one giant brittle prompt alone.
- Keep the AI behavior structured, grounded, and easy to inspect/edit in code.

Use a deterministic coaching workflow with these stages:
- wheel scoring
- reflection
- focus selection
- reality exploration
- belief/conflict exploration
- goal creation
- obstacles
- next action
- summary

Detailed product behavior:

1. Wheel scoring
- Default categories:
  Health, Relationships, Work, Money, Personal Growth, Fun/Recreation, Environment, Emotional Wellbeing
- Allow categories to be edited for a session
- Let the user rate each category from 1 to 10
- Show a simple radar/wheel chart if easy to implement; otherwise a clean score grid is acceptable for MVP
- Save scores to the session

2. Reflection
- After scoring, do not jump immediately into solutions
- First reflect patterns and ask 1–3 strong coaching questions
- Example themes:
  - What stands out to you?
  - What surprises you?
  - Which area most needs attention?
  - Which area feels most alive or meaningful to improve?
- The assistant should be concise, thoughtful, and non-clinical

3. Focus selection
- Help the user choose one primary focus area for the session
- Consider:
  - score
  - importance
  - readiness/energy
- Let the user override the recommendation manually

4. Reality exploration
- Ask grounded Socratic questions to understand what the current situation actually looks like
- Ask about:
  - what the current score means in day-to-day life
  - what is already working
  - what is difficult
  - what has already been tried
  - what the friction points are
- Keep the questions specific and useful

5. Belief/conflict exploration
- This is a key differentiator of the app
- Help the user identify limiting beliefs, protective beliefs, or internal conflicts that could block action
- Ask questions like:
  - What feels stuck here?
  - What do you tell yourself about this area?
  - What might be stopping you?
  - Is there a part of you that wants this and another part that resists it?
  - What are you afraid might happen if you really pursued this?
  - What belief could make this goal feel unsafe, unrealistic, or not for you?
- Do not diagnose
- Do not act like a therapist
- Stay in a coaching frame
- If the user expresses serious distress, self-harm, crisis, or severe mental health issues, stop deep coaching behavior and gently recommend human support

6. Goal creation
- Turn insight into one realistic, emotionally honest, practically doable goal
- Use lightweight SMART and/or GROW principles
- The assistant should gently challenge vague, fantasy, or performative goals
- Explicitly check:
  - Does this feel honest?
  - Would you actually do this?
  - Should this be smaller?
- Prefer one good goal over multiple weak goals

7. Obstacles
- Ask what might derail the plan
- Ask what internal or external obstacles are likely
- Ask what support, reminder, system, or environment change would help

8. Next action
- End with one tiny next action in the next 24–48 hours
- Also capture a one-sentence commitment in the user’s own words

9. Summary
- Save a useful structured summary containing:
  - chosen life area
  - wheel scores
  - key observations
  - possible limiting/conflicting beliefs
  - final goal
  - next step
  - timestamp
- Make past sessions viewable in a simple history list
- Allow reopening a previous session and reviewing the summary and conversation

Behavior and tone of the coach:
- Mostly ask questions and reflect back what the user said
- Warm, grounded, direct, and concise
- Not cheesy
- Not hypey
- Not overly affirming
- Not corporate
- Not therapy cosplay
- Not overly verbose
- Do not ask too many questions at once; usually 1–3 good questions per turn is enough
- Help the user move toward clarity and action, not endless introspection
- Avoid sounding generic or like a productivity guru
- Do not provide medical, psychiatric, legal, or financial advice
- Do not claim certainty about the user’s beliefs; explore tentatively and respectfully

Technical requirements:
- React + Vite + TypeScript frontend
- Convex backend/database
- Convex Auth for authentication
- Modular components and modular code organization
- Reusable UI components for things like:
  - auth screen
  - session list
  - wheel/category scoring
  - stage header/progress
  - chat/coaching panel
  - goal summary card
- Keep components reasonably decoupled and easy to edit, but do not create unnecessary abstraction layers
- Use a clean folder structure
- Use a simple, clean, mobile-friendly UI
- Persist sessions, messages, wheel ratings, summaries, and selected provider/model
- Support provider/model switching in a simple way
- Put prompt constants/helpers in the codebase, not hidden in scattered strings
- Keep the workflow explicit in code using the current session stage
- Use TypeScript types for session stages, data models, and prompt orchestration
- Favor clear maintainable code over cleverness
- Include concise comments where they help
- Produce a working MVP codebase, not just a plan

Suggested data entities:
- users or auth-linked user profile if needed
- sessions
- sessionCategories
- messages
- summaries
- userSettings or providerPreferences

Data rules:
- Every session, message, summary, and setting must be scoped to the authenticated user
- Queries, mutations, and actions must only return the signed-in user’s data
- Use server-side auth context for authorization

Important implementation guidance:
- Make pragmatic decisions and choose the simplest working implementation
- Keep the app structured rather than pure open chat
- Track the current stage explicitly in the session
- Use stage-specific prompts based on the current stage
- Keep orchestration deterministic and easy to follow
- Avoid unnecessary libraries unless they materially speed up development
- A radar chart is nice but optional; a simple visual summary is fine
- If Convex Agent meaningfully helps with persistent message history and provider abstraction, use it simply
- Do not ask many clarification questions
- Make reasonable assumptions and ship the MVP

Also include:
1. The full app code
2. Brief setup instructions
3. Environment variable list
4. The base system prompt for the coach, implemented in the codebase as a prompt constant or helper
5. The stage-specific prompt/instruction blocks, implemented in the codebase and used by the session-stage orchestration
6. A copy of those prompts in your final written output so I can review and edit them easily
7. A short list of what is intentionally simplified in this MVP
