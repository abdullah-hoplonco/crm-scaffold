import { z } from "zod";
import { AssignmentRule, ChannelConnection, Decimal, User, Workspace } from "../entities";
import { AssignmentStrategy, ChannelConnectionType, Emirate, Role } from "../enums";
import { AuthSession } from "./auth";
import { defineRoute, Ok } from "./define";

export const WorkspaceUpdate = z.object({
  name: z.string().trim().min(1, "Enter the business name").optional(),
  trn: z
    .string()
    .trim()
    .regex(/^\d{15}$/, "A TRN has 15 digits")
    .nullable()
    .optional(),
  vatRate: Decimal.optional(),
  timezone: z.string().optional(),
  staleAfterDays: z.number().int().min(1).max(60).optional(),
  addressLine: z.string().trim().nullable().optional(),
  emirate: Emirate.nullable().optional(),
});
export type WorkspaceUpdate = z.infer<typeof WorkspaceUpdate>;

export const InviteInput = z.object({
  name: z.string().trim().min(1, "Enter a name"),
  email: z.email("Enter a valid email"),
  role: Role,
});
export type InviteInput = z.infer<typeof InviteInput>;

export const OnboardingInput = z.object({
  workspaceName: z.string().trim().min(1, "Enter the business name"),
  trn: z
    .string()
    .trim()
    .regex(/^\d{15}$/, "A TRN has 15 digits")
    .nullable(),
  emirate: Emirate.nullable(),
  ownerName: z.string().trim().min(1, "Enter your name"),
  ownerEmail: z.email("Enter a valid email"),
  invites: z.array(InviteInput).max(20),
  stages: z.array(z.string().trim().min(1)).min(1).max(12),
});
export type OnboardingInput = z.infer<typeof OnboardingInput>;

export const workspaceRoutes = {
  get: defineRoute({ method: "GET", path: "/workspace", summary: "Workspace settings", response: Workspace }),
  update: defineRoute({
    method: "PATCH",
    path: "/workspace",
    summary: "Update workspace name, TRN, VAT and follow-up settings (owner)",
    body: WorkspaceUpdate,
    response: Workspace,
  }),
  listUsers: defineRoute({
    method: "GET",
    path: "/users",
    summary: "Users in the workspace",
    response: z.object({ items: z.array(User) }),
  }),
  inviteUser: defineRoute({
    method: "POST",
    path: "/users/invite",
    summary: "Invite a user; returns a copyable invite link (owner)",
    body: InviteInput,
    response: z.object({ user: User, inviteUrl: z.string() }),
  }),
  updateUser: defineRoute({
    method: "PATCH",
    path: "/users/:userId",
    summary: "Change a user's role or deactivate them (owner)",
    params: z.object({ userId: z.string() }),
    body: z.object({ role: Role.optional(), isActive: z.boolean().optional() }),
    response: User,
  }),
  listConnections: defineRoute({
    method: "GET",
    path: "/channel-connections",
    summary: "Connected channels: WhatsApp, Facebook/Instagram lead ads, TikTok, Gmail, Simulator",
    response: z.object({ items: z.array(ChannelConnection) }),
  }),
  connectChannel: defineRoute({
    method: "POST",
    path: "/channel-connections",
    summary: "Connect a channel (showcase: simulated connect flow)",
    body: z.object({ type: ChannelConnectionType, displayName: z.string().trim().min(1).optional() }),
    response: ChannelConnection,
  }),
  disconnectChannel: defineRoute({
    method: "DELETE",
    path: "/channel-connections/:connectionId",
    summary: "Disconnect a channel",
    params: z.object({ connectionId: z.string() }),
    response: Ok,
  }),
  getAssignmentRule: defineRoute({
    method: "GET",
    path: "/assignment-rule",
    summary: "How new leads are assigned",
    response: AssignmentRule,
  }),
  updateAssignmentRule: defineRoute({
    method: "PUT",
    path: "/assignment-rule",
    summary: "Set round-robin or manual assignment and who is eligible (owner/manager)",
    body: z.object({ strategy: AssignmentStrategy, eligibleUserIds: z.array(z.string()) }),
    response: AssignmentRule,
  }),
  createWorkspace: defineRoute({
    method: "POST",
    path: "/onboarding/workspace",
    summary: "Create a new workspace with its owner, invites and pipeline stages, then sign in as the owner",
    body: OnboardingInput,
    response: AuthSession,
  }),
};
