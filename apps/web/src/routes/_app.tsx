import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { ErrorState } from "@/components/app/States";
import { useLiveUpdates } from "@/lib/live";
import { sessionQuery, useSession } from "@/lib/session";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery);
    if (!session) throw redirect({ to: "/login", search: { redirect: location.href } });
    return { session };
  },
  component: SignedInLayout,
  errorComponent: ({ error, reset }) => <ErrorState error={error} onRetry={reset} className="h-dvh" />,
});

function SignedInLayout() {
  const { user } = useSession();
  useLiveUpdates(user.id);
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
