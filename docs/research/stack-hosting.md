# Stack & hosting research (verified 2026-09-17)

Sources are primary (official docs, GitHub repos/releases, live npm registry `dist-tags`/`peerDependencies`) unless marked *community* or *inference*. Version numbers come from `registry.npmjs.org` on 2026-09-17.

## TL;DR: things that change our design

- **Prisma: `prisma@latest` on npm is `8.0.0-rc.15`, but `@prisma/client@latest` is `7.10.0`.** Running `pnpm add -D prisma` with no version installs an RC that doesn't match the client. Prisma 8 is a rewrite: a new chained query API (`db.orm.public.User...all()`), a "contract" schema, Temporal dates and a new migration flow. GA is expected "4–8 weeks" after 2026-09-09, and Prisma 7 gets 12 months of fixes. Prisma's unversioned doc URLs now describe v8; v7 docs live under `/docs/orm/v7/`.
- **Prisma 7 breaking changes:** ESM-only; `prisma.config.ts` holds the datasource URL; `prisma-client` generator with a **required `output`**; a driver adapter is **required** (`@prisma/adapter-pg`); `.env` isn't auto-loaded; `$use` middleware is removed (use `$extends` query components); no auto-seed; invalid SSL certs now fail. The Node pool settings replace Prisma's old defaults.
- **`@default(uuid(7))` works (since 5.18.0), but Prisma generates the value in the app, not in the DB.** Raw SQL inserts get no default. Native `uuidv7()` needs PostgreSQL 18.
- **BullMQ 6 (2026-07-30) is a breaking major with pluggable backends.** It includes a **PostgreSQL backend** (PG 13+, same API, roughly 1.5–2× lower processing throughput, own `bullmq` schema, explicit `runMigrations`, one long-lived `LISTEN` connection per backend). For Redis users: `ioredis` is now an optional peer you must install; legacy repeatable jobs are removed (use Job Schedulers); `debounce`, the `paused` state and `Job#discard` are gone; `Worker#resume()` is now async.
- **shadcn/ui CLI v4 (Mar 2026) starts new projects on Tailwind v4 + React 19.** Its v4-style components drop `forwardRef` (ref passed as a prop). *Inference:* on React 18, refs passed to these components won't attach. React 18 + Tailwind v3 projects still get the older `forwardRef` components. Since Sep 2026, components import `cn` from a new `cn` package. TanStack Router/Query, Radix, Base UI and @react-pdf/renderer all still accept React 18.
- **Lucia is deprecated (Mar 2025).** lucia-auth.com was rebuilt Jul 2026 and the old guide URLs (e.g. `/sessions/basic`, `/lucia-v3/migrate`) return 404. Its replacement is one copy-paste file (`auth_session.ts`) that uses `Uint8Array.fromBase64/toBase64`; **those don't exist in Node 22.23** (checked locally). **npm now marks most `@oslojs/*` packages (crypto, binary, otp, jwt, webauthn, oauth2) and `arctic` as deprecated.**
- **Better Auth is at 1.7.5; 1.7.0 (2026-08-17) had breaking changes**, mostly OAuth account identity (`issuer`), with DB joins moved to `advanced.database.joins`. The CLI is now the `auth` package (`npx auth@latest generate`); `@better-auth/cli` is deprecated. A June 2026 security advisory covered OAuth/SSO/OIDC flaws.
- **Neither Railway nor Fly has a Middle East region.**
  - Railway has 4 regions: US West, US East, Amsterdam, Singapore.
  - Fly has 18 regions after retiring 17 in Sep 2025. `bom` (Mumbai) exists but **can't host Managed Postgres**. The nearest MPG regions are `fra`/`ams`/`lhr`/`sin`.
