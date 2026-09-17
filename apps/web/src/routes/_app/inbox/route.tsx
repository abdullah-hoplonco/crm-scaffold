import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Placeholder layout. Owned by the leads-inbox workstream. */
export const Route = createFileRoute("/_app/inbox")({
  component: Outlet,
});
