import { Emirate } from "@hco/shared";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { z } from "zod";
import { CompaniesPage } from "@/features/companies/CompaniesPage";

export const Route = createFileRoute("/_app/companies/")({
  validateSearch: z.object({
    q: z.string().optional(),
    emirate: Emirate.optional().catch(undefined),
  }),
  component: CompaniesRoute,
});

function CompaniesRoute() {
  const { q, emirate } = Route.useSearch();
  const navigate = Route.useNavigate();
  const onFiltersChange = useCallback(
    (next: { q: string; emirate: Emirate | undefined }) =>
      void navigate({ search: { q: next.q || undefined, emirate: next.emirate }, replace: true }),
    [navigate],
  );
  return <CompaniesPage search={q ?? ""} emirate={emirate} onFiltersChange={onFiltersChange} />;
}
