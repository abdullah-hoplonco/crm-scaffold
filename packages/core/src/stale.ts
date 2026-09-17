import type { StageType } from "@hco/shared";

const DAY_MS = 86_400_000;

/** An open deal is stale when nothing happened on it (or its contact) for staleAfterDays. */
export function isDealStale(
  deal: { lastActivityAt: string },
  stageType: StageType,
  now: Date,
  staleAfterDays: number,
): boolean {
  if (stageType !== "open") return false;
  return now.getTime() - new Date(deal.lastActivityAt).getTime() >= staleAfterDays * DAY_MS;
}

/** Activity types that count as real activity for staleness (system and auto-stale tasks don't). */
export const ACTIVITY_TYPES_THAT_REFRESH_DEALS = new Set([
  "note",
  "message_in",
  "message_out",
  "email_in",
  "email_out",
  "call",
  "meeting",
  "stage_change",
  "task_done",
  "quote_sent",
]);
