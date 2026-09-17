import { createFileRoute } from "@tanstack/react-router";
import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/States";

/** Placeholder page. Owned by the contacts-companies workstream. */
export const Route = createFileRoute("/_app/companies/")({
  component: Placeholder,
});

function Placeholder() {
  return (
    <>
      <PageHeader title="Companies" />
      <EmptyState
        icon={Hammer}
        title="Companies is being built"
        description="This screen arrives in the next build step."
      />
    </>
  );
}
