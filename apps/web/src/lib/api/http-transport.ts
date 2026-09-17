import { LiveEvent } from "@hco/shared";
import {
  ApiError,
  ApiErrorBody,
  buildPath,
  type AnyRoute,
  type RouteInput,
  type RouteResponse,
} from "@hco/shared/api/define";
import type { Transport } from "./transport";

/** Phase B transport: REST over fetch with cookie sessions, live events over SSE. */
export function createHttpTransport(baseUrl: string): Transport {
  return {
    async call<R extends AnyRoute>(route: R, input: RouteInput<R>): Promise<RouteResponse<R>> {
      const url = new URL(
        baseUrl + buildPath(route.path, input.params as Record<string, unknown> | undefined),
        window.location.origin,
      );
      for (const [key, value] of Object.entries((input.query ?? {}) as Record<string, unknown>)) {
        if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
      }
      const res = await fetch(url, {
        method: route.method,
        credentials: "include",
        headers: route.method === "GET" ? undefined : { "content-type": "application/json" },
        body: route.method === "GET" ? undefined : JSON.stringify(input.body ?? {}),
      });
      const json: unknown = res.status === 204 ? null : await res.json().catch(() => null);
      if (!res.ok) {
        const parsed = ApiErrorBody.safeParse(json);
        if (parsed.success)
          throw new ApiError(
            res.status,
            parsed.data.error.code,
            parsed.data.error.message,
            parsed.data.error.details,
          );
        throw new ApiError(res.status, "HTTP_ERROR", `Request failed (${res.status})`);
      }
      return route.response.parse(json) as RouteResponse<R>;
    },
    subscribe(listener) {
      const source = new EventSource(`${baseUrl}/events`, { withCredentials: true });
      source.onmessage = (message) => {
        const parsed = LiveEvent.safeParse(JSON.parse(message.data as string));
        if (parsed.success) listener(parsed.data);
      };
      return () => source.close();
    },
  };
}
