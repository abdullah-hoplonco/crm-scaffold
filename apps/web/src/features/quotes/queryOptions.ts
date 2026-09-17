import { isApiError } from "@/lib/api/errors";

/**
 * A missing or someone else's quote won't load on a second try, so only retry server and network
 * failures. Keeps "This quote doesn't exist" on screen instead of a skeleton flicker.
 */
export function retryUnlessClientError(failureCount: number, error: Error): boolean {
  if (isApiError(error) && error.status < 500) return false;
  return failureCount < 1;
}
