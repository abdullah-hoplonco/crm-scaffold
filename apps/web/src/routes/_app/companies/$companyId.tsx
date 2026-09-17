import { createFileRoute } from "@tanstack/react-router";
import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/States";

/** Placeholder page. Owned by the contacts-companies workstream. */
export const Route = createFileRoute("/_app/companies/$companyId")({
  component: Placeholder,
});

function Placeholder() {
  return (
    <>
      <PageHeader title="Company" />
      <EmptyState
        icon={Hammer}
        title="Company is being built"
        description="This screen arrives in the next build step."
      />
    </>
  );
}
