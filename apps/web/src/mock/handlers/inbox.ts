import { api } from "@hco/shared";
import { handle, type MockHandler } from "../define";
import { rows } from "../scope";

/** Inbox. Starter templates list; the leads-inbox workstream owns and completes this file. */
export const inboxHandlers: MockHandler[] = [
  handle(api.inbox.templates, (ctx) => ({
    items: rows(ctx, "whatsappTemplates").filter((t) => t.status === "approved"),
  })),
];
