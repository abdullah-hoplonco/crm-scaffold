import { z } from "zod";
import { User, Workspace } from "../entities";
import { defineRoute, Ok } from "./define";

export const AuthSession = z.object({ user: User, workspace: Workspace });
export type AuthSession = z.infer<typeof AuthSession>;

export const DemoLoginUser = User.pick({ id: true, name: true, role: true, email: true, jobTitle: true });
export type DemoLoginUser = z.infer<typeof DemoLoginUser>;

export const authRoutes = {
  demoUsers: defineRoute({
    method: "GET",
    path: "/auth/demo-users",
    summary: "Users of the demo workspace, for the showcase sign-in picker",
    response: z.object({ workspaceName: z.string(), users: z.array(DemoLoginUser) }),
  }),
  login: defineRoute({
    method: "POST",
    path: "/auth/login",
    summary: "Sign in with email and password (showcase: password optional)",
    body: z.object({ email: z.string().trim().min(1, "Enter your email"), password: z.string().optional() }),
    response: AuthSession,
  }),
  logout: defineRoute({ method: "POST", path: "/auth/logout", summary: "Sign out", response: Ok }),
  me: defineRoute({ method: "GET", path: "/auth/me", summary: "Current session", response: AuthSession }),
};
