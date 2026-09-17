import { createFileRoute } from "@tanstack/react-router";
import { CompanyDetailPage } from "@/features/companies/CompanyDetailPage";

export const Route = createFileRoute("/_app/companies/$companyId")({
  component: CompanyRoute,
});

function CompanyRoute() {
  const { companyId } = Route.useParams();
  return <CompanyDetailPage key={companyId} companyId={companyId} />;
}
