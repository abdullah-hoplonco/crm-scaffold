import type { AnyRoute, RouteInput, RouteResponse } from "@hco/shared/api/define";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { callApi } from "./client";

/** Query key for a route call. Keys start with the route path so related queries can be invalidated together. */
export function apiKey<R extends AnyRoute>(route: R, input?: RouteInput<R>) {
  return input ? ([route.method, route.path, input] as const) : ([route.method, route.path] as const);
}

export function useApiQuery<R extends AnyRoute>(
  route: R,
  input: RouteInput<R>,
  options?: Omit<UseQueryOptions<RouteResponse<R>, Error>, "queryKey" | "queryFn">,
) {
  return useQuery<RouteResponse<R>, Error>({
    queryKey: apiKey(route, input),
    queryFn: () => callApi(route, input),
    ...options,
  });
}

/**
 * Mutation for a route. After success every query is invalidated (data is small and local in the
 * showcase; in Phase B live events drive the same invalidation). Pass onMutate for optimistic UI.
 */
export function useApiMutation<R extends AnyRoute, TContext = unknown>(
  route: R,
  options?: Omit<UseMutationOptions<RouteResponse<R>, Error, RouteInput<R>, TContext>, "mutationFn">,
) {
  const queryClient = useQueryClient();
  return useMutation<RouteResponse<R>, Error, RouteInput<R>, TContext>({
    mutationFn: (input) => callApi(route, input),
    ...options,
    onSettled: async (...args) => {
      await options?.onSettled?.(...args);
      await queryClient.invalidateQueries();
    },
  });
}
