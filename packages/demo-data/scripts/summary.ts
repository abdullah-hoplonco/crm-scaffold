/**
 * Story check for the demo dataset: prints what the owner dashboard and each rep's Today will show.
 * Run with `pnpm --filter @hco/demo-data exec tsx scripts/summary.ts` (set NOW=2026-10-01T04:00:00Z to try another day).
 */
import { buildDemoDataset } from "../src/index";

const DAY = 86_400_000;
const now = process.env.NOW ? new Date(process.env.NOW) : new Date();
const t = buildDemoDataset({ now });
const nowIso = now.toISOString();
const since = (days: number) => new Date(now.getTime() - days * DAY).toISOString();

const count = (o: Record<string, unknown[]>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.length]));
console.log("rows", count(t as unknown as Record<string, unknown[]>));

const stageById = new Map(t.stages.map((s) => [s.id, s]));
const userById = new Map(t.users.map((u) => [u.id, u]));
const wonStageIds = new Set(t.stages.filter((s) => s.type === "won").map((s) => s.id));

// -- Leads by source, last 30 days (dashboard widget 3) ------------------------------------------
const bySource: Record<string, { leads: number; deals: number; won: number }> = {};
for (const lead of t.leads.filter((l) => l.receivedAt >= since(30))) {
  const row = (bySource[lead.source] ??= { leads: 0, deals: 0, won: 0 });
  row.leads++;
  const deal = lead.convertedDealId ? t.deals.find((d) => d.id === lead.convertedDealId) : undefined;
  if (deal) {
    row.deals++;
    if (wonStageIds.has(deal.stageId)) row.won++;
  }
}
console.log("\nleads by source, 30 days", bySource);
const oldConverted = t.leads.filter((l) => l.convertedDealId && l.receivedAt < since(30));
if (oldConverted.length) console.log("  ! converted leads older than 30 days:", oldConverted.length);

// -- Pipeline --------------------------------------------------------------------------------------
const perStage: Record<string, number> = {};
for (const d of t.deals) {
  const name = stageById.get(d.stageId)?.name ?? "?";
  perStage[name] = (perStage[name] ?? 0) + 1;
}
console.log("\ndeals per stage", perStage);
const dubaiMonth = new Date(now.getTime() + 4 * 3_600_000).toISOString().slice(0, 7);
const wonThisMonth = t.deals.filter(
  (d) =>
    wonStageIds.has(d.stageId) &&
    d.closedAt &&
    new Date(new Date(d.closedAt).getTime() + 4 * 3_600_000).toISOString().slice(0, 7) === dubaiMonth,
);
console.log("won this month", wonThisMonth.length);

// -- WhatsApp service windows --------------------------------------------------------------------
const lastMessage = (conversationId: string) =>
  t.messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
const whatsapp = t.conversations.filter((c) => c.channel === "whatsapp");
const windowOpen = whatsapp.filter((c) => c.serviceWindowExpiresAt && c.serviceWindowExpiresAt > nowIso);
const needsTemplate = whatsapp.filter(
  (c) =>
    !(c.serviceWindowExpiresAt && c.serviceWindowExpiresAt > nowIso) && lastMessage(c.id)?.direction === "in",
);
console.log(
  "\nwhatsapp conversations",
  whatsapp.length,
  "| window open",
  windowOpen.length,
  "| closed and waiting for a reply (template needed)",
  needsTemplate.map((c) => c.participantName),
);
console.log(
  "unread",
  t.conversations.filter((c) => c.unreadCount > 0).length,
  "| lead conversations",
  t.conversations.filter((c) => c.leadId).length,
);

// -- Today per user (owner-views "today" rules) ---------------------------------------------------
const dubaiDate = new Date(now.getTime() + 4 * 3_600_000).toISOString().slice(0, 10);
const endOfToday = new Date(`${dubaiDate}T20:00:00.000Z`).toISOString(); // 24:00 in Dubai
const ws = t.workspaces[0];
for (const user of t.users) {
  const isRep = user.role === "rep";
  const tasks = t.tasks.filter(
    (x) => x.assigneeId === user.id && x.status === "open" && x.dueAt < endOfToday,
  );
  const waiting = t.conversations.filter(
    (c) =>
      (isRep ? c.assigneeId === user.id || c.assigneeId === null : true) &&
      lastMessage(c.id)?.direction === "in",
  );
  const stale = t.deals.filter(
    (d) =>
      (isRep || user.role === "manager" ? d.assigneeId === user.id : true) &&
      stageById.get(d.stageId)?.type === "open" &&
      now.getTime() - new Date(d.lastActivityAt).getTime() >= (ws?.staleAfterDays ?? 3) * DAY,
  );
  console.log(
    `\ntoday: ${user.name} (${user.role}) — ${tasks.length} tasks (${tasks.filter((x) => x.dueAt < nowIso).length} overdue), ${waiting.length} waiting, ${stale.length} going cold`,
  );
  if (isRep) {
    console.log(
      "  tasks  ",
      tasks.map((x) => x.title),
    );
    console.log(
      "  waiting",
      waiting.map((c) => `${c.participantName}${c.leadId ? " (lead)" : ""}`),
    );
    console.log(
      "  cold   ",
      stale.map(
        (d) => `${d.title} (${Math.floor((now.getTime() - new Date(d.lastActivityAt).getTime()) / DAY)} d)`,
      ),
    );
  }
}

// -- Rep activity, last 7 days (dashboard widget 4) ------------------------------------------------
const activity: Record<string, { messages: number; notes: number; tasksDone: number }> = {};
for (const a of t.activities.filter((x) => x.occurredAt >= since(7) && x.userId)) {
  const name = userById.get(a.userId ?? "")?.name ?? "?";
  const row = (activity[name] ??= { messages: 0, notes: 0, tasksDone: 0 });
  if (a.type === "message_out" || a.type === "email_out") row.messages++;
  if (a.type === "note" || a.type === "call" || a.type === "meeting") row.notes++;
  if (a.type === "task_done") row.tasksDone++;
}
console.log("\nrep activity, 7 days", activity);

console.log(
  "\nquotes",
  t.quotes.map((q) => `${q.number} ${q.status} ${q.totalAed}`),
);
const rule = t.assignmentRules[0];
const eligible = rule?.eligibleUserIds ?? [];
const nextIndex = rule?.lastAssignedUserId
  ? (eligible.indexOf(rule.lastAssignedUserId) + 1) % eligible.length
  : 0;
console.log("next lead goes to", userById.get(eligible[nextIndex] ?? "")?.name);
console.log("json size KB", Math.round(JSON.stringify(t).length / 1024));
