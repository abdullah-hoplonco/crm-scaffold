import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  notFoundComponent: () => (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-lg font-semibold">This page doesn't exist</p>
      <p className="text-sm text-muted-foreground">The link may be old, or the record was deleted.</p>
      <Button asChild>
        <Link to="/">Go to the app</Link>
      </Button>
    </div>
  ),
});
