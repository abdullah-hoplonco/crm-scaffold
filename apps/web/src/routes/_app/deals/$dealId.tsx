import { createFileRoute } from "@tanstack/react-router";
import { DealPage } from "@/features/pipeline/deal/DealPage";

export const Route = createFileRoute("/_app/deals/$dealId")({
  component: DealRoute,
});

function DealRoute() {
  const { dealId } = Route.useParams();
  return <DealPage key={dealId} dealId={dealId} />;
}
