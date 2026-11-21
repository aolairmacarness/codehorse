# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — Next.js dev server. Must run on **port 3000**: `BETTER_AUTH_URL` and the GitHub OAuth callback point there, and Better Auth rejects other origins ("Invalid origin" → 403 on sign-in).
- `npx inngest-cli@latest dev` — local Inngest dev server; required alongside `npm run dev` for repository indexing to run.
- `npm run build` / `npm start` — production build / serve. In production mode `/api/inngest` returns 500 unless `INNGEST_SIGNING_KEY` is set (or `INNGEST_DEV=1`).
- `npm run lint` — ESLint (flat config, `eslint-config-next`). Known pre-existing `react-hooks/set-state-in-effect` errors in `hooks/use-mobile.ts`, `components/ui/carousel.tsx`, `app/module/repositories/hooks/use-repositories.ts`.
- `npx tsc --noEmit` — typecheck. If it reports errors only in `.next/dev/types/*` for routes that no longer exist, delete `.next/dev` (stale generated route types; also breaks `next build`).
- Prisma (always pass `--config prisma7.config.ts`): `npx prisma migrate dev --config prisma7.config.ts`, `npx prisma generate --config prisma7.config.ts` (also runs on `npm install`).

Package manager is npm (`package-lock.json`). There is no test runner.

## Architecture

Next.js 16 App Router + React 19 + Tailwind v4 + TypeScript; path alias `@/*` → repo root. This Next.js version has breaking changes — read `node_modules/next/dist/docs/` before writing Next-specific code.

The app syncs a user's GitHub repos, indexes them into a vector store, and offers RAG chat over each repo. It was ported from a MongoDB/Mongoose reference project (codelens) onto Prisma/Postgres, so ported code maps Mongo concepts to relational ones (e.g. one `ChatMessage` row per turn instead of an embedded messages array).

**Layout** — feature code lives in `app/module/<feature>/{actions,components,hooks,lib,...}` (not a root `modules/` dir). Shared shells/providers: `components/app-sidebar.tsx`, `components/dashboard/page-header.tsx`, `app/providers/`.

**Routing & auth flow**
- `app/(auth)/login` is the sign-in page (client-side `signIn.social` with GitHub, callback `/dashboard`).
- `app/(protected)/layout.tsx` is the auth guard + sidebar shell for `/overview`, `/repositories[/id]`, `/chat[/id]`, `/settings`. `/` → `/dashboard` → `/overview`. Pages render their own `<main className="... p-6">`; the layout only wraps them.
- Two parallel server-side auth helper sets exist: `app/module/auth/action` (`requireAuth()` returns the **user**) and `app/module/auth/utils/auth-utils.ts` (`requireAuth()` returns the **session**, plus `requireNoAuth`/`logout`). Both redirect to `/login`.
- `app/module/auth/api/auth/[...all]/route.ts` is a stray duplicate of the real handler (`app/api/auth/[...all]/route.ts`) and is publicly routed at `/module/auth/api/auth/*`.

**Indexing pipeline**
1. `syncGithubPage` (`app/module/repositories/actions`) lists repos via Octokit (`octokit` package, not `@octokit/rest`) and upserts `Repository` rows.
2. `startIndexing` sends an Inngest `repo/index` event with only `{ repoId, userId }`.
3. `app/module/indexing/inngest/functions.ts` (served from `app/api/inngest/route.ts`) fetches the repo tree, chunks files (2000 chars), embeds with OpenAI `text-embedding-3-small` at **512 dims** (`lib/openai.ts`), and upserts to Pinecone (`lib/pinecone.ts`) with `metadata.repositoryId` for filtering. `indexStatus` goes `idle → indexing → indexed | failed`.
- The GitHub token is resolved inside each step via `getGithubTokenForUser(userId)` (Better Auth `getAccessToken` with `userId`, no request headers). Don't put tokens in event data or step return values — Inngest persists both.

**Chat** — `app/api/chat/route.ts` embeds the question, queries Pinecone (topK 8, filtered by repo), builds prompts with LangChain (`app/module/chat/lib/prompt.ts`), streams `gpt-4o-mini` output as plain text, sends citations in the `X-Citations` header, and persists both turns as `ChatMessage` rows. Client: `app/module/chat/components/chat-view.tsx`, markdown via `streamdown`.

**Data layer** — Prisma 7 + PostgreSQL (Neon) via `@prisma/adapter-pg`.
- Client is generated into `app/generated/prisma` (git-ignored). Import types from `@/app/generated/prisma/client` and the singleton from `@/lib/db` (`lib/prisma.ts` re-exports it).
- Models: Better Auth tables (`User`, `Session`, `Account`, `Verification`) plus `Repository` and `ChatMessage`, all `@@map`ped to lowercase table names.
- `Repository.githubId` is `BigInt`; actions convert it to `number` before returning, since BigInt isn't JSON-serializable.
- `lib/openai.ts` / `lib/pinecone.ts` create clients lazily so builds don't fail when keys are missing.

**Auth config** — `lib/auth.ts`: Better Auth, Prisma adapter, GitHub only (`repo` scope), `nextCookies()` plugin (keep last) so server actions can set/clear cookies. Throws at import if `BETTER_AUTH_SECRET` (≥32 chars), `BETTER_AUTH_URL`, `GITHUB_CLIENT_ID`, or `GITHUB_CLIENT_SECRET` is missing. Changing auth plugins/fields requires a matching schema change + migration.

**Env** — see `.env.example`: `DATABASE_URL`, Better Auth + GitHub vars, `OPENAI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX` (index must be 512-dim), `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` (production only).

**UI** — shadcn/ui `base-nova` style on `@base-ui/react` with lucide icons (`components.json`); primitives in `components/ui/`. Buttons rendered as links use `render={<Link href=… />} nativeButton={false}`. `npx shadcn add` may prompt to overwrite or overwrite existing customized primitives — check the diff afterwards. Use `cn()` from `@/lib/utils`; theme tokens in `app/globals.css`.
- Theme: `app/providers/theme-provider.tsx` is a custom provider (not next-themes). Its pre-hydration script lives in `app/providers/theme-script.ts` (plain module, so the server root layout can import the string) and is injected in `app/layout.tsx` via `next/script` `beforeInteractive`. A dev warning "Encountered a script tag while rendering React component" means some page errored on the server and React re-rendered the root on the client — look for the underlying server error.
