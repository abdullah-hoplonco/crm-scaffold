import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "./index.css";
import "./i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { initTransport } from "@/lib/api/client";
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: true },
  },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

/** The shell switches to the bottom tab bar below `lg`, which is where toasts have to sit too. */
const COMPACT_SHELL = "(max-width: 1023px)";

function subscribeCompactShell(onChange: () => void) {
  const query = window.matchMedia(COMPACT_SHELL);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useCompactShell() {
  return useSyncExternalStore(
    subscribeCompactShell,
    () => window.matchMedia(COMPACT_SHELL).matches,
    () => false,
  );
}

/**
 * Toasts must never cover the top bar, the page title or a phone's action bar. On a wide screen they
 * tuck under the 56px top bar; on a phone they sit above the tab bar and the action bars that stack
 * on top of it.
 */
function AppToaster() {
  if (useCompactShell()) {
    // Sonner switches to `--mobile-offset-*` below 600px, so the phone offset has to be passed there too.
    return (
      <Toaster
        position="bottom-center"
        offset={{ bottom: "calc(8.5rem + env(safe-area-inset-bottom))", left: 16, right: 16 }}
        mobileOffset={{ bottom: "calc(8.5rem + env(safe-area-inset-bottom))", left: 16, right: 16 }}
        closeButton
      />
    );
  }
  return <Toaster position="top-right" offset={{ top: 68, right: 24 }} closeButton />;
}

async function start() {
  await initTransport();
  const root = document.getElementById("root");
  if (!root) throw new Error("#root missing");
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <RouterProvider router={router} />
          <AppToaster />
        </TooltipProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void start();
