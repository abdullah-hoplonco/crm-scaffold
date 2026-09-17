import { api } from "@hco/shared";
import type { AuthSession } from "@hco/shared/api/auth";
import { ApiError } from "@hco/shared/api/define";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { callApi } from "./api/client";

export const sessionQuery = queryOptions({
  queryKey: ["session"],
  queryFn: async (): Promise<AuthSession | null> => {
    try {
      return await callApi(api.auth.me, {});
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },
  staleTime: 60_000,
});

/** The signed-in user and workspace. Only use under the authenticated layout. */
export function useSession(): AuthSession {
  const { data } = useSuspenseQuery(sessionQuery);
  if (!data) throw new Error("useSession() used outside the signed-in area");
  return data;
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return async () => {
    await callApi(api.auth.logout, {});
    queryClient.clear();
    window.location.assign("/login");
  };
}
