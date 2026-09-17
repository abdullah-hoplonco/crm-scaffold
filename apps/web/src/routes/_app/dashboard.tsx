import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { DEFAULT_PERIOD, dashboardSearch } from "@/features/dashboard/periods";

export const Route = createFileRoute("/_app/dashboard")({
  validateSearch: dashboardSearch,
  beforeLoad: ({ context }) => {
    if (context.session.user.role === "rep") throw redirect({ to: "/today" });
  },
  component: DashboardRoute,
});

function DashboardRoute() {
  const { period } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <DashboardPage
      period={period ?? DEFAULT_PERIOD}
      onPeriodChange={(next) =>
        void navigate({ search: { period: next === DEFAULT_PERIOD ? undefined : next }, replace: true })
      }
    />
  );
}
