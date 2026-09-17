import { canSeeDashboard, isDealStale, sumMoney } from "@hco/core";
import {
  compareReplyUrgency,
  computeFunnel,
  computeLeadsBySource,
  computePipelineValue,
  computeRepActivity,
  computeWonSince,
  endOfZonedDay,
  isAwaitingReply,
  periodStart,
  startOfZonedMonth,
} from "@hco/core/reports/index";
import { api } from "@hco/shared";
import { handle, type MockContext, type MockHandler } from "../define";
import { rows, visibleToActor } from "../scope";
import { toConversationListItem, toDealCard, toTaskListItem } from "../views";

const NOTIFICATION_LIMIT = 50;

function defaultPipelineStages(ctx: MockContext) {
  const pipeline = rows(ctx, "pipelines").find((p) => p.isDefault) ?? rows(ctx, "pipelines")[0];
  if (!pipeline) return { pipelineId: null, stages: [] };
  const stages = rows(ctx, "stages")
    .filter((s) => s.pipelineId === pipeline.id)
    .sort((a, b) => a.position - b.position);
  return { pipelineId: pipeline.id, stages };
}

/** Owner dashboard, the signed-in user's Today list, and notifications. */
export const dashboardHandlers: MockHandler[] = [
  handle(api.dashboard.summary, (ctx, { query }) => {
    if (!canSeeDashboard(ctx.actor)) {
      throw ctx.error("FORBIDDEN", "The dashboard is for owners and managers. Your day is on Today.");
    }
    const { pipelineId, stages } = defaultPipelineStages(ctx);
    const deals = rows(ctx, "deals").filter((d) => d.pipelineId === pipelineId);
    const since = periodStart(ctx.now, query.periodDays).toISOString();
    const stageType = new Map(stages.map((s) => [s.id, s.type]));
    const stale = deals.filter((d) =>
      isDealStale(d, stageType.get(d.stageId) ?? "won", ctx.now, ctx.workspace.staleAfterDays),
    );

    return {
      periodDays: query.periodDays,
      funnel: computeFunnel({ stages, deals, transitions: rows(ctx, "stageTransitions"), since }),
      leadsBySource: computeLeadsBySource({ leads: rows(ctx, "leads"), deals, stages, since }),
      repActivity: computeRepActivity({
        users: rows(ctx, "users"),
        activities: rows(ctx, "activities"),
        since: periodStart(ctx.now, 7).toISOString(),
      }),
      ...computePipelineValue({ deals, stages }),
      wonThisMonth: computeWonSince({
        deals,
        stages,
        since: startOfZonedMonth(ctx.now, ctx.workspace.timezone).toISOString(),
      }),
      staleDeals: { count: stale.length, valueAed: sumMoney(stale.map((d) => d.valueAed)) },
    };
  }),

  handle(api.dashboard.today, (ctx) => {
    const endOfToday = endOfZonedDay(ctx.now, ctx.workspace.timezone).toISOString();
    const tasksDue = rows(ctx, "tasks")
      .filter((t) => t.assigneeId === ctx.user.id && t.status === "open" && t.dueAt < endOfToday)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
      .map((t) => toTaskListItem(ctx, t));

    const unansweredConversations = visibleToActor(ctx, rows(ctx, "conversations"))
      .filter(isAwaitingReply)
      .sort((a, b) => compareReplyUrgency(a, b, ctx.now))
      .map((c) => toConversationListItem(ctx, c));

    const mineOnly = ctx.actor.role === "rep";
    const staleDeals = rows(ctx, "deals")
      .filter((d) => !mineOnly || d.assigneeId === ctx.user.id)
      .map((d) => toDealCard(ctx, d))
      .filter((card) => card.isStale)
      .sort((a, b) => a.lastActivityAt.localeCompare(b.lastActivityAt));

    return { tasksDue, unansweredConversations, staleDeals };
  }),

  handle(api.dashboard.notifications, (ctx) => {
    const mine = rows(ctx, "notifications")
      .filter((n) => n.userId === ctx.user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      items: mine.slice(0, NOTIFICATION_LIMIT),
      unreadCount: mine.filter((n) => !n.readAt).length,
    };
  }),

  handle(api.dashboard.markNotificationsRead, (ctx, { body }) => {
    const ids = body.ids ? new Set(body.ids) : null;
    const mine = rows(ctx, "notifications").filter((n) => n.userId === ctx.user.id);
    for (const n of mine) {
      if (n.readAt || (ids && !ids.has(n.id))) continue;
      n.readAt = ctx.nowIso;
      n.updatedAt = ctx.nowIso;
    }
    return { unreadCount: mine.filter((n) => !n.readAt).length };
  }),
];
