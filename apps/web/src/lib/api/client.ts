import type { AnyRoute, RouteInput, RouteResponse } from "@hco/shared/api/define";
import { createHttpTransport } from "./http-transport";
import type { Transport } from "./transport";

export const API_MODE: "mock" | "http" = import.meta.env.VITE_API_MODE === "http" ? "http" : "mock";

let transport: Transport | null = null;

/** Called once at startup (see main.tsx) before anything renders. */
export async function initTransport(): Promise<Transport> {
  if (transport) return transport;
  if (API_MODE === "http") {
    transport = createHttpTransport(import.meta.env.VITE_API_BASE_URL ?? "/api");
  } else {
    const { createMockTransport } = await import("@/mock/transport");
    transport = await createMockTransport();
  }
  return transport;
}

function current(): Transport {
  if (!transport) throw new Error("API transport not initialised; call initTransport() first");
  return transport;
}

/** Call one API route with typed input and output. Throws ApiError on failure. */
export function callApi<R extends AnyRoute>(route: R, input: RouteInput<R>): Promise<RouteResponse<R>> {
  return current().call(route, input);
}

export function subscribeLive(listener: Parameters<Transport["subscribe"]>[0]): () => void {
  return current().subscribe(listener);
}
