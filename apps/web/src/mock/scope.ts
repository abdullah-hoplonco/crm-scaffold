import { canSeeAssigned } from "@hco/core";
import type { TableName, Tables } from "@hco/shared";
import type { MockContext } from "./define";

type Row<T extends TableName> = Tables[T][number];

/** Rows of a table in the signed-in workspace, excluding soft-deleted ones. */
export function rows<T extends Exclude<TableName, "workspaces" | "quoteCounters">>(
  ctx: MockContext,
  table: T,
): Row<T>[] {
  const ws = ctx.workspace.id;
  return (ctx.db[table] as Array<Row<T> & { workspaceId: string; deletedAt?: string | null }>).filter(
    (r) => r.workspaceId === ws && !r.deletedAt,
  );
}

/** One row by id in the signed-in workspace, or a 404. */
export function findOr404<T extends Exclude<TableName, "workspaces" | "quoteCounters">>(
  ctx: MockContext,
  table: T,
  id: string,
  label = "record",
): Row<T> {
  const found = rows(ctx, table).find((r) => (r as { id: string }).id === id);
  if (!found) ctx.fail("NOT_FOUND", `That ${label} doesn't exist or was deleted.`);
  return found;
}

/** Reps only see their own and unassigned leads, deals and conversations. */
export function visibleToActor<T extends { assigneeId: string | null }>(ctx: MockContext, items: T[]): T[] {
  return items.filter((item) => canSeeAssigned(ctx.actor, item));
}

export function assertVisible(ctx: MockContext, record: { assigneeId: string | null }, label = "record") {
  if (!canSeeAssigned(ctx.actor, record)) ctx.fail("FORBIDDEN", `This ${label} is assigned to someone else.`);
}

export function matchesQuery(q: string | undefined, ...fields: Array<string | null | undefined>): boolean {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const digits = needle.replace(/\D/g, "");
  return fields.some((f) => {
    if (!f) return false;
    const hay = f.toLowerCase();
    if (hay.includes(needle)) return true;
    return digits.length >= 4 && hay.replace(/\D/g, "").includes(digits);
  });
}
