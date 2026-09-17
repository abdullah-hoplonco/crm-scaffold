import { createFileRoute } from "@tanstack/react-router";
import { InboxHome } from "@/features/inbox/InboxHome";

export const Route = createFileRoute("/_app/inbox/")({
  component: InboxHome,
});
