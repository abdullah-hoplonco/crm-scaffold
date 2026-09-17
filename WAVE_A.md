# Wave A1 — Screens in parallel

Seven workstreams build the showcase screens at the same time, each in its own git worktree and branch (`phase-a/<workstream>`). The orchestrator merges them in A2.

Read first: `docs/BRIEF.md` (§1, §4, §5, §7 for your milestones), `CONTEXT.md` (use these words in the UI and code), `PLAN.md`.

## The showcase in one paragraph

HCO CRM (by Hoplon & Co) is a WhatsApp-first sales CRM for UAE SMEs. The client demo uses a fictional Dubai clinic, **Noor Al Marsa Aesthetic & Dental Clinic**:

- **People:**
  - Owner: Dr. Hessa Al Suwaidi.
  - Manager: Omar Farouk.
  - Reps (patient coordinators): Priya Nair, Yousef Darwish, Maria Santos.
- **Leads** come from Instagram, Facebook, TikTok and WhatsApp.
- **Pipeline** stages:
  1. New enquiry
  2. Consultation booked
  3. Consultation done
  4. Treatment plan sent
  5. Treatment booked (won)
  6. Lost
- **Money:** AED with 5% VAT; quotes carry the clinic's TRN.

The client clicks through a deployed URL, on desktop and on a phone. The product itself stays generic B2B/B2C: no clinic-specific fields, only clinic-flavoured demo data.

## How the app is wired (do not change)

```
screens ──> callApi(route, input) ──> mock transport (in the browser) ──> handler for that route ──> tables in localStorage
                                           │ validates input + output against @hco/shared contract
                                           └─> live events (BroadcastChannel) ──> every tab refetches, toasts for the assignee
```

- **Contract:** `packages/shared/src/api/<area>.ts` (routes with zod params/query/body/response) and `packages/shared/src/entities.ts` (rows). The Phase B Fastify API implements the same contract, so screens never change.
- **Calling the API from UI:**
  - `useApiQuery(api.<area>.<route>, { params, query })`
  - `useApiMutation(api.<area>.<route>, { onSuccess, onMutate })`
  - Both live in `apps/web/src/lib/api/hooks.ts`.
  - Mutations invalidate all queries on settle.
  - For optimistic UI, use `onMutate` with `queryClient.setQueryData(apiKey(route, input), …)`.
- **Mock backend:** implement routes in `apps/web/src/mock/handlers/<area>.ts` with `handle(route, (ctx, { params, query, body }) => response)`.
  - `ctx.db` is a draft of every table. Mutate it; it is saved only if the handler succeeds.
  - Scope reads with `rows(ctx, "deals")` (workspace + not deleted) and `findOr404(ctx, "deals", id, "deal")`.
  - Filter what reps see with `visibleToActor(ctx, items)`.
  - Throw domain errors with `throw ctx.error("LOST_REASON_REQUIRED", "Choose why this deal was lost.")`, or `ctx.unwrap(result)` for `@hco/core` results.
  - Emit live events with `ctx.emit({ type: "deal.moved", id })`.
  - Use the shared domain services in `mock/services.ts`: `addActivity`, `notify`, `createTask`, `completeTask`, `matchPerson`, `autoAssign`, `onLeadAssigned`, `markLeadTouched`, `findOrCreateWhatsappConversation`, `appendMessage` (plays back delivery ticks), `ingestLead`, `ingestWhatsappMessage`.
  - Use the read models in `mock/views.ts`: `toDealCard`, `toConversationListItem`, `toTaskListItem`, `toLeadListItem`, `toTimelineItem`, `openDealsOfContact`, `userName`, `contactName`.
- **Business rules** live in `@hco/core`: `planStageMove`, `validateStageOrder`, `transitionLead`, `serviceWindowState`, `isDealStale`, `nextAssignee`, `computeQuoteTotals`, `formatQuoteNumber`, `normalizePhone`, `formatPhone`, `formatAed`, `canSeeAssigned`, and more. Call them; don't re-implement rules in components or handlers.
- **Sessions are per browser tab.** `/login?demoUser=priya@noormarsa.ae` signs in straight away. Demo users (all emails `@noormarsa.ae`):
  - hessa (owner)
  - omar (manager)
  - priya, yousef, maria (reps)

## Rules for every workstream

1. **Own only your files** (listed per workstream).
   - **Never edit:**
     - `packages/shared/src/{entities,enums,events,adapters,dataset,ids}.ts`
     - `packages/shared/src/api/{define,index}.ts`
     - `apps/web/src/mock/{db,transport,define,scope,views,services,bus,session}.ts`
     - `apps/web/src/mock/handlers/{index,auth,core}.ts`
     - `apps/web/src/lib/**`
     - `apps/web/src/components/ui/**`
     - `apps/web/src/components/app/**`
     - `apps/web/src/i18n/index.ts`
     - `apps/web/src/routes/{__root,_app}.tsx` and `apps/web/src/routes/_app/index.tsx`
     - `apps/web/src/main.tsx`, `apps/web/src/index.css`
     - root configs and `package.json` files
     - another workstream's files
   - If you need something changed there, don't edit it. Work around it inside your own files (a local helper or component) and list the request under "contract change requests" in your final report.
