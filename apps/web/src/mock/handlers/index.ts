import type { MockHandler } from "../define";
import { authHandlers } from "./auth";
import { companyHandlers } from "./companies";
import { contactHandlers } from "./contacts";
import { coreHandlers } from "./core";
import { dashboardHandlers } from "./dashboard";
import { demoHandlers } from "./demo";
import { inboxHandlers } from "./inbox";
import { leadHandlers } from "./leads";
import { pipelineHandlers } from "./pipeline";
import { quoteHandlers } from "./quotes";
import { timelineHandlers } from "./timeline";
import { workspaceHandlers } from "./workspace";

/** Registry of showcase backend handlers. Orchestrator-owned: areas edit only their own file. */
export const handlers: MockHandler[] = [
  ...authHandlers,
  ...coreHandlers,
  ...workspaceHandlers,
  ...contactHandlers,
  ...companyHandlers,
  ...pipelineHandlers,
  ...timelineHandlers,
  ...leadHandlers,
  ...inboxHandlers,
  ...quoteHandlers,
  ...dashboardHandlers,
  ...demoHandlers,
];
