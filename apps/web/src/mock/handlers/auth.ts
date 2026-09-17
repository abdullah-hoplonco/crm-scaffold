import { api } from "@hco/shared";
import { handle, type MockHandler } from "../define";

/** Showcase sign-in: pick a demo user; any password is accepted. Phase B uses real sessions. */
export const authHandlers: MockHandler[] = [
  handle(
    api.auth.demoUsers,
    (ctx) => {
      const workspace = ctx.db.workspaces[0];
      if (!workspace) throw ctx.error("NOT_FOUND", "The demo workspace is missing. Reset the demo.");
      const users = ctx.db.users.filter((u) => u.workspaceId === workspace.id && u.isActive);
      return {
        workspaceName: workspace.name,
        users: users.map(({ id, name, role, email, jobTitle }) => ({ id, name, role, email, jobTitle })),
      };
    },
    { isPublic: true },
  ),
  handle(
    api.auth.login,
    (ctx, { body }) => {
      const user = ctx.db.users.find((u) => u.email.toLowerCase() === body.email.toLowerCase() && u.isActive);
      if (!user) throw ctx.error("NOT_FOUND", "No account uses that email. Check it, or pick a demo user.");
      ctx.state.sessionUserId = user.id;
      return { user, workspace: ctx.workspace };
    },
    { isPublic: true },
  ),
  handle(
    api.auth.logout,
    (ctx) => {
      ctx.state.sessionUserId = null;
      return { ok: true as const };
    },
    { isPublic: true },
  ),
  handle(api.auth.me, (ctx) => ({ user: ctx.user, workspace: ctx.workspace })),
];
