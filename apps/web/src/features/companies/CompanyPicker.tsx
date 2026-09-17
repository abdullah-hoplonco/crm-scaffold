import { api } from "@hco/shared";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useApiQuery } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

/** Starter company picker. Owned by the contacts workstream; keep this props contract. */
export function CompanyPicker({
  value,
  onChange,
  id,
  className,
}: {
  value: string | null;
  onChange: (companyId: string | null, label: string | null) => void;
  id?: string;
  className?: string;
}) {
  const [q, setQ] = useState("");
  const list = useApiQuery(api.companies.list, { query: { q, limit: 8 } });
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies" />
      <ul className="max-h-48 overflow-y-auto rounded-md border">
        {(list.data?.items ?? []).map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-accent",
                value === c.id && "bg-accent font-medium",
              )}
              onClick={() => onChange(c.id, c.name)}
            >
              {c.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
