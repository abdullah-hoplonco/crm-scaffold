import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceSettings } from "@/features/settings/WorkspaceSettings";

export const Route = createFileRoute("/_app/settings/")({
  component: WorkspaceSettings,
});
