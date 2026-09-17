import { createFileRoute } from "@tanstack/react-router";
import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/States";

/** Placeholder page. Owned by the owner-views workstream. */
export const Route = createFileRoute("/_app/dashboard")({
  component: Placeholder,
});

function Placeholder() {
  return (
    <>
      <PageHeader title="Dashboard" />
      <EmptyState
        icon={Hammer}
        title="Dashboard is being built"
        description="This screen arrives in the next build step."
      />
    </>
  );
}
