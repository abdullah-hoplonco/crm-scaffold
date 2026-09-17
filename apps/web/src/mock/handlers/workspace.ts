import { canManageSettings, canManageTeamRules, validateStageOrder } from "@hco/core";
import { CLINIC, WHATSAPP_TEMPLATES } from "@hco/demo-data";
import {
  api,
  newId,
  type AssignmentRule,
  type ChannelConnection,
  type ChannelConnectionType,
  type Pipeline,
  type Stage,
  type User,
  type WhatsAppTemplate,
  type Workspace,
} from "@hco/shared";
import type { ConnectChannelDetails } from "@hco/shared/api/workspace";
import { handle, type MockContext, type MockHandler } from "../define";
import { findOr404, rows } from "../scope";

/** Workspace settings, team, channel connections, lead assignment and onboarding. */

const CONNECTION_ORDER: ChannelConnectionType[] = [
  "whatsapp_cloud",
  "meta_leadads",
  "tiktok_leads",
  "gmail",
  "simulator",
];

function requireOwner(ctx: MockContext, message: string) {
  if (!canManageSettings(ctx.actor)) throw ctx.error("FORBIDDEN", message);
}

function stamp(workspaceId: string, at: string) {
  return { id: newId(), workspaceId, createdAt: at, updatedAt: at };
}

