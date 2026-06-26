# Wheel of Life Coach

Private MVP for a structured Wheel of Life coaching session built with React, Vite, TypeScript, Convex, and Convex Auth.

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
