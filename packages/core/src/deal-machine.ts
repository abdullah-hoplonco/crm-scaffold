import type { LostReason, Role, StageType } from "@hco/shared";
import { fail, ok, type Result } from "./result";

export interface StageLike {
  id: string;
  type: StageType;
  name: string;
}

export interface StageMovePlan {
  /** Set when entering won/lost, cleared when reopening. */
  closedAt: string | null;
  lostReason: LostReason | null;
  isReopen: boolean;
  isClose: boolean;
}

/**
 * Deal stage rules: open → any other open stage; open → won; open → lost (reason required);
 * won/lost → open only for owner or manager (reopen). won ↔ lost directly is not allowed.
 */
export function planStageMove(input: {
  from: StageLike;
  to: StageLike;
  actorRole: Role;
  lostReason?: LostReason | null;
  now: string;
}): Result<StageMovePlan> {
  const { from, to, actorRole, now } = input;
  if (from.id === to.id) {
    return ok({
      closedAt: from.type === "open" ? null : now,
      lostReason: null,
      isReopen: false,
      isClose: false,
    });
  }
  if (from.type !== "open") {
    if (to.type !== "open") {
      return fail("INVALID_TRANSITION", `Reopen the deal before moving it from ${from.name} to ${to.name}.`);
    }
    if (actorRole === "rep") {
      return fail("REOPEN_NOT_ALLOWED", "Only an owner or manager can reopen a closed deal.");
    }
    return ok({ closedAt: null, lostReason: null, isReopen: true, isClose: false });
  }
  if (to.type === "lost") {
    if (!input.lostReason) return fail("LOST_REASON_REQUIRED", "Choose why this deal was lost.");
    return ok({ closedAt: now, lostReason: input.lostReason, isReopen: false, isClose: true });
  }
  if (to.type === "won") {
    return ok({ closedAt: now, lostReason: null, isReopen: false, isClose: true });
  }
  return ok({ closedAt: null, lostReason: null, isReopen: false, isClose: false });
}

/** Stage editor rules: exactly one won and one lost stage, both after every open stage, at least one open stage. */
export function validateStageOrder(stages: Array<{ type: StageType; name: string }>): Result<true> {
  const won = stages.filter((s) => s.type === "won").length;
  const lost = stages.filter((s) => s.type === "lost").length;
  const open = stages.filter((s) => s.type === "open").length;
  if (won !== 1 || lost !== 1) return fail("STAGE_RULES", "Keep exactly one won stage and one lost stage.");
  if (open < 1) return fail("STAGE_RULES", "Keep at least one open stage.");
  const firstClosed = stages.findIndex((s) => s.type !== "open");
  if (stages.slice(firstClosed).some((s) => s.type === "open")) {
    return fail("STAGE_RULES", "Won and lost stages stay at the end of the pipeline.");
  }
  const names = new Set<string>();
  for (const s of stages) {
    const key = s.name.trim().toLowerCase();
    if (names.has(key)) return fail("STAGE_RULES", `Two stages are called "${s.name}".`);
    names.add(key);
  }
  return ok(true);
}
