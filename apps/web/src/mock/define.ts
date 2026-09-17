import type { Actor, DomainErrorCode, Result } from "@hco/core";
import type { LiveEvent, Tables, User, Workspace } from "@hco/shared";
import type { AnyRoute, RouteParsedInput, RouteResponse } from "@hco/shared/api/define";
import type { MockState } from "./db";

export class DomainFailure extends Error {
  readonly code: DomainErrorCode | "UNAUTHENTICATED" | "NOT_IMPLEMENTED";
  readonly status: number;
  constructor(code: DomainFailure["code"], message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export type EmitInput = Pick<LiveEvent, "type" | "id"> & Partial<Pick<LiveEvent, "notifyUserIds" | "toast">>;

export interface MockContext {
  /** Draft of every table. Mutate freely; it is saved only when the handler succeeds. */
  db: Tables;
  state: MockState;
  now: Date;
  nowIso: string;
  /** Signed-in user and workspace. Throws 401 when used in a public handler without a session. */
  readonly user: User;
  readonly workspace: Workspace;
  readonly actor: Actor;
  emit(event: EmitInput): void;
  /** Run a follow-up change later (e.g. delivery ticks), as its own saved transaction. */
  defer(delayMs: number, run: (ctx: MockContext) => void): void;
  /**
   * Throw a domain error. TypeScript only narrows after `ctx.fail()` when ctx is explicitly typed,
   * so inside handlers prefer `throw ctx.error(code, message)`.
   */
  fail(code: DomainErrorCode, message: string): never;
  error(code: DomainErrorCode, message: string): DomainFailure;
  unwrap<T>(result: Result<T>): T;
}

export interface MockHandler<R extends AnyRoute = AnyRoute> {
  route: R;
  /** Handlers that work without a session (sign-in, onboarding). */
  isPublic?: boolean;
  handle(ctx: MockContext, input: RouteParsedInput<R>): RouteResponse<R> | Promise<RouteResponse<R>>;
}

/** Implement one contract route in the showcase backend. */
export function handle<R extends AnyRoute>(
  route: R,
  fn: MockHandler<R>["handle"],
  opts: { isPublic?: boolean } = {},
): MockHandler {
  return { route, handle: fn, isPublic: opts.isPublic } as unknown as MockHandler;
}
