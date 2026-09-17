import { createFileRoute } from "@tanstack/react-router";
import { DemoPanelPage } from "@/features/demo/DemoPanelPage";
import { TourStartCard } from "@/features/tour";

export const Route = createFileRoute("/_app/dev/demo")({
  component: DemoPanelRoute,
});

function DemoPanelRoute() {
  return (
    <>
      <div className="px-4 pt-4 sm:px-6 lg:px-8">
        <TourStartCard />
      </div>
      <DemoPanelPage />
    </>
  );
}
