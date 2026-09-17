# HCO CRM

WhatsApp-first sales CRM for UAE SMEs, by Hoplon & Co.

- Brief: [`docs/BRIEF.md`](docs/BRIEF.md) · Plan: [`PLAN.md`](PLAN.md) · Glossary: [`CONTEXT.md`](CONTEXT.md)
- Current phase: **A — client showcase** (every screen on dummy data, no server needed).

## Run it

Requirements: Node 22+, pnpm 11.

```bash
pnpm install
pnpm dev            # http://localhost:5173
```

Sign in by picking a demo user. The demo workspace is a fictional Dubai clinic, **Noor Al Marsa Aesthetic & Dental Clinic**. Data lives in your browser's localStorage and is shared by all tabs. Sign-in is per tab, so you can run the demo panel as the owner in one window and a rep in another.

| Command                                                    | What it does                             |
| ---------------------------------------------------------- | ---------------------------------------- |
| `pnpm dev`                                                 | Web app with the in-browser mock backend |
| `pnpm build`                                               | Production build (`apps/web/dist`)       |
| `pnpm typecheck`                                           | TypeScript across the monorepo           |
| `pnpm lint`                                                | ESLint                                   |
| `pnpm --filter @hco/demo-data exec tsx scripts/summary.ts` | Print the demo story's numbers           |

## Layout

| Path                                           | What                                                                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `packages/shared`                              | Contracts: entities, REST API routes (zod), inbound and live events, adapter interfaces                          |
| `packages/core`                                | Business rules as pure functions: lead/deal state machines, service window, stale deals, assignment, VAT, phones |
| `packages/demo-data`                           | The clinic demo story and simulator generators                                                                   |
| `apps/web`                                     | React app. `src/mock` is the showcase backend implementing the same contract as the future API                   |
| `apps/api`, `packages/db`, `packages/adapters` | Phase B/C (empty for now)                                                                                        |
