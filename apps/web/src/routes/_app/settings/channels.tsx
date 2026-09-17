import { createFileRoute } from "@tanstack/react-router";
import { ChannelsSettings } from "@/features/settings/ChannelsSettings";

export const Route = createFileRoute("/_app/settings/channels")({
  component: ChannelsSettings,
});
