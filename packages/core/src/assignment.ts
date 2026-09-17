export interface AssignmentRuleLike {
  strategy: "round_robin" | "manual";
  eligibleUserIds: string[];
  lastAssignedUserId: string | null;
}

/**
 * Next assignee for a brand-new person. Round-robin walks eligible active users in order after the
 * last one assigned. Manual returns null (lead stays unassigned).
 */
export function nextAssignee(rule: AssignmentRuleLike, activeUserIds: ReadonlySet<string>): string | null {
  if (rule.strategy === "manual") return null;
  const eligible = rule.eligibleUserIds.filter((id) => activeUserIds.has(id));
  if (eligible.length === 0) return null;
  const lastIndex = rule.lastAssignedUserId ? eligible.indexOf(rule.lastAssignedUserId) : -1;
  return eligible[(lastIndex + 1) % eligible.length] ?? null;
}
