import { LeadSource } from "@hco/shared";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { PipelineSearch } from "./search";

const ALL = "all";

export function BoardToolbar({
  search,
  view,
  onChange,
}: {
  search: PipelineSearch;
  view: "mine" | "everyone";
  onChange: (next: Partial<PipelineSearch>) => void;
}) {
  const { t } = useTranslation("pipeline");
  const [q, setQ] = useState(search.q ?? "");
  const [urlQ, setUrlQ] = useState(search.q);

  // Keep the box in step with back/forward navigation, and debounce typing into the URL.
  if (urlQ !== search.q) {
    setUrlQ(search.q);
    setQ(search.q ?? "");
  }
  useEffect(() => {
    if (q === (search.q ?? "")) return;
    const timer = window.setTimeout(() => onChange({ q: q.trim() || undefined }), 250);
    return () => window.clearTimeout(timer);
  }, [q, search.q, onChange]);

  const filtered = Boolean(search.q || search.source);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-72">
        <Search
          className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("toolbar.searchPlaceholder")}
          aria-label={t("toolbar.searchLabel")}
          className="bg-card ps-8"
        />
      </div>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={view}
        onValueChange={(value) => {
          if (value === "mine" || value === "everyone") onChange({ view: value });
        }}
        aria-label={t("toolbar.viewLabel")}
        className="bg-card"
      >
        <ToggleGroupItem value="mine" className="h-9 px-3.5">
          {t("toolbar.mine")}
        </ToggleGroupItem>
        <ToggleGroupItem value="everyone" className="h-9 px-3.5">
          {t("toolbar.everyone")}
        </ToggleGroupItem>
      </ToggleGroup>
      <Select
        value={search.source ?? ALL}
        onValueChange={(value) => onChange({ source: value === ALL ? undefined : LeadSource.parse(value) })}
      >
        <SelectTrigger className="min-w-36 bg-card" aria-label={t("toolbar.sourceLabel")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("toolbar.allSources")}</SelectItem>
          {LeadSource.options.map((source) => (
            <SelectItem key={source} value={source}>
              {t(`common:sources.${source}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {filtered ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-muted-foreground"
          onClick={() => {
            setQ("");
            onChange({ q: undefined, source: undefined });
          }}
        >
          <X />
          {t("toolbar.clear")}
        </Button>
      ) : null}
    </div>
  );
}
