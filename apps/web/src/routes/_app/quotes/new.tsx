import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { NewQuotePage } from "@/features/quotes/NewQuotePage";

export const Route = createFileRoute("/_app/quotes/new")({
  validateSearch: z.object({ dealId: z.string().optional() }),
  component: RouteComponent,
});

function RouteComponent() {
  const { dealId } = Route.useSearch();
  return <NewQuotePage key={dealId} dealId={dealId} />;
}
