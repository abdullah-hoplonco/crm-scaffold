import { createFileRoute } from "@tanstack/react-router";
import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/States";

/** Placeholder page. Owned by the quotes workstream. */
export const Route = createFileRoute("/_app/quotes/$quoteId")({
  component: Placeholder,
});

function Placeholder() {
  return (
    <>
      <PageHeader title="Quote" />
      <EmptyState
        icon={Hammer}
        title="Quote is being built"
        description="This screen arrives in the next build step."
      />
    </>
  );
}