- **Railway's `railway.json`/`railway.toml` (Config as Code) is deprecated and stops being read on 2026-12-01.** The replacement is Infrastructure as Code in `.railway/railway.ts`, applied with `railway config plan/apply`.
- **Railway HTTP limits:** requests can run at most 15 min, and are closed after 5 min with no data. SSE streams are therefore cut at 15 min, while WebSockets are exempt. On a private network, ioredis/BullMQ need `family: 0`.
- **Cloudflare quick tunnels (`trycloudflare`) don't support SSE**, cap in-flight requests at 200 (then return 429), and have no SLA.
- **pnpm 12 shipped 2026-08-26.** Our pnpm 11.13 is still maintained (11.27.0 was released 2026-09-12). pnpm 11 changes: Node 22+ required, settings live in `pnpm-workspace.yaml`, `allowBuilds` replaces `onlyBuiltDependencies`, and **`minimumReleaseAge` defaults to 1 day**, which delays fresh security patches. Turborepo handles pnpm 11 lockfiles from 2.9.7; the current version is 2.10.13.
- **fastify-type-provider-zod 7.0.0 requires Zod ≥ 4.2** (per README; its peer range says ≥ 4.1.5), Fastify ^5.5 and @fastify/swagger ≥ 9.5.1. Response serialization now types against `z.output`. Fastify 6 is at alpha.4.

---

## 1. Auth: Lucia, Better Auth, roll-your-own

