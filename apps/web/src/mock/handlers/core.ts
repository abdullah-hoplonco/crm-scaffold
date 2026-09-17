import { api } from "@hco/shared";
import { handle, type MockHandler } from "../define";
import { rows } from "../scope";

/** Routes every screen relies on (workspace, users). */
export const coreHandlers: MockHandler[] = [
  handle(api.workspace.get, (ctx) => ctx.workspace),
  handle(api.workspace.listUsers, (ctx) => ({
    items: rows(ctx, "users").sort((a, b) => a.name.localeCompare(b.name)),
  })),
];
