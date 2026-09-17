import { createFileRoute } from "@tanstack/react-router";
import { TeamSettings } from "@/features/settings/TeamSettings";

export const Route = createFileRoute("/_app/settings/users")({
  component: TeamSettings,
});