function inviteUrl(email: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/login?demoUser=${encodeURIComponent(email)}`;
}

/** Emails identify people at sign-in, so they are unique across every workspace of the showcase. */
function assertEmailFree(ctx: MockContext, email: string, workspaceId: string | null) {
  const existing = ctx.db.users.find((u) => u.email.toLowerCase() === email);
  if (!existing) return;
  if (existing.workspaceId === workspaceId) {
    throw ctx.error(
      "VALIDATION",
      existing.isActive
        ? `${existing.name} already uses ${email} on your team.`
        : `${existing.name} uses ${email} but is deactivated. Switch them back on in the team list.`,
    );
  }
  throw ctx.error("VALIDATION", `${email} already has an account. Use a different email.`);
}

// ---------------------------------------------------------------------------
// Channel connections
// ---------------------------------------------------------------------------

function connectionShape(
  ctx: MockContext,
  type: Exclude<ChannelConnectionType, "simulator">,
  details: ConnectChannelDetails,
  displayName: string | undefined,
): Pick<ChannelConnection, "status" | "displayName" | "externalAccountId" | "config" | "lastSyncedAt"> {
  const workspaceName = ctx.workspace.name;
  switch (type) {
    case "whatsapp_cloud": {
      const displayPhone = details.displayPhone ?? "+971 4 555 0100";
      const verifiedName = details.verifiedName ?? workspaceName;
      return {
        status: "connected",
        displayName: displayName ?? `${displayPhone} · ${verifiedName}`,
        externalAccountId: `demo-phone-${displayPhone.replace(/\D/g, "")}`,
        config: { displayPhone, verifiedName, qualityRating: "GREEN" },
        lastSyncedAt: ctx.nowIso,
      };
    }
    case "meta_leadads": {
      const pageName = details.pageName ?? workspaceName;
      const formNames = details.formNames ?? [];
      return {
        status: "connected",
        displayName: displayName ?? `${pageName} — Facebook & Instagram`,
        externalAccountId: `demo-page-${newId().slice(-8)}`,
        config: {
          pageName,
          forms: formNames.length,
          formNames,
          ...(details.instagramHandle ? { instagramHandle: details.instagramHandle } : {}),
        },
        lastSyncedAt: ctx.nowIso,
      };
    }
    case "tiktok_leads": {
      const advertiserName = details.advertiserName ?? workspaceName;
      return {
        status: "pending",
        displayName: displayName ?? `${advertiserName} — TikTok`,
        externalAccountId: null,
        config: { note: "Waiting for TikTok developer approval", advertiserName },
        lastSyncedAt: null,
      };
    }
    case "gmail":
      return {
        status: "connected",
        displayName: ctx.user.email,
        externalAccountId: ctx.user.email,
        config: { syncEveryMinutes: 1 },
        lastSyncedAt: ctx.nowIso,
      };
  }
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

/** Evenly spread win probabilities over open stages, e.g. 10 / 30 / 50 / 70 for four stages. */
function openStageProbability(index: number, count: number): number {
  return Math.min(90, Math.round((10 + (80 / count) * index) / 5) * 5);
}

/** The demo clinic's approved templates, reworded for another business. */
function templatesFor(workspaceName: string) {
  const replacements: Array<[string, string]> = [
    [CLINIC.shortName, workspaceName],
    [CLINIC.name, workspaceName],
    ["at our Dubai Marina clinic", `with ${workspaceName}`],
    ["or call us on 04 555 0142 to reschedule", "or tell us a better time"],
    ["your patient coordinator", "your point of contact"],
  ];
  const reword = (text: string) => replacements.reduce((acc, [from, to]) => acc.split(from).join(to), text);
  return WHATSAPP_TEMPLATES.map((tpl) => ({
    name: tpl.name,
    category: tpl.category,
    body: reword(tpl.body),
    variableHints: tpl.variableHints.map((hint) =>
      hint === "Patient first name" ? "First name" : hint === "Treatment" ? "Product or service" : hint,
    ),
  }));
}

function dubaiYear(now: Date): number {
  return Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Dubai", year: "numeric" }).format(now));
}

export const workspaceHandlers: MockHandler[] = [
  handle(api.workspace.update, (ctx, { body }) => {
    requireOwner(ctx, "Only the owner can change workspace settings.");
    const ws = ctx.workspace;
    if (body.vatRate !== undefined && Number(body.vatRate) !== Number(ws.vatRate)) {
      throw ctx.error("VALIDATION", "VAT stays at the UAE standard rate of 5%.");
    }
    if (body.timezone !== undefined && body.timezone !== ws.timezone) {
      throw ctx.error("VALIDATION", "Workspaces run on UAE time (Asia/Dubai).");
    }
    if (body.name !== undefined) ws.name = body.name;
    if (body.trn !== undefined) ws.trn = body.trn || null;
    if (body.addressLine !== undefined) ws.addressLine = body.addressLine || null;
    if (body.emirate !== undefined) ws.emirate = body.emirate;
    if (body.staleAfterDays !== undefined) ws.staleAfterDays = body.staleAfterDays;
    ws.updatedAt = ctx.nowIso;
    ctx.emit({ type: "workspace.updated", id: ws.id });
    return ws;
  }),

  handle(api.workspace.inviteUser, (ctx, { body }) => {
    requireOwner(ctx, "Only the owner can invite teammates.");
    const email = body.email.trim().toLowerCase();
    assertEmailFree(ctx, email, ctx.workspace.id);
    const user: User = {
      ...stamp(ctx.workspace.id, ctx.nowIso),
      email,
      name: body.name,
      role: body.role,
      jobTitle: null,
      isActive: true,
    };
    ctx.db.users.push(user);
    ctx.emit({ type: "workspace.updated", id: user.id });
    return { user, inviteUrl: inviteUrl(email) };
  }),

  handle(api.workspace.updateUser, (ctx, { params, body }) => {
    requireOwner(ctx, "Only the owner can change roles or deactivate teammates.");
    const target = findOr404(ctx, "users", params.userId, "teammate");
    const isSelf = target.id === ctx.user.id;
    if (isSelf && body.isActive === false) {
      throw ctx.error("VALIDATION", "You can't deactivate yourself. Ask another owner to do it.");
    }
    if (isSelf && body.role !== undefined && body.role !== target.role) {
      throw ctx.error("VALIDATION", "You can't change your own role. Ask another owner to do it.");
    }
    const nextRole = body.role ?? target.role;
    const nextActive = body.isActive ?? target.isActive;
    const activeOwners = rows(ctx, "users").filter((u) =>
      u.id === target.id ? nextRole === "owner" && nextActive : u.role === "owner" && u.isActive,
    );
    if (activeOwners.length === 0) {
      throw ctx.error(
        "VALIDATION",
        "A workspace always needs an active owner. Make someone else an owner first.",
      );
    }
    target.role = nextRole;
    target.isActive = nextActive;
    target.updatedAt = ctx.nowIso;
    ctx.emit({ type: "workspace.updated", id: target.id });
    return target;
  }),

  handle(api.workspace.listConnections, (ctx) => ({
    items: rows(ctx, "channelConnections").sort(
      (a, b) =>
        CONNECTION_ORDER.indexOf(a.type) - CONNECTION_ORDER.indexOf(b.type) ||
        a.createdAt.localeCompare(b.createdAt),
    ),
  })),

  handle(api.workspace.connectChannel, (ctx, { body }) => {
    const { type } = body;
    if (type === "simulator") {
      throw ctx.error("VALIDATION", "The demo simulator is always on in the demo workspace.");
    }
    if (type !== "gmail") requireOwner(ctx, "Only the owner can connect channels.");
    const existing = rows(ctx, "channelConnections").find(
      (c) => c.type === type && (type !== "gmail" || c.userId === ctx.user.id),
    );
    const shape = connectionShape(ctx, type, body.details ?? {}, body.displayName);
    const connection: ChannelConnection = existing ?? {
      ...stamp(ctx.workspace.id, ctx.nowIso),
      userId: type === "gmail" ? ctx.user.id : null,
      type,
      ...shape,
    };
    if (existing) {
      Object.assign(existing, shape, { updatedAt: ctx.nowIso });
    } else {
      ctx.db.channelConnections.push(connection);
    }
    ctx.emit({ type: "workspace.updated", id: connection.id });
    return connection;
  }),

  handle(api.workspace.disconnectChannel, (ctx, { params }) => {
    const connection = findOr404(ctx, "channelConnections", params.connectionId, "channel");
    if (connection.type === "simulator") {
      throw ctx.error("VALIDATION", "The demo simulator stays on in the demo workspace.");
    }
    const ownMailbox = connection.type === "gmail" && connection.userId === ctx.user.id;
    if (!ownMailbox) requireOwner(ctx, "Only the owner can disconnect channels.");
    connection.status = "disconnected";
    connection.updatedAt = ctx.nowIso;
    ctx.emit({ type: "workspace.updated", id: connection.id });
    return { ok: true as const };
  }),

  handle(api.workspace.getAssignmentRule, (ctx) => {
    const rule = rows(ctx, "assignmentRules")[0];
    if (!rule) throw ctx.error("NOT_FOUND", "This workspace has no assignment rule yet.");
    return rule;
  }),

  handle(api.workspace.updateAssignmentRule, (ctx, { body }) => {
    if (!canManageTeamRules(ctx.actor)) {
      throw ctx.error("FORBIDDEN", "Only the owner or a manager can change lead assignment.");
    }
    const activeIds = new Set(
      rows(ctx, "users")
        .filter((u) => u.isActive)
        .map((u) => u.id),
    );
    const eligibleUserIds = [...new Set(body.eligibleUserIds)];
    if (eligibleUserIds.some((id) => !activeIds.has(id))) {
      throw ctx.error(
        "VALIDATION",
        "One of the chosen teammates is no longer active. Refresh and try again.",
      );
    }
    if (body.strategy === "round_robin" && eligibleUserIds.length === 0) {
      throw ctx.error(
        "NO_ELIGIBLE_ASSIGNEE",
        "Choose at least one teammate for round-robin, or switch to manual.",
      );
    }
    let rule = rows(ctx, "assignmentRules")[0];
    if (!rule) {
      rule = {
        ...stamp(ctx.workspace.id, ctx.nowIso),
        strategy: body.strategy,
        eligibleUserIds,
        lastAssignedUserId: null,
      };
      ctx.db.assignmentRules.push(rule);
    }
    rule.strategy = body.strategy;
    rule.eligibleUserIds = eligibleUserIds;
    rule.updatedAt = ctx.nowIso;
    ctx.emit({ type: "workspace.updated", id: rule.id });
    return rule;
  }),

  handle(
    api.workspace.createWorkspace,
    (ctx, { body }) => {
      const ownerEmail = body.ownerEmail.trim().toLowerCase();
      const invites = body.invites.map((invite) => ({ ...invite, email: invite.email.trim().toLowerCase() }));
      const seen = new Set<string>();
      for (const email of [ownerEmail, ...invites.map((i) => i.email)]) {
        if (seen.has(email)) {
          throw ctx.error("VALIDATION", `${email} is used twice. Each person needs their own email.`);
        }
        seen.add(email);
        assertEmailFree(ctx, email, null);
      }
      const stageDrafts = [
        ...body.stages.map((name) => ({ name, type: "open" as const })),
        { name: "Won", type: "won" as const },
        { name: "Lost", type: "lost" as const },
      ];
      ctx.unwrap(validateStageOrder(stageDrafts));

      const at = ctx.nowIso;
      const workspace: Workspace = {
        id: newId(),
        name: body.workspaceName,
        currency: "AED",
        vatRate: "5.00",
        trn: body.trn || null,
        timezone: "Asia/Dubai",
        staleAfterDays: 3,
        addressLine: null,
        emirate: body.emirate,
        createdAt: at,
        updatedAt: at,
      };
      const row = () => stamp(workspace.id, at);
      ctx.db.workspaces.push(workspace);

      const owner: User = {
        ...row(),
        email: ownerEmail,
        name: body.ownerName,
        role: "owner",
        jobTitle: null,
        isActive: true,
      };
      const team: User[] = invites.map((invite) => ({
        ...row(),
        email: invite.email,
        name: invite.name,
        role: invite.role,
        jobTitle: null,
        isActive: true,
      }));
      ctx.db.users.push(owner, ...team);

      const pipeline: Pipeline = { ...row(), name: "Sales pipeline", isDefault: true };
      ctx.db.pipelines.push(pipeline);
      const openCount = body.stages.length;
      const stages: Stage[] = stageDrafts.map((draft, position) => ({
        ...row(),
        pipelineId: pipeline.id,
        name: draft.name,
        position,
        type: draft.type,
        probability:
          draft.type === "won" ? 100 : draft.type === "lost" ? 0 : openStageProbability(position, openCount),
      }));
      ctx.db.stages.push(...stages);

      const reps = team.filter((u) => u.role === "rep");
      const rule: AssignmentRule = {
        ...row(),
        strategy: "round_robin",
        eligibleUserIds: (reps.length ? reps : [owner]).map((u) => u.id),
        lastAssignedUserId: null,
      };
      ctx.db.assignmentRules.push(rule);

      ctx.db.channelConnections.push({
        ...row(),
        userId: null,
        type: "simulator",
        status: "connected",
        displayName: "Demo simulator",
        externalAccountId: "simulator",
        config: { note: "Generates realistic leads and WhatsApp messages. Replies never leave the CRM." },
        lastSyncedAt: at,
      });

      const templates: WhatsAppTemplate[] = templatesFor(workspace.name).map((tpl) => ({
        ...row(),
        name: tpl.name,
        language: "en",
        category: tpl.category,
        status: "approved",
        body: tpl.body,
        variableHints: tpl.variableHints,
      }));
      ctx.db.whatsappTemplates.push(...templates);
      ctx.db.quoteCounters.push({ workspaceId: workspace.id, year: dubaiYear(ctx.now), lastNumber: 0 });

      ctx.state.sessionUserId = owner.id;
      return { user: owner, workspace };
    },
    { isPublic: true },
  ),
];
