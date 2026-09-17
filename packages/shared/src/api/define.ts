import { z } from "zod";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export const NoInput = z.object({});

export interface RouteDef<
  TParams extends z.ZodType = z.ZodType,
  TQuery extends z.ZodType = z.ZodType,
  TBody extends z.ZodType = z.ZodType,
  TResponse extends z.ZodType = z.ZodType,
> {
  method: HttpMethod;
  /** Express-style path relative to the API base, e.g. /deals/:dealId/move */
  path: string;
  summary: string;
  params: TParams;
  query: TQuery;
  body: TBody;
  response: TResponse;
}

export function defineRoute<
  TResponse extends z.ZodType,
  TParams extends z.ZodType = typeof NoInput,
  TQuery extends z.ZodType = typeof NoInput,
  TBody extends z.ZodType = typeof NoInput,
>(def: {
  method: HttpMethod;
  path: string;
  summary: string;
  params?: TParams;
  query?: TQuery;
  body?: TBody;
  response: TResponse;
}): RouteDef<TParams, TQuery, TBody, TResponse> {
  return {
    method: def.method,
    path: def.path,
    summary: def.summary,
    params: (def.params ?? NoInput) as TParams,
    query: (def.query ?? NoInput) as TQuery,
    body: (def.body ?? NoInput) as TBody,
    response: def.response,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural match for any route definition
export type AnyRoute = RouteDef<any, any, any, any>;

type NoFields = Record<never, never>;

/** Optional when every field of the part is optional (or the part is empty), required otherwise. */
type Part<TKey extends string, TSchema extends z.ZodType> =
  NoFields extends z.input<TSchema> ? { [K in TKey]?: z.input<TSchema> } : { [K in TKey]: z.input<TSchema> };

/** What a caller passes for a route: only the parts the route declares. */
export type RouteInput<R extends AnyRoute> = Part<"params", R["params"]> &
  Part<"query", R["query"]> &
  Part<"body", R["body"]>;

/** What handlers receive after validation. */
export interface RouteParsedInput<R extends AnyRoute> {
  params: z.output<R["params"]>;
  query: z.output<R["query"]>;
  body: z.output<R["body"]>;
}

export type RouteResponse<R extends AnyRoute> = z.output<R["response"]>;

export const Paginated = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int().min(0),
  });

export const PageQuery = {
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
};

export const Ok = z.object({ ok: z.literal(true) });

/** Error body returned by every API error response. */
export const ApiErrorBody = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBody>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Fill :params in a path. */
export function buildPath(path: string, params: Record<string, unknown> | undefined): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
    const value = params?.[key];
    if (value === undefined || value === null) throw new Error(`Missing path param "${key}" for ${path}`);
    return encodeURIComponent(String(value));
  });
}
