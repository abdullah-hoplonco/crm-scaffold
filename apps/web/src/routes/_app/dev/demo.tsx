import { createFileRoute } from "@tanstack/react-router";
import { DemoPanelPage } from "@/features/demo/DemoPanelPage";

export const Route = createFileRoute("/_app/dev/demo")({
  component: DemoPanelPage,
});
