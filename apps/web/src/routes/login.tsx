import { api } from "@hco/shared";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { BrandMark } from "@/components/app/BrandMark";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { callApi } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { useApiQuery } from "@/lib/api/hooks";
import { sessionQuery } from "@/lib/session";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({
    redirect: z.string().optional(),
    /** Showcase: sign in straight away as this demo user (used by the demo panel's "open as rep"). */
    demoUser: z.string().optional(),
  }),
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery);
    if (session) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const { t } = useTranslation();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const demo = useApiQuery(api.auth.demoUsers, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const signIn = async (address: string) => {
    setError(null);
    setPending(address);
    try {
      const session = await callApi(api.auth.login, { body: { email: address, password } });
      queryClient.setQueryData(sessionQuery.queryKey, session);
      await navigate({ to: search.redirect ?? "/", search: {} });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(null);
    }
  };

  const autoSignIn = useRef(false);
  useEffect(() => {
    if (search.demoUser && !autoSignIn.current) {
      autoSignIn.current = true;
      void signIn(search.demoUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for the demoUser link
  }, [search.demoUser]);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <BrandMark className="size-10" />
          <span className="text-lg font-semibold text-sidebar-accent-foreground">{t("appName")}</span>
        </div>
        <div className="max-w-md">
          <p className="text-3xl leading-tight font-semibold text-sidebar-accent-foreground">
            Every WhatsApp, Instagram and TikTok enquiry in one inbox. Every follow-up on time.
          </p>
          <p className="mt-4 text-sidebar-muted">
            Built for sales teams in the UAE. Prices in AED, VAT and TRN on every quote.
          </p>
        </div>
        <p className="text-xs text-sidebar-muted">Hoplon &amp; Co</p>
      </section>

      <section className="flex flex-col justify-center px-4 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark className="size-9" />
            <span className="text-lg font-semibold">{t("appName")}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("login.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("login.subtitle")}</p>

          <form
            className="mt-6 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void signIn(email);
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={!email || pending !== null}>
              {t("login.submit")}
            </Button>
          </form>

          {demo.data ? (
            <div className="mt-8">
              <p className="text-sm font-medium">{t("login.demoTitle")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{demo.data.workspaceName}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {demo.data.users.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => void signIn(u.email)}
                      disabled={pending !== null}
                      className="group flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-start transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
                    >
                      <UserAvatar name={u.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{u.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {t(`roles.${u.role}`)} · {u.jobTitle}
                        </span>
                      </span>
                      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">{t("login.demoHint")}</p>
            </div>
          ) : null}

          <p className="mt-8 text-sm">
            <Link to="/onboarding" className="font-medium text-primary underline-offset-4 hover:underline">
              {t("login.newWorkspace")}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
