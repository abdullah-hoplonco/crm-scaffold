import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Placeholder layout. Owned by the settings-onboarding workstream. */
export const Route = createFileRoute("/_app/settings")({
  component: Outlet,
});
