import { fail as domainFail } from "@hco/core";
import type { LiveEvent } from "@hco/shared";
import { ApiError, type AnyRoute, type RouteInput, type RouteResponse } from "@hco/shared/api/define";
import type { Transport } from "@/lib/api/transport";
import { loadState, saveState, type MockState } from "./db";
import { DomainFailure, type MockContext, type MockHandler } from "./define";
import { publish, subscribe } from "./bus";
import { readTabSession, writeTabSession } from "./session";

const LATENCY_MS: [number, number] = [60, 180];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof DomainFailure) return new ApiError(error.status, error.code, error.message);
  console.error("[mock api] unexpected error", error);
  return new ApiError(500, "INTERNAL", "Something went wrong on our side. Try again.");
}

function createContext(
  state: MockState,
  pending: { events: LiveEvent[]; deferred: Array<[number, (ctx: MockContext) => void]> },
) {
  const now = new Date();
  const ctx: MockContext = {
    db: state.tables,
    state,
    now,
    nowIso: now.toISOString(),
    get user() {
      const user = state.tables.users.find((u) => u.id === state.sessionUserId && u.isActive);
      if (!user) throw new DomainFailure("UNAUTHENTICATED", "Sign in to continue.", 401);
      return user;
    },
    get workspace() {
      const ws = state.tables.workspaces.find((w) => w.id === ctx.user.workspaceId);
      if (!ws) throw new DomainFailure("UNAUTHENTICATED", "Sign in to continue.", 401);
      return ws;
    },
    get actor() {
      return { userId: ctx.user.id, workspaceId: ctx.user.workspaceId, role: ctx.user.role };
    },
    emit(event) {
      let workspaceId = "";
      let actorUserId: string | null = null;
      try {
        workspaceId = ctx.workspace.id;
        actorUserId = ctx.user.id;
      } catch {
        // Public handler without a session.
      }
      pending.events.push({
        type: event.type,
        id: event.id,
        workspaceId,
        at: ctx.nowIso,
        actorUserId,
        notifyUserIds: event.notifyUserIds ?? [],
        toast: event.toast ?? null,
      });
    },
    defer(delayMs, run) {
      pending.deferred.push([delayMs, run]);
    },
    fail(code, message) {
      throw ctx.error(code, message);
    },
    error(code, message) {
      const result = domainFail(code, message);
      return new DomainFailure(code, message, result.ok ? 422 : result.error.httpStatus);
    },
    unwrap(result) {
      if (result.ok) return result.value;
      throw new DomainFailure(result.error.code, result.error.message, result.error.httpStatus);
    },
  };
  return ctx;
}

/** Run a mutation against a private copy of the state; save and publish only if it succeeds. */
async function transaction<T>(run: (ctx: MockContext) => T | Promise<T>, save: boolean): Promise<T> {
  const draft = structuredClone(loadState());
  draft.sessionUserId = readTabSession();
  const sessionBefore = draft.sessionUserId;
  const pending = { events: [] as LiveEvent[], deferred: [] as Array<[number, (ctx: MockContext) => void]> };
  const ctx = createContext(draft, pending);
  const result = await run(ctx);
  if (draft.sessionUserId !== sessionBefore) writeTabSession(draft.sessionUserId);
  if (save) saveState({ ...draft, sessionUserId: null });
  if (pending.events.length) publish(pending.events);
  for (const [delay, job] of pending.deferred) {
    setTimeout(() => {
      transaction(job, true).catch((error: unknown) =>
        console.error("[mock api] deferred job failed", error),
      );
    }, delay);
  }
  return result;
}

export async function createMockTransport(): Promise<Transport> {
  const { handlers } = await import("./handlers/index");
  const byRoute = new Map<AnyRoute, MockHandler>();
  for (const h of handlers) byRoute.set(h.route, h);
  loadState();

  return {
    async call<R extends AnyRoute>(route: R, input: RouteInput<R>): Promise<RouteResponse<R>> {
      await sleep(LATENCY_MS[0] + Math.random() * (LATENCY_MS[1] - LATENCY_MS[0]));
      const handler = byRoute.get(route);
      if (!handler) {
        throw new ApiError(
          501,
          "NOT_IMPLEMENTED",
          `${route.method} ${route.path} isn't available in the demo yet.`,
        );
      }
      const parts = {
        params: route.params.safeParse(input.params ?? {}),
        query: route.query.safeParse(input.query ?? {}),
        body: route.body.safeParse(input.body ?? {}),
      };
      for (const [part, parsed] of Object.entries(parts)) {
        if (!parsed.success) {
          const first = parsed.error.issues[0];
          throw new ApiError(
            422,
            "VALIDATION",
            first?.message ?? `Check the ${part} and try again.`,
            parsed.error.issues,
          );
        }
      }
      try {
        const result = await transaction(async (ctx) => {
          if (!handler.isPublic) void ctx.user;
          return handler.handle(ctx, {
            params: parts.params.data,
            query: parts.query.data,
            body: parts.body.data,
          } as never);
        }, route.method !== "GET");
        const checked = route.response.safeParse(result);
        if (!checked.success) {
          console.error(
            `[mock api] ${route.method} ${route.path} returned data that breaks the contract`,
            checked.error.issues,
            result,
          );
          throw new ApiError(
            500,
            "CONTRACT_MISMATCH",
            `The demo backend returned invalid data for ${route.path}.`,
          );
        }
        return checked.data as RouteResponse<R>;
      } catch (error) {
        throw toApiError(error);
      }
    },
    subscribe,
  };
}

/** Run an out-of-request change (e.g. from the demo panel's timers) with the same save/publish rules. */
export function runMockJob(run: (ctx: MockContext) => void) {
  return transaction(run, true);
}
