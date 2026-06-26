# Wheel of Life Coach

![Status](https://img.shields.io/badge/status-MVP-orange)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Convex](https://img.shields.io/badge/Convex-backend-EE342F)
![LLM](https://img.shields.io/badge/LLM-OpenAI%20%7C%20Anthropic-412991)

A personal AI coaching app that replicates a high-quality Wheel of Life
goal-setting session — not a generic chatbot, but a structured, stage-based
process that helps one user arrive at a goal they'll actually act on.

> [!NOTE]
> This is a single-user, personal-use app. It's open source so others can read,
> fork, and self-host it — but it's not built for multi-tenant or team use.

## What it does

Most Wheel of Life exercises stall at "rate your life areas 1–10." This app
runs the full coaching arc the best coaches use: it scores satisfaction across
life areas, reflects patterns back, surfaces the limiting beliefs and internal
conflicts that quietly block progress, and lands on one realistic goal plus one
concrete next action.

## How it works

A deterministic, multi-stage workflow keeps the AI grounded and inspectable.
Each stage injects its own prompt block on top of a stable base coach prompt,
so behaviour stays structured rather than relying on one brittle mega-prompt.

| # | Stage | What happens |
|---|-------|--------------|
| 1 | **Wheel scoring** | Rate satisfaction across your life areas |
| 2 | **Reflection** | Patterns reflected back, with sharp coaching questions |
| 3 | **Focus selection** | Pick the area to work on |
| 4 | **Reality exploration** | What's actually going on |
| 5 | **Belief / conflict exploration** | Name the limiting or conflicting beliefs |
| 6 | **Goal creation** | One realistic goal |
| 7 | **Obstacles** | What's in the way |
| 8 | **Next action** | One concrete step you'd actually take |

> [!IMPORTANT]
> This is a coaching tool, not a mental-health service. If a user expresses
> serious distress, the coach steps out of deep coaching and gently points
> toward human support.

## Tech stack

| Layer | Choice |
|-------|--------|
| **Frontend** | React 19, Vite, TypeScript |
| **Backend / data** | Convex |
| **Auth** | Convex Auth (Google OAuth) |
| **LLM** | Provider-agnostic — OpenAI or Anthropic, switchable in-app with your own API keys |
| **UI** | Framer Motion, Lucide icons |

## Status

Single-user MVP — built to be lean and shippable. Scoped to one authenticated
user with no teams, billing, or analytics by design.

## Setup

**1. Install dependencies**

```bash
bun install
```

**2. Create a Convex deployment and generate the client bindings**

```bash
bun x convex dev
```

**3. Set the required environment variables**

Frontend (`.env.local`):

| Variable | Value |
|----------|-------|
| `SITE_URL` | `http://localhost:3022` |
| `VITE_CONVEX_URL` | your Convex deployment URL |
| `VITE_CONVEX_SITE_URL` | your Convex site URL |

Convex deployment:

| Variable | Value |
|----------|-------|
| `SITE_URL` | `http://localhost:3022` |
| `AUTH_GOOGLE_ID` | your Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | your Google OAuth client secret |
| `OPENAI_API_KEY` | your OpenAI API key |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` |
| `ANTHROPIC_API_KEY` | your Anthropic API key |

> [!CAUTION]
> For local auth, `SITE_URL` must point to the **web app**, not the Convex site
> URL. With the Vite dev server configured here that's `http://localhost:3022`.
> If it's missing or points at the wrong host, sign-in fails silently.

> [!IMPORTANT]
> For Google OAuth with Convex Auth, set the Google redirect URI to your
> Convex **site** URL plus the auth callback path:
> `https://<your-deployment>.convex.site/api/auth/callback/google`
> (find your `.convex.site` URL in the Convex dashboard or `VITE_CONVEX_SITE_URL`).

**4. Start the frontend**

```bash
bun run dev
```

> [!TIP]
> Prefer `pnpm`? The equivalents are `pnpm install`, `pnpm exec convex dev`,
> and `pnpm dev`.

## Auth notes

- The MVP uses Convex Auth with Google OAuth.
- Convex Auth requires `SITE_URL` for post-login redirects. If it's missing or points at the wrong host, sign-in fails.
- Google sign-in requires `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` on the Convex deployment.
- Password reset, account linking, and additional auth providers are intentionally omitted.
- All session, message, summary, and settings reads and writes are scoped to the authenticated user on the server.

## LLM provider notes

- Supported providers in this MVP: `openai` and `anthropic`.
- Provider and model can be changed in the in-app settings panel.
- The backend uses a stable base prompt plus stage-specific prompt blocks.

## Available scripts

| Command | Does |
|---------|------|
| `bun run dev` | Start the Vite frontend |
| `bun run build` | Type-check and build the frontend |
| `bun run lint` | Run ESLint |
| `bun run convex:dev` | Start the Convex local/dev workflow |
| `bun run convex:codegen` | Regenerate Convex API bindings |
