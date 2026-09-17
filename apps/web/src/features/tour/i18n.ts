import i18n from "@/i18n";
import tour from "@/i18n/en/tour.json";

/**
 * The tour brings its own namespace. `i18n/index.ts` is owned by another workstream, so the bundle
 * is registered here; `apps/web/src/i18n/en/tour.json` stays the single home of the copy.
 * Move this `addResourceBundle` into `i18n/index.ts` when that file is next touched.
 */
if (!i18n.hasResourceBundle("en", "tour")) {
  i18n.addResourceBundle("en", "tour", tour, true, true);
}
