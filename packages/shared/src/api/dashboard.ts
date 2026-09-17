import { z } from "zod";
import { MoneyAed, Notification } from "../entities";
import { LeadSource, StageType } from "../enums";
import { defineRoute } from "./define";
import { ConversationListItem } from "./inbox";
import { DealCard } from "./pipeline";
import { TaskListItem } from "./timeline";

export const DashboardSummary = z.object({
  periodDays: z.number().int(),
  funnel: z.array(
    z.object({
      stageId: z.string(),
      name: z.string(),
      type: StageType,
      /** Deals currently in the stage. */
      count: z.number().int(),
      /** Deals that ever reached this stage or a later one in the period. */
      reachedCount: z.number().int(),
      /** reachedCount / previous stage reachedCount, 0–100; null for the first stage. */
      conversionPct: z.number().nullable(),
      valueAed: MoneyAed,
    }),
  ),
  leadsBySource: z.array(
    z.object({ source: LeadSource, leads: z.number().int(), deals: z.number().int(), won: z.number().int() }),
  ),
  repActivity: z.array(
    z.object({
      userId: z.string(),
      name: z.string(),
      messages: z.number().int(),
      notes: z.number().int(),
      tasksDone: z.number().int(),
    }),
  ),
  openPipelineAed: MoneyAed,
  weightedPipelineAed: MoneyAed,
  openDealsCount: z.number().int(),
  wonThisMonth: z.object({ count: z.number().int(), valueAed: MoneyAed }),
});
export type DashboardSummary = z.infer<typeof DashboardSummary>;

export const TodayView = z.object({
  tasksDue: z.array(TaskListItem),
  unansweredConversations: z.array(ConversationListItem),
  staleDeals: z.array(DealCard),
});
export type TodayView = z.infer<typeof TodayView>;

export const dashboardRoutes = {
  summary: defineRoute({
    method: "GET",
    path: "/dashboard",
    summary: "Owner dashboard: funnel, leads by source, rep activity, pipeline value, won this month",
    query: z.object({ periodDays: z.coerce.number().int().min(1).max(365).default(30) }),
    response: DashboardSummary,
  }),
  today: defineRoute({
    method: "GET",
    path: "/today",
    summary: "The current user's due tasks, unanswered conversations and stale deals",
    response: TodayView,
  }),
  notifications: defineRoute({
    method: "GET",
    path: "/notifications",
    summary: "The current user's notifications, newest first",
    response: z.object({ items: z.array(Notification), unreadCount: z.number().int() }),
  }),
  markNotificationsRead: defineRoute({
    method: "POST",
    path: "/notifications/read",
    summary: "Mark some or all notifications read",
    body: z.object({ ids: z.array(z.string()).optional() }),
    response: z.object({ unreadCount: z.number().int() }),
  }),
};
