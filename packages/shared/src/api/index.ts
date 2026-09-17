import { authRoutes } from "./auth";
import { companyRoutes } from "./companies";
import { contactRoutes } from "./contacts";
import { dashboardRoutes } from "./dashboard";
import { demoRoutes } from "./demo";
import { inboxRoutes } from "./inbox";
import { leadRoutes } from "./leads";
import { pipelineRoutes } from "./pipeline";
import { quoteRoutes } from "./quotes";
import { timelineRoutes } from "./timeline";
import { workspaceRoutes } from "./workspace";

/** The complete REST contract. OpenAPI is generated from this in Phase B. */
export const api = {
  auth: authRoutes,
  workspace: workspaceRoutes,
  contacts: contactRoutes,
  companies: companyRoutes,
  pipeline: pipelineRoutes,
  timeline: timelineRoutes,
  leads: leadRoutes,
  inbox: inboxRoutes,
  quotes: quoteRoutes,
  dashboard: dashboardRoutes,
  demo: demoRoutes,
};

export * from "./define";
