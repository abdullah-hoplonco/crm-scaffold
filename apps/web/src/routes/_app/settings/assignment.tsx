import { createFileRoute } from "@tanstack/react-router";
import { AssignmentSettings } from "@/features/settings/AssignmentSettings";

export const Route = createFileRoute("/_app/settings/assignment")({
  component: AssignmentSettings,
});