2. **Contract changes in your own area file** (`packages/shared/src/api/<yours>.ts`) are allowed only if additive and backwards-compatible: new optional fields, new routes. Keep existing route names and shapes; other workstreams already call them.
3. **No new dependencies.** No new shadcn components: the registry is unreachable. Compose from `components/ui/*` (button, input, label, textarea, select, dialog, sheet, dropdown-menu, popover, command, tabs, badge, avatar, separator, scroll-area, tooltip, sonner, skeleton, checkbox, radio-group, switch, table, card, calendar, alert-dialog, progress, toggle, toggle-group) and `components/app/*` (AppShell, PageHeader, EmptyState, ErrorState, LoadingRows, SourceBadge, UserAvatar, Money, AssigneeSelect, BrandMark). Write anything else as a local component under your `features/<area>/` folder. Available libraries: @dnd-kit/core + sortable + utilities, recharts, @react-pdf/renderer, papaparse, date-fns + @date-fns/tz, lucide-react, sonner, cmdk, zod.
4. **Strings:** every user-facing string goes in your i18n namespace JSON (`apps/web/src/i18n/en/<ns>.json`) via `useTranslation("<ns>")`. Shared labels already exist in `common.json`: roles, sources, lead statuses, disqualify and lost reasons, emirates, jurisdiction, message status, actions, states. Arabic comes later, so use logical Tailwind classes (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`, `text-start`), not `ml-`/`mr-`/`left-`/`right-`, for directional layout.
5. **Design (client-facing; this is what sells the product):**
   - **Tokens:** use them from `index.css`. Primary lagoon teal, saffron `attention` for things needing action, channel colours for sources (`SourceBadge`), deep ink rail. IBM Plex Sans.
   - **Copy:** sentence case everywhere. No ALL-CAPS labels, no gradients, no decorative emoji, no identical card grids. Write in the user's language:
     - Buttons say what happens ("Mark as won", "Send template").
     - Toasts confirm with the same verb ("Marked as won").
     - Errors say what to do.
     - Empty screens invite the next action.
   - **Formatting:** money via `<Money value="18500.00" />` (AED with tabular figures); dates and times via `lib/format.ts` (Asia/Dubai); phones via `formatPhone`.
   - **Every data view** has loading (`LoadingRows` or skeletons), error (`ErrorState` with retry) and empty (`EmptyState`) states.
   - **Must work at 390 px wide** with no page-level horizontal scroll (the kanban board may scroll inside its own container) and at 1440 px. The mobile tab bar covers the bottom 64 px; the shell's `main` already pads for it.
   - **Accessibility:** labelled inputs, visible focus, keyboard reachable actions, `aria-label` on icon-only buttons.
6. **Roles:**
   - Reps see their own and unassigned leads, deals and conversations (`visibleToActor`).
   - Owners and managers see everything.
   - Owner-only actions (settings edits) and owner/manager-only actions (reopen a won/lost deal, dashboard, demo panel) are enforced in handlers and hidden or disabled in the UI.
7. **Quality bar:**
   - Strict TypeScript, no `any`.
   - Components small and readable; comments only where the why isn't obvious; match the surrounding code style.
   - Keep route files thin: page components and logic go in `features/<area>/`.
8. **Verify before you finish:**
   - `pnpm --filter @hco/web typecheck` and `pnpm lint` (repo root) pass.
   - `pnpm --filter @hco/web exec vite --port <your port> --strictPort`.
   - Screenshot each of your screens at 1440×900 and 390×844 with `node /tmp/claude-1000/-home-abdullah-office-Documents-crm-scaffold/8669c983-0d2e-42d8-bc51-4303f797c713/scratchpad/shot.mjs "<url>" <out.png> <width> <height> ["text to click"]`. Sign in via `?demoUser=` on `/login?demoUser=…&redirect=/your-route`. Look at every screenshot and fix what looks broken or unpolished. Save screenshots under `/tmp/claude-1000/-home-abdullah-office-Documents-crm-scaffold/8669c983-0d2e-42d8-bc51-4303f797c713/scratchpad/<workstream>/`.
   - Exercise every mutation once in the browser (a Playwright script is fine) and confirm there are no console errors and no `CONTRACT_MISMATCH`.
   - Stop the dev server when done.
9. **Git:** commit your work on your branch with conventional-commit messages (e.g. `feat(pipeline): kanban board with drag and drop`). End commit messages with `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`. Do not push, merge or rebase.

---

## 1. `pipeline` — port 5201

**Milestones:** M1 (and the pipeline parts of M2, M5, M6).

**Owns:**

- `packages/shared/src/api/pipeline.ts`, `packages/shared/src/api/timeline.ts`
- `packages/core/src/pipeline/**` (new pure helpers, if any)
- `apps/web/src/mock/handlers/pipeline.ts`, `apps/web/src/mock/handlers/timeline.ts`
- `apps/web/src/routes/_app/pipeline.tsx`, `apps/web/src/routes/_app/deals/**`, `apps/web/src/routes/_app/settings/pipeline.tsx`
- `apps/web/src/features/pipeline/**`, `apps/web/src/features/timeline/**`
- `apps/web/src/i18n/en/pipeline.json`

**Build:**

**Handlers:** every route in `api.pipeline` and `api.timeline`.

- **`move`:**
  - Uses `planStageMove` (lost reason required; reps can't reopen).
  - Writes a `StageTransition` and a `stage_change` activity.
  - Reopening also writes a `system` activity.
  - Sets `closedAt`/`lostReason` and reorders `position` in the source and target columns.
- **`board`:** columns in stage order with `DealCard`s (visibility-filtered), counts and AED totals; filters for assignee (`me` is the caller's id from the UI), source and search.
- **`saveStages`:** uses `validateStageOrder`; 409 `STAGE_NOT_EMPTY` if a removed stage still has deals.
- **`create`:** puts the deal in the first open stage, with an initial transition and a `system` "Deal created" activity.
- **Timeline routes:** already started. Keep the combined deal/contact/lead scope.

**`/pipeline`, the kanban:** the hero screen of the demo.

- **Columns:**
  - Header shows stage name, deal count, AED total and probability.
  - Won and Lost columns are visually distinct and collapsible.
- **Cards:** title, contact (and company), AED value, `SourceBadge` (compact), assignee avatar, open tasks count, unread-message dot, expected close date.
- **Stale deals** get a clear saffron flag, e.g. "No activity for 5 days".
- **Drag and drop** (dnd-kit):
  - Between and within columns, with optimistic update and rollback plus a toast on error.
  - Keyboard sensor for accessibility.
  - Dropping on Lost opens a dialog requiring a reason (common `lostReasons`) and an optional note.
  - Dropping on Won opens a short confirm ("Mark as won").
- **Toolbar:** search, "Mine / Everyone" (reps default to Mine), source filter, "New deal" (NewDealDialog).
- **Mobile:** no drag.
  - A stage switcher (scrollable chips with counts) plus a vertical card list.
  - Each card has a "Move to…" menu that opens the same Won/Lost dialogs.

**`/deals/$dealId`:**

- **Header:** title, AED value (inline edit), stage progress stepper (click a stage to move, same dialogs), Won/Lost buttons, reopen for owner/manager, assignee (`AssigneeSelect`), expected close date, source badge, and a link to the originating lead.
- **Side panel:** contact (phone via `formatPhone`, email, "Open WhatsApp" = `features/inbox/OpenChatButton`) and company (emirate, free zone or mainland).
- **Main:**
  - Timeline with a composer (note / call / meeting).
  - Tasks (`TaskList`: add with due date presets "Today 5 pm / Tomorrow 10 am / Pick", complete, overdue styling).
  - Quotes section rendering `features/quotes/DealQuotesPanel` (owned by quotes; just place it).
- **Mobile:** stacked, with tabs Timeline / Tasks / Quotes / Details.

**`/settings/pipeline`, the stage editor:** rename, reorder (dnd), add a stage, set probability, delete an empty stage (disabled with explanation otherwise). Won and Lost stay last; they can be renamed but not moved or deleted. Owner/manager only.

**Shared components** (keep the props contracts in the placeholder files):

- `features/timeline/Timeline.tsx`:
  - Grouped by day in Dubai time.
  - An icon per activity type.
  - WhatsApp/email messages as compact bubbles with a direction marker.
  - Stage changes as inline markers ("Moved to Consultation booked").
  - System entries muted.
  - Composer when `allowCompose`.
- `features/timeline/TaskList.tsx`
- `features/pipeline/ContactDealsPanel.tsx` (deals of a contact or company with stage and value, plus "New deal")
- `features/pipeline/NewDealDialog.tsx`:
  - Title, contact via `features/contacts/ContactPicker`, optional company, AED value, stage, expected close date, assignee.
  - On success navigate to the deal.

**Done when:** you can create a deal, drag it through three stages, add a note, create a task due tomorrow, and mark it Won. The timeline shows every step with timestamps. The same flow works on mobile via "Move to…".

---

## 2. `leads-inbox` — port 5202

**Milestones:** M2, the UI of M3 (service window, ticks, templates), M4 (source attribution).

**Owns:**

- `packages/shared/src/api/leads.ts`, `packages/shared/src/api/inbox.ts`
- `packages/core/src/leads/**`, `packages/core/src/inbox/**`
- `apps/web/src/mock/handlers/leads.ts`, `apps/web/src/mock/handlers/inbox.ts`
- `apps/web/src/routes/_app/leads/**`, `apps/web/src/routes/_app/inbox/**`
- `apps/web/src/features/leads/**`, `apps/web/src/features/inbox/**`
- `apps/web/src/i18n/en/leads.json`, `apps/web/src/i18n/en/inbox.json`

**Build:**

**Handlers:** every route in `api.leads` and `api.inbox`. The shell's badges already call `inbox.list` (`unreadTotal`) and `leads.list?status=new` (`total`).

- **`leads.create`** (manual): uses `ingestLead` with adapter `manual`, a new id as externalId and `isSimulated` false.
- **`assign`:** notifies the new assignee and writes a `system` activity.
- **`setStatus`:** uses `transitionLead`; disqualify needs a reason.
- **`convert`** runs in one handler:
  - New or existing contact. For a new contact, normalise the phone; 409 `DUPLICATE_PHONE` if it belongs to someone else.
  - Company: existing, new or none.
  - Deal in the given (or first open) stage, source = lead source, `leadId` set, with an initial transition.
  - Lead `converted` with its links.
  - Lead's conversation re-pointed: `contactId` set, `leadId` null.
  - Open auto tasks move to the deal.
  - A `system` activity.
- **`inbox.send`:**
  - Free text outside the service window → 422 `SERVICE_WINDOW_CLOSED`.
  - Template → render `{{n}}` with the variables.
  - `appendMessage` handles preview, activity, lead touch and ticks.
- **`markRead`** resets `unreadCount`.
- **`start`** uses `findOrCreateWhatsappConversation`.
- **Visibility:** reps see their own and unassigned.

**`/leads`:**

- **Views:** New (default), Open (new/contacted/qualified), Converted, Disqualified, All.
- **Filters:** source and assignee ("Mine" for reps), plus search.
- **Rows** (cards on mobile):
  - name, `SourceBadge`, campaign name, enquiry snippet, received "12 min ago"
  - a speed-to-lead chip from `nextTaskDueAt`: "Reply within 8 min" in saffron, "Overdue by 2 h" in red
  - assignee avatar, status pill
  - "Existing patient" marker when `matchedContactName`
  - new leads visibly emphasised
- **Header action:** "Add lead".

**`/leads/$leadId`:**

- **Enquiry:** the message plus form answers as a clean definition list.
- **Details:** received time in Dubai, campaign, source.
- **Contact block:** phone and email with "Open WhatsApp" (`OpenChatButton`).
- **Matched contact banner:** "Returning patient: Layla Haddad", linked.
- **Status actions:** Mark contacted, Qualify, Disqualify (dialog with reason + note).
- **Assignee select.**
- **Convert:** a primary action that opens the convert dialog.
  - Contact: new (prefilled from the lead) or existing (defaults to the matched contact).
  - Company: optional; new, existing or none.
  - Deal: title prefilled from "Treatment of interest" + name, AED value, stage (defaults to first open), expected close date.
  - On success toast "Converted to deal" with a link, and navigate to the deal.
- **Below:** timeline (`features/timeline/Timeline`) and tasks (`TaskList`).
- Converted leads show links to the contact and deal.

**`/inbox`:** the heart of "WhatsApp-first".

- **Layout:** two panes on desktop (list about 360 px, thread fills the rest; `/inbox` with no selection shows a friendly empty state). Mobile: list and thread as separate routes, thread with a back button.
- **List:**
  - Filter chips: All, Mine, Unassigned, Unread (with counts); search.
  - Rows: avatar/initials, name, channel icon (WhatsApp/email), preview, time via `formatListTime`, unread count badge, a small marker when the service window is open.
- **Thread header:**
  - Name, formatted phone or email, `SourceBadge`, assignee select.
  - Link to the contact or lead.
  - Open deal chips linking to deals.
- **Messages:**
  - Bubbles: inbound on the start side, outbound on the end side in a soft primary tint.
  - Day separators.
  - Time plus ticks for outbound: sent ✓, delivered ✓✓, read ✓✓ in teal, failed in red, with `aria-label`.
  - Template messages labelled "Template: lead_first_touch".
  - Document messages as a file card ("Q-2026-0002.pdf · Quotation"), linking to `/quotes/$quoteId` when `quoteId` is set.
  - Email messages show the subject.
  - Scroll to the newest on open and on new message; mark read on open.
- **Service window bar above the composer:**
  - Open: "You can reply freely for 14 h 22 min" with a subtle countdown.
  - Closed: "The 24-hour reply window closed 2 days ago. WhatsApp only allows approved templates until {name} replies." The text area is disabled and a primary "Send template" button shows.
- **Composer:**
  - Auto-growing textarea; Enter sends, Shift+Enter adds a new line.
  - Send button; template button always available.
- **Template dialog:**
  - List of approved templates with a live preview.
  - One labelled input per variable (`variableHints`), prefilled: {{1}} contact or lead first name, {{2}} the treatment of interest when known, {{3}} the signed-in user's first name.
- **Email threads:** subject plus body, no window.
- **Live behaviour:** thanks to live events, a message sent from the demo panel appears while you look at the thread; ticks progress sent → delivered → read after a few seconds.

**`features/inbox/OpenChatButton.tsx`** (keep props): starts or opens the conversation (`inbox.start`) and navigates to `/inbox/$conversationId`.

**Done when:**

- A simulated Instagram lead (see demo panel) shows at the top of Leads with a countdown chip.
- You can open it, message it, and see it become "contacted" with its 15-minute task done.
- You can convert it to a deal and open that deal.
- In the inbox, a closed-window conversation forces a template, and ticks update live.

---

## 3. `contacts-companies` — port 5203

**Milestones:** M0 (contacts list with UAE fields), M1 (contacts/companies CRUD), M7 (CSV import).

**Owns:**

- `packages/shared/src/api/contacts.ts`, `packages/shared/src/api/companies.ts`
- `packages/core/src/contacts/**`
- `apps/web/src/mock/handlers/contacts.ts`, `apps/web/src/mock/handlers/companies.ts`
- `apps/web/src/routes/_app/contacts/**`, `apps/web/src/routes/_app/companies/**`
- `apps/web/src/features/contacts/**`, `apps/web/src/features/companies/**`
- `apps/web/src/i18n/en/contacts.json`
- `apps/web/public/samples/**`

**Build:**

**Handlers:** every route in `api.contacts` and `api.companies`.

- **Phones:** normalised with `normalizePhone` (422 `INVALID_PHONE` with a helpful message); `primaryPhoneE164` = first phone.
- **Duplicates:** 409 `DUPLICATE_PHONE` naming the existing contact.
- **Deletes** are soft.
- **`importPreview`:**
  - Applies the column mapping; splits `fullName`.
  - Normalises phones.
  - Flags duplicates against existing contacts (any phone) and within the file.
  - Returns per-row errors.
- **`importCommit`:** creates contacts with source `csv`; finds or creates companies by name (case-insensitive); skips or updates duplicates; writes a `system` activity per created contact; returns counts.

**`/contacts`:**

- **Desktop table:** name with avatar, job title, company, phone (formatted), email, assignee, open deals, last activity.
- **Mobile:** cards.
- Search as you type (debounced), pagination or "Load more".
- **Actions:** "New contact" dialog (first/last name, phones with WhatsApp toggle, email, job title, company via `CompanyPicker`, assignee) and "Import".

**`/contacts/$contactId`:**

- **Header:** avatar, name, job title, company link.
- **Quick actions:** call (`tel:`), "Open WhatsApp" (`features/inbox/OpenChatButton`), email (`mailto:`).
- **Details card:** phones with labels and a WhatsApp marker, emails, source badge, assignee, notes.
- **Company card:** emirate, mainland or free zone + name, TRN, trade licence.
- **Sections:** Deals (`features/pipeline/ContactDealsPanel`), Timeline (`features/timeline/Timeline` with compose), Tasks (`TaskList`).
- **Edit dialog.** Delete with confirm.

**`/companies`:** list with name, industry, emirate, jurisdiction (+ free zone name), TRN, contacts count, open pipeline AED; search and emirate filter; "New company".

**`/companies/$companyId`:** UAE registration panel (trade licence no., TRN, emirate, mainland or free zone + name), website, address, industry, assignee; contacts list; deals (`ContactDealsPanel companyId`); edit and delete.

**`/contacts/import`:** a stepped wizard (a real sequence, so numbered steps are fine).

1. **Upload:** CSV via papaparse, drag-and-drop area plus file input, or "Use sample file" (`public/samples/clinic-patients.csv`, about 25 realistic rows including 3 duplicates of existing demo contacts and 2 invalid phones).
2. **Map columns:** auto-guessed from headers ("Mobile", "WhatsApp", "Name", "Company", …).
3. **Review:** counts of new / duplicates / errors, a filterable table, duplicates showing "Matches Layla Haddad", and a choice to skip or update duplicates.
4. **Import:** progress, then a result summary with a link to Contacts.

**Pickers** (keep props):

- `features/contacts/ContactPicker.tsx`: combobox (popover + command) with search, avatar and company per option, and "Create new contact" inline (first name, last name, phone), returning the new id.
- `features/companies/CompanyPicker.tsx`: the same pattern, with create inline (name, emirate).

**Done when:**

- The contacts list shows UAE data.
- You can create, edit and delete contacts and companies.
- A contact page shows company and emirate.
- Importing the sample CSV reports duplicates by phone and creates the rest.

---

## 4. `owner-views` — port 5204

**Milestones:** M5.

**Owns:**

- `packages/shared/src/api/dashboard.ts`
- `packages/core/src/reports/**`
- `apps/web/src/mock/handlers/dashboard.ts`
- `apps/web/src/routes/_app/dashboard.tsx`, `apps/web/src/routes/_app/today.tsx`
- `apps/web/src/features/dashboard/**`, `apps/web/src/features/today/**`, `apps/web/src/features/notifications/**`
- `apps/web/src/i18n/en/dashboard.json`

**Build:**

**Handlers:**

- **`summary`** (owner/manager only; 403 for reps), for `periodDays`:
  - **Funnel:**
    - `count` = deals currently in the stage.
    - `reachedCount` = deals created in the period that ever reached that stage or a later one (via stage transitions and stage positions).
    - `conversionPct` = reachedCount / previous open stage's reachedCount.
    - Won and lost are reported too.
  - **Leads by source:** leads received in the period; deals = leads converted; won = those deals in a won stage.
  - **Rep activity (last 7 days):** messages = `message_out` + `email_out`; notes = `note` + `call` + `meeting`; tasksDone = `task_done`. Per active user.
  - **Pipeline value:** open pipeline AED and weighted by probability.
  - **Won this month:** calendar month in Asia/Dubai.
  - Put the pure calculations in `packages/core/src/reports/`.
- **`today`** (current user):
  - Open tasks due before the end of today in Dubai, overdue included, soonest first.
  - Unanswered conversations: last message inbound, visible to the user (reps: assigned or unassigned).
  - Stale open deals: assigned to the user (owner/manager: all).
- **`notifications`, `markNotificationsRead`.**

**`/dashboard`** (owner/manager; reps redirected to `/today`). Five widgets, not a report builder. Load the `dataviz` skill before drawing charts.

1. **Headline figures:** open pipeline (AED, compact), weighted pipeline, won this month (count + AED), open deals.
2. **Funnel by stage:** horizontal bars with counts and conversion % between stages.
3. **Leads by source:** leads → deals → won per source, in channel colours, sorted by leads. It should make the story obvious: TikTok brings volume but no deals; Instagram converts.
4. **Rep activity, last 7 days:** per rep, messages / notes & calls / tasks done.
5. **Period selector** (7 / 30 / 90 days) and a short "What stands out" line generated from the numbers, e.g. "TikTok sent 46 leads and none became deals". Computed with rules, no AI.

**`/today`** (everyone; the rep home):

- Greeting with the date in Dubai ("Good morning, Priya · Thursday 17 September").
- **Tasks due:** overdue first, check to complete via `api.timeline.updateTask` with a done state, subject link.
- **Waiting for your reply:** unanswered conversations with how long they've waited, linking to `/inbox/$id`.
- **Going cold:** stale deals with days idle, linking to the deal.
- Empty sections collapse into a single "You're all caught up" state.
- Mobile first: this is the rep's phone home screen.

**`features/notifications/NotificationBell.tsx`** (rendered in the top bar):

- Bell with an unread count badge; popover list (sheet on mobile) of recent notifications with icon per type, relative time, unread emphasis.
- Clicking marks it read and navigates to `href`; "Mark all as read".
- Refreshes live via the global invalidation.

**Done when:**

- As the owner, the dashboard tells the clinic's story from seed data.
- As Priya, Today shows at least three things to do including one stale deal.
- The bell shows new lead notifications live when the demo panel creates leads.

---

## 5. `quotes` — port 5205

**Milestones:** M6.

**Owns:**

- `packages/shared/src/api/quotes.ts`
- `packages/core/src/quotes/**`
- `apps/web/src/mock/handlers/quotes.ts`
- `apps/web/src/routes/_app/quotes/**`
- `apps/web/src/features/quotes/**`
- `apps/web/src/i18n/en/quotes.json`

**Build:**

**Handlers:** every route in `api.quotes`.

- **`create`:**
  - Totals via `computeQuoteTotals` with the workspace VAT rate.
  - Number via `quoteCounters` for the current year in Dubai (increment `lastNumber`), `formatQuoteNumber`.
  - Status `draft`.
- **`update`:**
  - Drafts are editable; otherwise 409 `QUOTE_NOT_EDITABLE`.
  - A sent quote can become accepted or rejected.
  - Accepted notifies the deal assignee (`quote_accepted`) and writes a `system` activity. Don't auto-move the deal.
- **`get`:** `canSendWhatsapp` = the contact's WhatsApp conversation exists and its service window is open; `canSendEmail` = the contact has an email.
- **`send`:**
  - **WhatsApp:**
    - 422 `SERVICE_WINDOW_CLOSED` when closed.
    - Otherwise `appendMessage` kind `document` with media `{ kind: "document", url: "demo://quotes/<id>.pdf", mimeType: "application/pdf", fileName: "<number>.pdf", caption: "Your treatment plan and quotation" }` and `quoteId`.
  - **Email:** find or create an email conversation for the contact on the current user's Gmail connection (or the workspace's first Gmail connection); append an outbound email with subject "Quotation Q-2026-0005 from <workspace>" and a short body.
  - **Both:** set `status: sent`, `sentAt`, `sentVia`; write a `quote_sent` activity.

**`features/quotes/DealQuotesPanel.tsx`** (keep props; the deal page renders it): quotes on the deal with number, total AED, status pill, sent via/when, and "New quote" linking to `/quotes/new?dealId=`.

**`/quotes/new?dealId=`** and **`/quotes/$quoteId`**:

- **Builder** (new, or edit for drafts):
  - Line items: description, qty, unit price AED, line total; add/remove.
  - Suggest items from the demo clinic's price list (the `TREATMENTS` line items in `@hco/demo-data`) as quick picks.
  - Validity (default +14 days), notes.
  - Live subtotal, VAT 5% and total.
- **Document view** styled like a real UAE quotation:
  - Clinic name, address and TRN.
  - "Quotation" + number, issue date and valid until.
  - Bill to: contact, and the company with its TRN when present.
  - Items table.
  - Subtotal, VAT (5%), total in AED.
  - Notes and a footer.
  - Status pill.
- **Actions:**
  - Edit (draft).
  - Download PDF: generate client-side with `@react-pdf/renderer`, loaded with a dynamic `import()`. Fonts from `@fontsource/ibm-plex-sans` `.woff` files, or Helvetica if loading fails.
  - Send on WhatsApp: disabled when the window is closed, with a tooltip/explanation "Ask the patient to reply on WhatsApp first; quotes can only be sent inside the 24-hour window".
  - Send by email.
  - Mark accepted / rejected (sent).
  - Back to the deal.
- **Mobile:** the document scales down readably; actions go in a sticky bottom bar above the tab bar.

**Done when:**

- From a deal you can build a quote with correct 5% VAT and AED totals and download a PDF.
- Sending on WhatsApp puts the PDF card into the conversation, the timeline shows "Quote sent", and the deal page lists it.

---

## 6. `settings-onboarding` — port 5206

**Milestones:** settings parts of M4/M6/M7, M7 onboarding.

**Owns:**

- `packages/shared/src/api/workspace.ts`
- `apps/web/src/mock/handlers/workspace.ts`
- `apps/web/src/routes/_app/settings/{route,index,users,channels,assignment}.tsx`, `apps/web/src/routes/onboarding.tsx`, `apps/web/src/routes/login.tsx` (polish only; keep `demoUser` auto sign-in)
- `apps/web/src/features/settings/**`, `apps/web/src/features/onboarding/**`
- `apps/web/src/i18n/en/settings.json`

**Build:**

**Handlers:** every route in `api.workspace` except `get` and `listUsers` (in `core.ts`).

- **Owner-only edits** (403 otherwise):
  - Updating a user: can't deactivate yourself; there must always be one active owner.
  - Invite: creates an active user and returns a copyable `inviteUrl` (`<origin>/login?demoUser=<email>` in the showcase).
- **Connections:**
  - Connecting simulates success after a realistic flow: WhatsApp shows a display number, Facebook & Instagram a page name, TikTok goes `pending` with "Waiting for TikTok developer approval", Gmail is per current user.
  - Disconnect sets `disconnected`.
- **Assignment rule:** owner/manager.
- **`createWorkspace`:**
  - A new workspace with the owner, invited users, the pipeline (given open stages + "Won" + "Lost"), a round-robin rule over the reps, a simulator connection and the three approved templates (copy the texts, replacing the clinic name).
  - Signs in as the new owner (`ctx.state.sessionUserId`).
  - Every page must then show sensible empty states; others handle theirs.

**`/settings` layout:**

- Side nav on desktop, horizontal tabs on mobile.
- Sections: Workspace, Team, Channels, Lead assignment, Pipeline stages (route owned by pipeline; just link `/settings/pipeline`).
- Managers can view; only owners edit (disabled with a note).

**`/settings`, workspace:**

- Business name.
- TRN (15 digits, validated, shown as `100-4583-9270-0003`).
- Address, emirate.
- VAT rate (5%, read-only with the note "UAE standard rate").
- Currency AED (read-only).
- Timezone Asia/Dubai (read-only).
- "Flag a deal as going cold after N days" (1–30).

**`/settings/users`:** team table with avatar, name, email, role select, active switch; "Invite teammate" dialog; result dialog with the copyable link.

**`/settings/channels`:** a card per channel with brand-appropriate but restrained styling (no logos you don't have; use lucide icons and channel colours).

- **WhatsApp Business:** number, verified name, quality rating, "Connect" or "Disconnect".
- **Facebook & Instagram lead ads:** page, forms.
- **TikTok lead forms:** pending approval.
- **Gmail:** per user, "Connect my Gmail".
- **Demo simulator:** always on in the demo; explains replies never leave the CRM.
- **Connect flows:** believable stepper dialogs (e.g. "Continue with Facebook" → choose page → choose forms → "Subscribed"), clearly marked "Demo connection".

**`/settings/assignment`:** round-robin or manual; checklist of eligible users; "Next lead goes to Priya Nair"; save.

**`/onboarding`:** a stepped wizard.

1. Business: name, TRN, emirate.
2. You: name, email.
3. Team: invite rows.
4. Pipeline: presets "Clinic / healthcare", "Real estate", "General B2B", editable list.
5. Review.

Creating lands in `/dashboard` of the new workspace. The layout is centred and calm, and works on mobile.

**`/login`:** polish only; it already works.

- Keep `demoUser` auto sign-in and the demo user list.
- Handle `?demoUser=` for invites.
- On mobile the demo user list should come first.

**Done when:**

- The owner can edit the workspace TRN, invite a teammate, and see channel states with a believable connect flow.
- A brand-new workspace can be created live from `/onboarding` and lands in its empty dashboard.

---

## 7. `demo-simulator` — port 5207

**Milestones:** M2 demo control panel, seed storytelling.

**Owns:**

- `packages/shared/src/api/demo.ts`
- `packages/demo-data/**`
- `apps/web/src/mock/handlers/demo.ts`
- `apps/web/src/routes/_app/dev/**`
- `apps/web/src/features/demo/**`
- `apps/web/src/i18n/en/demo.json`

**Build:**

**Handlers** (owner/manager only):

- **`simulateLead`:**
  - Generates realistic leads per source: Arabic and English names from varied UAE communities, `+971 5x` mobiles not already used, a treatment of interest, a matching enquiry text, a campaign name, and form answers like the seed.
  - Put generators in `packages/demo-data/src/simulator.ts`, pure, taking an rng/seed so they are testable.
  - Instagram/Facebook/TikTok use `ingestLead` (adapters `meta-leadads` / `tiktok-leads`, `isSimulated: true`).
  - WhatsApp source uses `ingestWhatsappMessage` from an unknown number (creates the lead and conversation).
  - `count` up to 25 (Burst); optional `phone` override.
- **`simulateMessage`:**
  - `existing_contact`: a contact who has a WhatsApp conversation (random if not given), with realistic follow-ups ("Can I move my consultation to Saturday morning?", "Is parking free?", "Sent you the photos of my teeth").
  - `unknown_number`: a new name and number, via `ingestWhatsappMessage`.
- **`reset`:**
  - Replace every table in `ctx.db` with `freshTablesKeepingUser(ctx.state, ctx.state.sessionUserId)` from `mock/db.ts`.
  - Set `ctx.state.sessionUserId` to the returned user id.
  - Emit `workspace.reset`.

**`/dev/demo`, the Demo control panel** (owner/manager):

- **Header:** "Demo control panel"; a one-line explanation that everything here uses the same path real channels will use.
- **Buttons** grouped by what they show:
  - New Instagram lead / New Facebook lead / New TikTok lead
  - Inbound WhatsApp from an existing patient / Inbound WhatsApp from an unknown number
  - Burst: 10 leads
- **Optional "Route to this phone"** field (for the future real-phone demo).
- **"Open as a rep in a new window":** `window.open('/login?demoUser=priya@noormarsa.ae&redirect=/leads', …)`, plus Yousef and Maria. Sessions are per tab, so the rep window and the panel stay separate.
- **Recent simulated events log** (session-local state): time, what was created, link to the lead or conversation.
- **"Reset demo data"** with a confirm dialog.
- **A short script card:** "Try this: 1. Open as Priya in a new window. 2. Click New Instagram lead. 3. Watch it arrive in Priya's Leads with a 15-minute countdown."

**Seed storytelling** (`packages/demo-data`). The data must tell a clear story for the owner dashboard and each rep's Today.

- **Leads by source over 30 days:** Instagram ≈40 → 8 deals → 2 won; TikTok ≈46 → 0 deals; Facebook ≈14 → 4 → 1; WhatsApp ≈22 → 4 → 1. Keep it plausible.
- **Each rep's Today** has at least 3 items, including a stale deal and an unanswered conversation.
- **At least 3 WhatsApp conversations** have an open service window and 2 a closed one needing a template.
- **Quote numbers** follow creation order (already fixed).
- **Tone:** messages read like real UAE clinic chats.
- **Keep** `buildDemoDataset` deterministic for a seed and every timestamp relative to `now`.
- **Check** with `pnpm --filter @hco/demo-data exec tsx scripts/summary.ts`.

**Done when:**

1. In window A (owner) click "New Instagram lead".
2. In window B (Priya) the lead appears in about a second with a toast, is assigned, and has a "contact within 15 minutes" task.
3. "Inbound WhatsApp from an unknown number" creates a WhatsApp lead with a conversation.
4. Reset restores the story.