**Lucia**
- Deprecated. README: "Lucia was deprecated on March 2025. See code/auth_session.ts for a complete, single-file replacement for the NPM package." The npm `lucia@3.2.2` deprecation message points to `lucia-auth.com/lucia-v3/migrate`, which now returns 404. https://github.com/lucia-auth/lucia · https://www.npmjs.com/package/lucia
- The maintainer now points people to learning material instead of a library: **The Auth Book** (https://auth.pilcrowonpaper.com/sessions) and `code/auth_session.ts` (0BSD license) (https://github.com/lucia-auth/lucia/blob/main/code/auth_session.ts). lucia-auth.com was refreshed Jul 2026 as a learning resource; old paths like `/sessions/basic` return 404. https://lucia-auth.com/
- `auth_session.ts` design:
  - Token = `id + "." + base64(32 random bytes)`.
  - The DB stores the SHA-256 hash of the secret (binary), plus `token_last_verified_at` and `created_at`.
  - Sessions last 10 days and slide when the token is validated.
  - Hashes are compared in constant time.
  - It calls for CSRF checks via the `Sec-Fetch-Site` header on non-GET requests.
  - It uses `Uint8Array.fromBase64()`/`.toBase64()`; the file itself notes these need Node 25. **They're undefined on Node 22.23.1** (tested).
- **Oslo:** the `oslo` package is deprecated in favor of `@oslojs/*` (https://oslojs.dev). npm now also marks `@oslojs/crypto`, `binary`, `otp`, `jwt`, `webauthn`, `oauth2` and `arctic` as deprecated ("Package no longer supported"); `@oslojs/encoding` isn't. The oslo GitHub repos aren't archived (crypto was last pushed 2024-10). Source: npm registry.

**Better Auth** (https://www.better-auth.com)
- Versions: `better-auth` 1.7.5 is latest (2026-09-14). A 1.6.x line is still patched (`release-1.6` = 1.6.33). The peer ranges accept `prisma`/`@prisma/client` ^5, ^6 or ^7 and `react` ^18 or ^19. https://www.npmjs.com/package/better-auth
- 1.7.0 (2026-08-17) breaking changes:
  - Accounts are keyed on `(issuer, accountId)`, which needs a new `Account.issuer` column.
  - DB joins are no longer experimental: `advanced.database.joins`.
  - The MCP plugin moved to `@better-auth/mcp`.
  - Generic OAuth was rewritten; SCIM is decoupled from the organization plugin.
  - https://better-auth.com/changelog · https://better-auth.com/blog/1-7
- Security advisory (June 2026): OAuth account linking, OIDC refresh tokens, SSO and device flow. Update scoped packages too. https://better-auth.com/blog/security-update-june-2026
- Email + password: `emailAndPassword: { enabled: true }`. Passwords are hashed with **scrypt** by default and you can plug in custom `hash`/`verify` (e.g. argon2). Length is 8–128 by default. It supports `sendVerificationEmail`, `sendResetPassword`, `revokeSessionsOnPasswordReset`, `disableSignUp` and `autoSignIn`. The password is stored in the `account` table (credential provider). https://www.better-auth.com/docs/authentication/email-password
- Sessions:
  - Stored in the DB `session` table plus a `session_token` cookie.
  - Defaults: `expiresIn` 7d, `updateAge` 1d, `freshAge` 1d.
  - Optional `cookieCache` (compact/jwt/jwe), optional `secondaryStorage` (Redis via `@better-auth/redis-storage`), and a stateless mode.
  - APIs to list and revoke sessions.
  - https://www.better-auth.com/docs/concepts/session-management
- Schema and IDs: core tables are `user`, `session`, `account` and `verification`. `advanced.database.generateId` accepts `false | "uuid" | "serial" | fn`, and you can rename things with `modelName`/`fields`/`additionalFields`. https://www.better-auth.com/docs/concepts/database
- Prisma adapter: `prismaAdapter(prisma, { provider: "postgresql" })` from `better-auth/adapters/prisma`. On Prisma 7, import `PrismaClient` from the custom output path and pass it a `PrismaPg` adapter. Generate the schema with `npx auth@latest generate`, then `prisma migrate dev`. The `auth` CLI package is 1.7.5; `@better-auth/cli` is deprecated on npm. https://www.better-auth.com/docs/adapters/prisma
- Fastify: there's no plugin. You mount a catch-all `/api/auth/*` route that converts the request to a Fetch `Request` (using `fromNodeHeaders`) and calls `auth.handler()`. Register `@fastify/cors` first and set `trustedOrigins`. The guide says ESM is required. https://www.better-auth.com/docs/integrations/fastify

## 2. Prisma ORM

- **Latest stable is 7.10.0** (released 2026-08-25). `@prisma/client` engines: Node `^20.19 || ^22.12 || >=24`, TypeScript ≥ 5.4. **The `prisma` package's `latest` dist-tag is `8.0.0-rc.15`** (`prev` = 7.10.0), so versions must be pinned explicitly. Prisma's v7 pnpm guide pins `prisma: 7.10.0` through a pnpm catalog. Sources: npm registry; https://www.prisma.io/docs/guides/v7/deployment/pnpm-workspaces
- **Prisma 8 status:** RC (GitHub releases v8.0.0-rc.3 → rc.11 in Aug–Sep 2026). GA is "four to eight weeks out" from 2026-09-09, and "Prisma 7 will receive bug fixes and security updates for the next 12 months". https://www.prisma.io/blog/is-prisma-8-ready-for-long-lived-production-apps
  - The v8 query API is chained (`db.orm.public.User.include(...).all()`), the schema moves to `contract.prisma`, and migrations become `migration plan` / `db migrate`. Prisma 7 and 8 clients can run side by side. https://www.prisma.io/docs/guides/upgrade-prisma-orm/postgresql
  - RC changelogs report `.take/.skip` renamed to `.limit/.offset` and PG date/time columns returned as Temporal values, not `Date` (search summary of the release notes; not read directly).
- **`@default(uuid(7))`:** supported since **5.18.0** (Aug 2024). The v7 reference lists `uuid()`, `uuid(4)`, `uuid(7)`, `cuid(2)`, `ulid()` and `nanoid()`. uuid is "Implemented by Prisma ORM and therefore not 'visible' in the underlying database schema". For a DB-side default use `dbgenerated(...)`; PostgreSQL's `uuidv7()` is PG 18+ only. https://www.prisma.io/docs/orm/v7/reference/prisma-schema-reference · https://www.prisma.io/changelog/2024-08-08 · https://www.postgresql.org/docs/18/functions-uuid.html
- **Prisma 7 breaking changes** (https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7):
  - Ships as ESM: set `"type": "module"`, `module: ESNext`, `moduleResolution: bundler`.
  - `prisma-client-js` is deprecated in favor of `prisma-client`, and **`output` is required**.
  - `url`/`directUrl`/`shadowDatabaseUrl` in `datasource` are deprecated; they move to **`prisma.config.ts`** (`datasource: { url: env("DATABASE_URL") }`).
  - **Driver adapters are required**; PostgreSQL uses `@prisma/adapter-pg` (depends on `pg` ^8.16.3). Pool behavior now follows node-postgres defaults.
  - Env vars aren't loaded automatically (use `dotenv`).
  - Removed: `$use()` middleware, the metrics preview, auto-seeding on `migrate dev`, and the `--skip-generate`/`--skip-seed` flags.
  - Invalid SSL certificates, previously ignored, now error.
  - The planned change to mapped enums was reverted.
- **`prisma-client` generator options:** `output` (required), `runtime` (default `nodejs`), `moduleFormat` (`esm`/`cjs`), `generatedFileExtension`, `importFileExtension`. It generates `client.ts`, **`browser.ts`** (types, enums and `Prisma.Decimal` without `PrismaClient`, safe for the frontend), `models.ts`, `enums.ts` and `commonInputTypes.ts`. https://www.prisma.io/docs/orm/prisma-schema/overview/generators
- **Decimal:** still decimal.js (`Prisma.Decimal`). On PG it maps to `decimal(65,30)` unless you set `@db.Decimal(p,s)`. https://www.prisma.io/docs/orm/v7/reference/prisma-schema-reference
- **Monorepo:** the official v7 pnpm-workspaces and Turborepo guides use a shared `database` package holding `prisma.config.ts`, the generated client (e.g. `../generated/client`), and an `index.ts` re-exporting `prisma` plus the generated types. `db:generate` must run before `dev`/`build`. https://www.prisma.io/docs/guides/v7/deployment/turborepo
- **Client extensions for tenant scoping:** still supported in v7. The query component `$extends({ query: { $allModels: { $allOperations } } })` can change `args`, e.g. `args.where = { ...args.where, ... }`. You can't change `include`/`select`, and `model` is `undefined` for raw queries inside batch transactions. https://www.prisma.io/docs/orm/v7/prisma-client/client-extensions/query
  - *Inference:* nested relation reads/writes and `create` data aren't covered by a top-level `where` injection. Verify before relying on it as the only tenant guard.

## 3. React 18 compatibility & Tailwind/shadcn

| Package (latest) | React peer | Source |
|---|---|---|
| react 19.3.0 (latest) | — | npm |
| @tanstack/react-router 1.170.38 | `>=18.0.0 \|\| >=19.0.0`; engines node ≥20.19 | npm; docs say "React 18.x.x or 19.x.x" https://tanstack.com/router/v1/docs/how-to/install |
| @tanstack/react-query 5.103.1 | `^18 \|\| ^19` | npm; "compatible with React v18+" https://tanstack.com/query/latest/docs/framework/react/installation |
| @react-pdf/renderer 4.9.0 | `^16.8 \|\| ^17 \|\| ^18 \|\| ^19` (React 19 since 4.1.0) | https://react-pdf.org/compatibility (tests Node 18/20/21; `__dirname` issue when esbuild-bundled as ESM) |
| radix-ui 1.6.7 / @base-ui/react 1.8.0 / react-aria-components 1.21.1 / sonner 2.0.8 | all include ^18 | npm |
| shadcn (CLI) 4.21.0 | n/a (CLI; engines node ≥20.18.1) | npm |

- **shadcn/ui defaults:** "New projects start with Tailwind v4 and React 19." "Your existing apps with Tailwind v3 and React 18 will still work. When you add new components, they'll still be in v3 and React 18 until you upgrade." v4 components: "We've removed the forwardRefs", added `data-slot`, OKLCH colors, `toast` deprecated for `sonner`, `tailwindcss-animate` replaced by `tw-animate-css`, `default` style replaced by `new-york`. https://ui.shadcn.com/docs/tailwind-v4
- **Verified in the registry:** `new-york-v4/button.json` and `input.json` are plain function components with no `forwardRef`, and depend on `radix-ui` and `cn`. The legacy `new-york/input.json` still uses `forwardRef`. https://ui.shadcn.com/r/styles/new-york-v4/button.json
  - *Inference:* on React 18, `ref` isn't passed to function components as a prop. Anything that needs a ref to a v4 shadcn component (RHF `register`, Radix `asChild` trigger anchoring) will fail silently or warn. **No package-level React 19 requirement exists; the React 19 dependency is in the generated component code.**
- **CLI changes:**
  - CLI v4 (Mar 2026): presets, `registry:base`, fonts as a registry type, dry-run, and skills for coding agents. https://ui.shadcn.com/docs/changelog/2026-03-cli-v4
  - Base UI and React Aria sit alongside Radix; `shadcn create` arrived Dec 2025.
  - Sep 2026: the `cn` package replaces `clsx` + `tailwind-merge`. Not breaking; migrate with `shadcn migrate cn`. https://ui.shadcn.com/docs/changelog/2026-09-cn
  - Vite setup: `pnpm dlx shadcn@latest init -t vite` (or `--preset`), with `@tailwindcss/vite` and a `--monorepo` flag. https://ui.shadcn.com/docs/installation/vite
- **Tailwind:** v4.3.3 is latest. It needs Chrome 111, Safari 16.4 and Firefox 128. https://tailwindcss.com/docs/compatibility

## 4. Fastify + Zod + OpenAPI

- **Fastify 5.12.5** is current (v5 released 2024-09-17; LTS end TBD; Node 20, 22). v4's LTS ended 2025-06-30. **6.0.0-alpha.4** was published 2026-09-16 and removes deprecated types, disables error-handler overrides by default and moves to undici v8. https://fastify.dev/docs/latest/Reference/LTS/ · https://github.com/fastify/fastify/releases/tag/v6.0.0-alpha.4
- **fastify-type-provider-zod 7.0.0** (2026-06-24):
  - Peers: `zod >=4.1.5`, `fastify ^5.5.0`, `@fastify/swagger >=9.5.1`, `openapi-types ^12.1.3`. README compatibility: v5–v6 work with Zod 4; **v7+ needs Zod 4.2+** because it uses `.encode()/.decode()`, and "response serialization is now based on `z.output<T>`".
  - v6 picks OpenAPI 3.0 or 3.1 from the document's `openapi` field.
  - v5 (2025-06) switched to the Zod v4 API.
  - OpenAPI generation: `jsonSchemaTransform` / `createJsonSchemaTransform`; named components via `z.globalRegistry.add(schema, { id })` plus `jsonSchemaTransformObject`.
  - https://github.com/turkerdev/fastify-type-provider-zod
- **Alternative:** `fastify-zod-openapi` 5.7.0. Peers: `zod ^3.25.74 || ^4`, `fastify 5`, `@fastify/swagger ^9`, `@fastify/swagger-ui ^5.0.1 || ^6`. Source: npm.
- Latest versions: `zod` 4.6.5, `@fastify/swagger` 9.8.1 (npm).

## 5. BullMQ & Redis

- **BullMQ 6.3.6** is current. 6.0.0 was released 2026-07-30; 5.x is still patched (5.81.5 on 2026-09-10).
- **v6 breaking changes** (https://github.com/taskforcesh/bullmq/releases/tag/v6.0.0):
  - Queue backends are pluggable (`IQueueBackend`); the `Connection` constructor parameter becomes a `BackendFactory`.
  - `Queue#client`/`redisVersion` and `Worker#blockingClient` are removed; use `getBackend()`.
  - **Legacy repeatable jobs are removed** (`repeat` option, `getRepeatableJobs`, etc.); use Job Schedulers.
  - `Worker#resume()` is now async.
  - `debounce` is removed (use deduplication), and deduplication isn't allowed on parent flow nodes.
  - `Job#discard()` is removed (use `UnrecoverableError`).
  - **`ioredis` is now an optional peer and must be installed explicitly.**
  - The `paused` job state is removed; paused jobs show as waiting.
  - RepeatOptions drops `utc` (use `tz: 'UTC'`).
- **PostgreSQL backend** (https://docs.bullmq.io/guide/postgresql):
  - Requires PG 13+ (14+ recommended) and `pg` as an optional peer. Enable with `createPostgresBackend`, passed per class or set via `setDefaultBackendFactory`.
  - Uses its own schema; "Connections do not apply migrations automatically", so run `runMigrations` once at deploy. Schema downgrades aren't supported.
  - Uses a `pg.Pool` plus one dedicated long-lived `LISTEN` connection per backend.
  - The docs say "Redis backend remains the default and the most battle-tested option." Processing throughput is about 1.5–2× lower than Redis.
  - Feature parity includes flows, schedulers, rate limits, priorities, delays, dedup, metrics and events.
- **Redis requirements:**
  - Redis ≥ 6.2.0 ("Redis™ Compatibility" docs page).
  - **`maxmemory-policy noeviction`** is mandatory; AOF persistence recommended. Workers need `maxRetriesPerRequest: null`; keep `enableOfflineQueue` on for workers and off for producers. https://docs.bullmq.io/guide/going-to-production
  - Don't use the ioredis `keyPrefix` option (use BullMQ's `prefix`).
  - Client adapters exist for ioredis, node-redis ≥5, Bun and Valkey Glide (`createValkeyGlideClient`). https://docs.bullmq.io/guide/connections
- **Valkey:** usable through the Glide adapter or standard clients. bullmq.io published benchmarks on Valkey 7.2, 8.1 and 9.0 (https://bullmq.io/articles/benchmarks/valkey-performance-across-versions/). The official compatibility page lists only **Dragonfly** as a tested vendor.
- **Upstash:** BullMQ polls Redis even when idle, so Upstash says "we recommend switching to a Fixed plan". Pay-as-you-go costs $0.20 per 100K commands; TLS is required (`tls: {}`). https://upstash.com/docs/redis/integrations/bullmq
  - On Fly, Upstash's default is to reject writes when full (eviction is opt-in). Fixed plans start at $10/mo for 250 MB. https://fly.io/docs/upstash/redis/
- `ioredis` 6.0.0 (2026-07-31) adds RESP3 and requires Node ≥ 20. https://github.com/redis/ioredis/releases/tag/v6.0.0

## 6. Railway

- **Regions:** US West (`us-west2`), US East (`us-east4-eqdc4a`), EU West Amsterdam (`europe-west4-drams3a`), Southeast Asia Singapore (`asia-southeast1-eqsg3a`). **No Middle East or India region.** Volumes follow their service's region. https://docs.railway.com/reference/deployment-regions
- **Postgres and Redis are unmanaged templates** ("considered unmanaged"). Postgres is an SSL image built on the Docker Hub `postgres` image; Railway's template repo has Dockerfiles for PG 13–18. Postgres exposes `DATABASE_URL`/`DATABASE_PUBLIC_URL`; Redis exposes `REDIS_URL`.
  - HA upgrade: Patroni + etcd + HAProxy. PITR: pgBackRest WAL archiving to a bucket, about 4 weeks of retention.
  - Volume backups: daily kept 6 days, weekly kept 27 days, monthly kept 89 days.
  - https://docs.railway.com/databases/postgresql · https://docs.railway.com/databases/postgresql-ha · https://docs.railway.com/volumes/point-in-time-recovery · https://docs.railway.com/volumes/backups · https://docs.railway.com/databases/redis
- **Buckets:** S3-compatible and run on Tigris. Region is picked at creation and can't be changed. $0.015/GB-month; S3 operations and egress are free. Presigned URLs work; **public buckets aren't supported**. Limits: Free plan 10 GB-month, Hobby 1 TB, Pro unlimited. https://docs.railway.com/storage-buckets · https://docs.railway.com/storage-buckets/billing
- **CLI deploy:** `railway up [path]` uploads the directory, respects `.gitignore`, and builds with Railpack or a Dockerfile. Flags: `--service`, `--environment`, `--detach`, `--ci`, `--path-as-root`. Use `RAILWAY_TOKEN` (project token) in CI. https://docs.railway.com/cli/deploying
- **Monorepo:** for shared (pnpm) monorepos, give each service its own build/start command (e.g. `pnpm --filter backend build`) plus watch paths. JS monorepos are auto-detected. "The Railway Config File does not follow the Root Directory path." https://docs.railway.com/deployments/monorepo
- **Config as code is deprecated.** "Existing files keep working for legacy services until 2026-12-01", after which they stop being read. The replacement is **Infrastructure as Code**:
  - Lives in `.railway/railway.ts` (TypeScript DSL `defineRailway/project/service`, GA; Python and Go are beta).
  - Commands: `railway config plan` / `apply` / `pull`, and `railway config migrate --apply` to convert old files.
  - Databases and buckets can be declared in it.
  - https://docs.railway.com/reference/config-as-code · https://docs.railway.com/infrastructure-as-code
- **Pricing** (https://docs.railway.com/reference/pricing/plans):
  - Plans: Free $0 with $1/mo credit; **Hobby $5/mo including $5 usage** (limits: 48 vCPU / 48 GB RAM / 5 GB volume / 6 replicas); Pro $20/mo including $20.
  - Usage rates: RAM $10/GB-mo, CPU $20/vCPU-mo, volumes $0.15/GB-mo, egress $0.05/GB.
- **HTTP limits:** HTTP/1.1 and HTTP/2. "HTTP requests can run for up to 15 minutes if data keeps transferring … otherwise closed after 5 minutes with no data transferred." Request bodies must finish uploading within 5 min, headers are capped at 32 KB, and idle HTTP/1.1 keep-alive closes after 60 s. **WebSockets are exempt** from these limits. So SSE needs heartbeats more often than every 5 min and a client reconnect at 15 min. https://docs.railway.com/networking/public-networking/specs-and-limits
- **Private networking:** environments created after 2025-10-16 resolve `*.railway.internal` to IPv4 and IPv6; older ones are IPv6-only. Railway's docs say ioredis and BullMQ need `family: 0`. https://docs.railway.com/networking/private-networking/how-it-works · https://docs.railway.com/networking/private-networking/library-configuration

## 7. Fly.io

- **Regions (18):** ams, arn, bom, cdg, dfw, ewr, fra, gru, iad, jnb, lax, lhr, nrt, ord, sin, sjc, syd, yyz. **No Middle East region.** `bom` (Mumbai) is available but **not an MPG region**. MPG regions: ams, dfw, fra, gru, iad, lax, lhr, nrt, ord, sin, sjc, syd, yyz. https://fly.io/docs/reference/regions/
- **Region consolidation:** Fly retired 17 of 35 regions in Sep 2025 (e.g. mad, otp, waw, atl, hkg…), with automatic or manual migration. https://fly.io/blog/the-region-consolidation-project/
- **Managed Postgres (MPG):** a production service with HA, automatic backups and pooling.
  - Plans: Basic (shared-2x, 1 GB) $38/mo, Starter (2 GB) $72, Launch (perf-2x, 8 GB) $282; storage $0.28/GB-mo. Inter-region private traffic is billed from Feb 2026.
  - Runs PG 16 with pgvector and PostGIS. Security patches and version upgrades are listed as "under development".
  - https://fly.io/docs/mpg/
- **MPG pooling:** PgBouncer is included and defaults to **session mode**; transaction mode is optional and requires disabling named prepared statements. **Use the direct URL for migrations, advisory locks and `LISTEN/NOTIFY`.** PgBouncer closes clients idle for 600 s; Fly suggests a 300 s client idle timeout and 600 s max lifetime. https://fly.io/docs/mpg/client-configuration/ · https://fly.io/docs/mpg/cluster-configuration/
- **Redis:** Upstash for Redis, created with `flyctl redis create`. Its docs call out BullMQ explicitly and suggest fixed plans ($10 for 250 MB, $20 for 1 GB, plus per-read-region fees). https://fly.io/docs/upstash/redis/
- **Object storage:** Tigris via `fly storage create`, which sets `AWS_*` secrets. Canonical endpoint `https://t3.storage.dev` (older `fly.storage.tigris.dev` also works), region `auto`. The docs page is marked `status: beta`. https://fly.io/docs/tigris/
- **Multiple processes:** a `[processes]` table in `fly.toml` (e.g. `web`, `worker`). Each group runs on its own Machines from the same image and shares the app's secrets. `[[services]]`/`http_service` pick processes with `processes = ["web"]`. `fly deploy` rolls out all groups; `release_command` has a 5-minute default timeout. https://fly.io/docs/apps/processes/ · https://fly.io/docs/reference/configuration/
- **SSE/idle timeout:** *Community reports only:* the Fly proxy closes connections after about 60 s with no data (https://community.fly.io/t/60s-timeout-on-server-sent-events/13152, 2023). No official doc states the current value; see Open.

## 8. Cloudflare quick tunnels

- **Still available** with `cloudflared tunnel --url http://localhost:8080` (needs cloudflared ≥ 2020.5.1; latest 2026.9.1). The doc was last updated 2026-04-20.
- **Limits:**
  - "Intended for testing and development only."
  - A hard cap of **200 in-flight requests**; beyond that it returns **429**.
  - "**Quick Tunnels do not support Server-Sent Events (SSE).**"
  - Doesn't work when `~/.cloudflared/config.yaml` exists.
  - No SLA or uptime guarantee.
  - Named (account) tunnels don't have these limits.
- https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/

## 9. libphonenumber-js (1.13.13)

- **Default region:** `parsePhoneNumber(input, 'AE')` or `{ defaultCountry: 'AE' }`. The default country only applies to numbers without `+`. `extract: true` is the default (it pulls a number out of surrounding text); pass `extract: false` for strict parsing. `parsePhoneNumberWithError` throws `NOT_A_NUMBER`, `INVALID_COUNTRY`, `TOO_SHORT` or `TOO_LONG`. https://github.com/catamphetamine/libphonenumber-js (primary repo is on GitLab)
- **Metadata sets:**
  - `min` is the default (~80 kB). `isValid()` then only checks length, so it behaves like `isPossible()`, and `getType()` is unavailable.
  - `max` (~145 kB) adds real digit validation and `getType()`.
  - `mobile` (~95 kB) is `max` for mobile numbers only.
  - `core` lets you supply custom metadata.
  - Import from `libphonenumber-js/min|max|mobile|core`.
  - The author prefers `isPossiblePhoneNumber()`, because strict validation can go stale.
- **Local test (1.13.13, AE):**
  - `050 123 4567`, `0501234567`, `501234567`, `00971501234567` and `971501234567` all become `+971501234567`; `max` reports `MOBILE`.
  - `04 331 2345` becomes `+97143312345`, `FIXED_LINE`.
  - `0591234567` and `04 123 4567`: `min` says valid, `max` says invalid.
  - `formatNational()` gives `054 123 4567`; `formatInternational()` gives `+971 54 123 4567`.

## 10. Turborepo & pnpm

- **Turborepo 2.10.13** (2026-09-14) is current; major 2 since 2024-06. The support policy lists "pnpm 8+". https://turborepo.dev/docs/getting-started/support-policy
- **pnpm 11 support in Turborepo:** "Support pnpm v11 multi-document lockfiles" (#12616) and "pnpm 11 flat patch lockfiles" (#12676) shipped in **2.9.7** (2026-05-01). Many `turbo prune` fixes for pnpm followed in 2.10.x (overrides, patches, injected peers, aliased deps). The Turborepo repo itself moved to pnpm 12 in 2.10.13. https://github.com/vercel/turborepo/releases
- **pnpm versions:** `latest` is 12.4.2 (pnpm 12.0.0 released 2026-08-26); `latest-11` is 11.26.0 and `next-11` is 11.27.0.
  - pnpm 12 breaking changes: unknown `pnpm-workspace.yaml` settings error when the pnpm version is pinned, lockfiles for cyclic peer dependencies are now deterministic, git specifiers are normalized, `engineStrict` is tightened. https://pnpm.io/blog/releases/12.0
- **pnpm 11 breaking changes** (https://pnpm.io/blog/releases/11.0):
  - Node 22+ required; pnpm itself is pure ESM.
  - pnpm settings move from `.npmrc` to `pnpm-workspace.yaml` (auth and registry stay in `.npmrc`).
  - A single **`allowBuilds`** map replaces `onlyBuiltDependencies` and friends. Packages with install scripts, such as Prisma engines and esbuild, need an explicit allow.
  - **`minimumReleaseAge` defaults to 1440 min.**
  - `npm_config_*` env vars are ignored (use `pnpm_config_*`).
  - The store index is now SQLite.
  - `publish`, `login` and similar commands are reimplemented natively or removed.

---

## Open / unverifiable

- **Latency to the UAE:** not measured for Railway Singapore or Amsterdam, or Fly `bom` vs `fra`/`sin`. Needs a real ping or trace from the UAE.
- **Fly proxy idle timeout for SSE:** no official doc found; the only source is 2022–2023 community threads (60 s). Whether periodic data resets it wasn't confirmed.
- **Why the `@oslojs/*` and `arctic` packages are marked "no longer supported" on npm:** no announcement found. It could be a takedown or account action rather than the author deprecating them.
- **Default Postgres major version for Railway's template:** not stated in the docs (Dockerfiles exist for 13–18). **Plan availability for Railway PITR/HA:** not confirmed.
- **Prisma 8 details** (Decimal handling, extensions/tenant-scoping equivalent, `.limit/.offset`, Temporal dates): come from search summaries of RC release notes, not read directly. The RCs can still break.
- **Prisma 7 + `@prisma/adapter-pg` behind PgBouncer transaction mode:** Fly's `?pgbouncer=true` advice is for the old engine. Compatibility of node-postgres's unnamed prepared statements was not verified.
- **BullMQ PostgreSQL backend behind PgBouncer transaction mode:** not addressed in its docs. It needs a dedicated `LISTEN` connection, so *inference:* it needs a direct or session-mode connection.
- **shadcn on React 18:** the ref problem is inferred from the component source, not tested. It's also unverified whether new components (e.g. Questionnaire) are still published for the legacy (Tailwind v3) styles.
- **Stock Redis default `maxmemory-policy`:** assumed `noeviction`, not confirmed on redis.io; Railway's Redis template setting also unconfirmed. Check with `CONFIG GET maxmemory-policy` after provisioning.
- **Valkey server compatibility with BullMQ:** it's benchmarked by bullmq.io but not on the official "tested vendors" list.
- **Which install scripts Prisma 7 needs under pnpm 11 `allowBuilds`:** unverified.
