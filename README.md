# Wheel of Life Coach

A personal AI coaching app that replicates a high-quality Wheel of Life
goal-setting session — not a generic chatbot, but a structured, stage-based
process that helps one user arrive at a goal they'll actually act on.

## What it does

Most Wheel of Life exercises stall at "rate your life areas 1–10." This app
runs the full coaching arc the best coaches use: it scores satisfaction across
life areas, reflects patterns back, surfaces the limiting beliefs and internal
conflicts that quietly block progress, and lands on one realistic goal plus one
concrete next action.

## How it works

A deterministic, multi-stage workflow keeps the AI grounded and inspectable:

1. **Wheel scoring** — rate satisfaction across life areas
2. **Reflection** — patterns reflected back, with sharp coaching questions
3. **Focus selection** — pick the area to work on
4. **Reality exploration** — what's actually going on
5. **Belief / conflict exploration** — name the limiting or conflicting beliefs
6. **Goal creation** — one realistic goal
7. **Obstacles** — what's in the way
8. **Next action** — one concrete step you'd actually take

Each stage injects its own prompt block on top of a stable base coach prompt,
so behaviour stays structured rather than relying on one brittle mega-prompt.
If a user expresses serious distress, the coach steps out of deep coaching and
points toward human support.

## Tech stack

- **Frontend:** React 19, Vite, TypeScript
- **Backend / data:** Convex
- **Auth:** Convex Auth (Google OAuth)
- **LLM:** provider-agnostic — OpenAI or Anthropic, switchable in-app via your own API keys
- **UI:** Framer Motion, Lucide icons

## Status

Single-user MVP — built to be lean and shippable. Scoped to one authenticated
user with no teams, billing, or analytics by design.

## Setup

1. Install dependencies:

```bash
bun install
```

2. Create a Convex deployment and generate the client bindings:

```bash
bun x convex dev
```

3. Set the required environment variables.

Frontend `.env.local`:

```bash
SITE_URL=http://localhost:3022
VITE_CONVEX_URL=your_convex_deployment_url
VITE_CONVEX_SITE_URL=your_convex_site_url
```

Convex environment variables:

```bash
SITE_URL=http://localhost:3022
AUTH_GOOGLE_ID=your_google_oauth_client_id
AUTH_GOOGLE_SECRET=your_google_oauth_client_secret
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
ANTHROPIC_API_KEY=your_anthropic_api_key
```

For local auth in this repo, `SITE_URL` must point to the web app, not the Convex site URL. With the Vite dev server configured here, that value is `http://localhost:3022`.
For Google OAuth with Convex Auth, configure the Google redirect URI as `https://astute-lobster-274.convex.site/api/auth/callback/google`.

4. Start the frontend:

```bash
bun run dev
```

If you prefer `pnpm`, the equivalent commands are `pnpm install`, `pnpm exec convex dev`, and `pnpm dev`.

## Auth Notes

- The MVP uses Convex Auth with Google OAuth.
- Convex Auth requires `SITE_URL` for post-login redirects. If it is missing or points at the wrong host, sign-in fails.
- Google sign-in requires `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` on the Convex deployment.
- Password reset, account linking, and additional auth providers are intentionally omitted.
- All session, message, summary, and settings reads and writes are scoped to the authenticated user on the server.

## LLM Provider Notes

- Supported providers in this MVP: `openai` and `anthropic`.
- Provider and model can be changed in the in-app settings panel.
- The backend uses a stable base prompt plus stage-specific prompt blocks.

## Available Scripts

- `bun run dev`: start the Vite frontend
- `bun run build`: type-check and build the frontend
- `bun run lint`: run ESLint
- `bun run convex:dev`: start Convex local/dev workflow
- `bun run convex:codegen`: regenerate Convex API bindings
