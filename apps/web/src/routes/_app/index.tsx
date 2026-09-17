import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/")({
  beforeLoad: ({ context }) => {
    const role = context.session.user.role;
    throw redirect({ to: role === "rep" ? "/today" : "/dashboard" });
  },
});
