import { createFileRoute } from "@tanstack/react-router";
import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/States";

/** Placeholder page. Owned by the leads-inbox workstream. */
export const Route = createFileRoute("/_app/leads/$leadId")({
  component: Placeholder,
});

function Placeholder() {
  return (
    <>
      <PageHeader title="Lead" />
      <EmptyState
        icon={Hammer}
        title="Lead is being built"
        description="This screen arrives in the next build step."
      />
    </>
  );
}
