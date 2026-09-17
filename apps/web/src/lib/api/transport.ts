import type { LiveEvent } from "@hco/shared";
import type { AnyRoute, RouteInput, RouteResponse } from "@hco/shared/api/define";

/** How the web app reaches the backend: HTTP in production, in-browser mock for the showcase. */
export interface Transport {
  call<R extends AnyRoute>(route: R, input: RouteInput<R>): Promise<RouteResponse<R>>;
  /** Subscribe to live events. Returns an unsubscribe function. */
  subscribe(listener: (event: LiveEvent) => void): () => void;
}
