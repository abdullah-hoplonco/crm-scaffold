import { createFileRoute } from "@tanstack/react-router";
import { InboxLayout } from "@/features/inbox/InboxLayout";

export const Route = createFileRoute("/_app/inbox")({
  component: InboxLayout,
});
