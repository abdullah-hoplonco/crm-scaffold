import { createFileRoute } from "@tanstack/react-router";
import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/States";

/** Placeholder page. Owned by the leads-inbox workstream. */
export const Route = createFileRoute("/_app/inbox/$conversationId")({
  component: Placeholder,
});

function Placeholder() {
  return (
    <>
      <PageHeader title="Conversation" />
      <EmptyState
        icon={Hammer}
        title="Conversation is being built"
        description="This screen arrives in the next build step."
      />
    </>
  );
}
