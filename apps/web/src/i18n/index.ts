import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import common from "./en/common.json";
import contacts from "./en/contacts.json";
import dashboard from "./en/dashboard.json";
import demo from "./en/demo.json";
import inbox from "./en/inbox.json";
import leads from "./en/leads.json";
import pipeline from "./en/pipeline.json";
import quotes from "./en/quotes.json";
import settings from "./en/settings.json";

/**
 * Every user-facing string lives in i18n/en/<namespace>.json so Arabic (RTL) can be added later
 * without touching components. Orchestrator-owned; each area edits only its own JSON file.
 */
export const resources = {
  en: { common, contacts, dashboard, demo, inbox, leads, pipeline, quotes, settings },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  defaultNS: "common",
  ns: Object.keys(resources.en),
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
