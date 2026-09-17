import type { Role } from "@hco/shared";

export interface Actor {
  userId: string;
  workspaceId: string;
  role: Role;
}

/**
 * Who sees what. Owners and managers see every record in the workspace. Reps see leads, deals and
 * conversations assigned to them or unassigned. Everyone sees contacts and companies.
 */
export function canSeeAssigned(actor: Actor, record: { assigneeId: string | null }): boolean {
  if (actor.role !== "rep") return true;
  return record.assigneeId === null || record.assigneeId === actor.userId;
}

export function canManageSettings(actor: Actor): boolean {
  return actor.role === "owner";
}

export function canManageTeamRules(actor: Actor): boolean {
  return actor.role === "owner" || actor.role === "manager";
}

export function canReopenDeals(actor: Actor): boolean {
  return actor.role === "owner" || actor.role === "manager";
}

export function canSeeDashboard(actor: Actor): boolean {
  return actor.role === "owner" || actor.role === "manager";
}
