# ARCHITECTURE.md

How HCO CRM is put together, what runs today, and what changes in Phase B.

Vocabulary lives in [`CONTEXT.md`](CONTEXT.md); decisions in [`PLAN.md`](PLAN.md) and [`DESIGN.md`](DESIGN.md).

---

## The one idea that shapes everything

There is exactly **one contract**, in `packages/shared`, and two implementations of it:

```
                    packages/shared (the contract)
                    entities · REST routes (zod) · inbound events · live events · adapter interfaces
                                    │
                    ┌───────────────┴────────────────┐
        Phase A: in-browser mock backend        Phase B: Fastify API + worker
        apps/web/src/mock/**                    apps/api/** (to be built)
                    │                                │
                    └───────────────┬────────────────┘
                                    │
                        apps/web/src/lib/api/client.ts
                        VITE_API_MODE = "mock" | "http"
```

Screens call `callApi(route, input)` and know nothing else. Switching to the real backend is an environment variable, not a rewrite. The mock transport **validates every response against the same zod schema the real API will return**, so a screen cannot be built against a shape the backend won't produce — a contract violation surfaces immediately as a `CONTRACT_MISMATCH` error in the console.

## Packages

| Package | Contains | May depend on |
|---|---|---|
| `packages/shared` | Entities, the complete REST contract, inbound/live event types, adapter interfaces, `Tables` (the row shape every table mirrors) | nothing |
| `packages/core` | Business rules as pure functions: lead and deal state machines, service window, stale deals, assignment, visibility, AED money and VAT, UAE phone normalisation, quote maths, report calculations | `shared` |
| `packages/demo-data` | The Noor Al Marsa clinic story and the simulator's lead/message generators | `core`, `shared` |
| `apps/web` | React app; `src/mock` is the Phase A backend | all of the above |
| `apps/api`, `packages/db`, `packages/adapters` | Phase B/C (empty today) | — |

Rules of the house: domain logic lives in `core` as pure functions and is called by both the mock handlers and (later) the API. Route handlers and mock handlers stay thin. Nothing in `core` touches the network, the database or `window`.

## The request path today

```
screen ──callApi(route)──▶ mock transport ──▶ handler for that route ──▶ tables in localStorage
                               │  validates input and output against the contract
                               │  runs the whole call as a transaction: mutate a draft,
                               │  save only if the handler succeeds (no half-written state)
                               └─▶ live events ──▶ every open tab refetches, toasts for the assignee
```

**Sessions are per browser tab** (`sessionStorage`), while **data is shared across tabs** (`localStorage`). That is what lets the demo run as the owner in one window and a rep in another — the panel fires a lead, the rep's window receives it in about a second. Phase B replaces the transport, not this behaviour: live events become Server-Sent Events from the API.

## The ingestion path (Phase B/C — the core of the product)

```
Meta WhatsApp ─┐
Meta Lead Ads ─┤  POST /webhooks/:adapter   verify signature → parse → enqueue → 200 in <200ms
TikTok ────────┤                            (never process inline)
Gmail (poll) ──┤
Simulator ─────┘
                        │
                   Redis queue (BullMQ)
                        │
                   worker: hydrate → ingestEvent()
                        │  dedupe on (adapter, externalId)
                        │  resolve Workspace from the connected account id
                        │  match person: WhatsApp user id → any phone → email
                        │  create/update Lead, Conversation, Message, Activity
                        │  assign round-robin, create the 15-minute task
                        │
                        ├──▶ Postgres (every row carries workspace_id)
                        └──▶ publish event ──▶ API ──SSE──▶ browsers
```

**It already exists in miniature.** `apps/web/src/mock/services.ts` implements `ingestLead` and `ingestWhatsappMessage` with the same rules — duplicate suppression, person matching, round-robin, the auto-task, the notification. The Simulator calls those functions; so will every real adapter. The demo therefore exercises the real logic, and Phase B ports it behind a repository interface rather than reinventing it.

## Decisions worth knowing

| Decision | Why |
|---|---|
| **Contract-first, mock backend** | Six UI workstreams could be built in parallel without a server, and no screen has to change when the real API arrives. |
| **`ingestLead` / `ingestWhatsappMessage` live in one place** | The brief's rule — leads and messages must travel the same path as real channels — is enforced by there being only one path. |
| **Domain errors carry their HTTP status** (`packages/core/src/result.ts`) | Rules return `Result`, not exceptions, so the same rule serves the mock backend and Fastify with identical status codes (409, 422, 403). |
| **Money is a decimal string, never a float** (`packages/core/src/money.ts`, `big.js`) | Fil-level rounding is checked in tests; `toMoneyString` rounds half-up to 2 decimals. |
| **Phones normalise to E.164 with AE as the default region** | `+971 50 123 4567`, `050 123 4567` and `00971…` all become `+971501234567`; foreign numbers keep their own country code. |
| **Every table row carries `workspaceId`** | Multi-tenant from day one; the mock's `rows()` helper scopes every read, and Phase B's repository will do the same. |
| **Role visibility is a function, not a screen rule** (`canSeeAssigned`) | Reps see their own and unassigned records in the UI *and* in handlers, so the rule cannot be bypassed by calling the API directly. |
| **IDs are UUIDv7** | Time-ordered, so they sort usefully and index well. |
| **Prisma 7 pinned exactly** | `prisma@latest` is currently an 8.0 release candidate — an unpinned install would silently pull a rewrite. |
| **Own session auth on Node crypto, not Lucia** | Lucia is deprecated and its replacement needs APIs Node 22 doesn't have; Better Auth expects to own the user table. Our auth is ~300 lines: scrypt, hashed session tokens, rate-limited login. |
| **No audio in the guided tour** | Autoplay is blocked by browsers anyway, and a screen-shared laptop usually mutes. Text cards carry it; the presenter's voice is the narration. |

## What changes in Phase B

1. `apps/api`: Fastify + the same zod schemas, OpenAPI generated from the contract, repository layer enforcing workspace and role scoping.
2. `packages/db`: the Prisma 7 schema mirroring `Tables` exactly, with forward-only migrations.
3. Auth: email + password sessions, invite links, replacing the demo user picker.
4. The Simulator moves server-side behind `/dev/simulate/*` (gated by `DEMO_MODE`), and `apps/web/src/mock` is deleted.
5. Live events switch from the in-browser bus to SSE.
6. Tests return: core rules, cross-tenant isolation, and the milestone demo scripts.

## Where the demo data lives

`packages/demo-data` builds the entire clinic story deterministically from a seed and a `now` — 135 leads, 40 contacts, 15 companies, 25 deals across 6 stages, 32 conversations, quotes, tasks and notifications. Every timestamp is relative to `now`, so the story is always "this week". `pnpm --filter @hco/demo-data exec tsx scripts/summary.ts` prints the numbers.
