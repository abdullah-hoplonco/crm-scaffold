import { createFileRoute } from "@tanstack/react-router";
import { LeadDetailPage } from "@/features/leads/LeadDetailPage";

export const Route = createFileRoute("/_app/leads/$leadId")({
  component: LeadPage,
});

function LeadPage() {
  const { leadId } = Route.useParams();
  return <LeadDetailPage key={leadId} leadId={leadId} />;
}
