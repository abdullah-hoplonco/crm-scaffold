import { createFileRoute } from "@tanstack/react-router";
import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/States";

/** Placeholder page. Owned by the quotes workstream. */
export const Route = createFileRoute("/_app/quotes/new")({
  component: Placeholder,
});

function Placeholder() {
  return (
    <>
      <PageHeader title="New quote" />
      <EmptyState
        icon={Hammer}
        title="New quote is being built"
        description="This screen arrives in the next build step."
      />
    </>
  );
}
