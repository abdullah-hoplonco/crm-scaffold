import { API_MODE } from "@/lib/api/client";

/**
 * The tour is a demo tool. It ships with the in-browser demo workspace and disappears the moment
 * the app is pointed at a real API, unless the deployment asks for it by name.
 */
const env = import.meta.env as ImportMetaEnv & Record<string, string | undefined>;

export const tourEnabled: boolean = API_MODE !== "http" || env.VITE_DEMO_TOUR === "true";
