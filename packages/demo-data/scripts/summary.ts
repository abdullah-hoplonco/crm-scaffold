import { buildDemoDataset } from "../src/index";

const t = buildDemoDataset();
const count = (o: Record<string, unknown[]>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.length]));
console.log(count(t as unknown as Record<string, unknown[]>));
const bySource: Record<string, { leads: number; converted: number; statuses: Record<string, number> }> = {};
for (const l of t.leads) {
  const s = (bySource[l.source] ??= { leads: 0, converted: 0, statuses: {} });
  s.leads++;
  if (l.status === "converted") s.converted++;
  s.statuses[l.status] = (s.statuses[l.status] ?? 0) + 1;
}
console.log(bySource);
const stageName = new Map(t.stages.map((s) => [s.id, s.name]));
const perStage: Record<string, number> = {};
for (const d of t.deals)
  perStage[stageName.get(d.stageId) ?? "?"] = (perStage[stageName.get(d.stageId) ?? "?"] ?? 0) + 1;
console.log(perStage);
console.log(
  "open windows",
  t.conversations.filter(
    (c) => c.serviceWindowExpiresAt && c.serviceWindowExpiresAt > new Date().toISOString(),
  ).length,
  "unread",
  t.conversations.filter((c) => c.unreadCount > 0).length,
);
console.log(
  "tasks open",
  t.tasks
    .filter((x) => x.status === "open")
    .map((x) => `${x.origin}:${x.title}`)
    .slice(0, 30),
);
console.log(
  "quotes",
  t.quotes.map((q) => `${q.number} ${q.status} ${q.totalAed}`),
);
console.log(t.deals.slice(0, 6).map((d) => `${d.title} | ${d.valueAed}`));
console.log("json size KB", Math.round(JSON.stringify(t).length / 1024));
