# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start the Next.js dev server (http://localhost:3000)
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — ESLint (flat config in `eslint.config.mjs`, extends `eslint-config-next`)
- `npx prisma migrate dev` — apply/create migrations; `npx prisma generate` — regenerate the client (also runs on `npm install` via `postinstall`)

There is no test runner configured.

## Architecture

Next.js 16 App Router + React 19 + Tailwind v4 + TypeScript. Path alias `@/*` maps to the repo root. Because this Next.js version has breaking changes, consult `node_modules/next/dist/docs/` before writing Next-specific code (see AGENTS.md).

**Data layer** — Prisma 7 with PostgreSQL via the `@prisma/adapter-pg` driver adapter.
- Schema is `prisma/schema.prisma`; Prisma CLI config (schema/migrations paths, `DATABASE_URL`) lives in `prisma7.config.ts`, not the default `prisma.config.ts` — pass `--config prisma7.config.ts` if the CLI doesn't pick it up.
- The client is generated into `app/generated/prisma` (git-ignored; regenerate rather than edit). Import it from `@/app/generated/prisma/client`, not `@prisma/client`.
- `lib/db.ts` is the singleton `PrismaClient` (cached on `globalThis` in dev, throws if `DATABASE_URL` is unset). `lib/prisma.ts` just re-exports it — import `prisma` from `@/lib/db`.
- Current models (`User`, `Session`, `Account`, `Verification`) are the Better Auth tables, mapped to lowercase table names via `@@map`.

**Auth** — Better Auth (`lib/auth.ts`) with the Prisma adapter and GitHub as the only social provider (requests the `repo` scope). The handler is mounted at `app/api/auth/[...all]/route.ts` via `toNextJsHandler`. Requires `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` and `DATABASE_URL` in `.env` (git-ignored). If you change auth plugins/fields, update `prisma/schema.prisma` and create a migration to match.

**UI** — shadcn/ui (`base-nova` style, built on `@base-ui/react`, lucide icons) configured in `components.json`. Generated primitives live in `components/ui/`; add more with `npx shadcn add <component>`. Use `cn()` from `@/lib/utils` for class merging. Theme tokens are CSS variables in `app/globals.css`. `recharts` is available for charts.
