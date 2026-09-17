import type { LiveEvent } from "@hco/shared";

type Listener = (event: LiveEvent) => void;

const CHANNEL_NAME = "hco-crm:live";
const listeners = new Set<Listener>();
let channel: BroadcastChannel | null = null;

function ensureChannel() {
  if (channel || typeof BroadcastChannel === "undefined") return;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.addEventListener("message", (message: MessageEvent<{ event?: LiveEvent }>) => {
    const event = message.data?.event;
    if (event) for (const l of listeners) l(event);
  });
}

/** Deliver events to this tab and every other tab of the showcase. */
export function publish(events: LiveEvent[]) {
  ensureChannel();
  for (const event of events) {
    for (const l of listeners) l(event);
    channel?.postMessage({ event });
  }
}

export function subscribe(listener: Listener): () => void {
  ensureChannel();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
