import { api } from "@hco/shared";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useApiQuery } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

/**
 * Starter contact picker (search + pick). Owned by the contacts workstream, which may restyle it
 * (combobox, "create new" inline) but must keep this props contract.
 */
export function ContactPicker({
  value,
  onChange,
  id,
  className,
}: {
  value: string | null;
  onChange: (contactId: string | null, label: string | null) => void;
  id?: string;
  className?: string;
}) {
  const [q, setQ] = useState("");
  const list = useApiQuery(api.contacts.list, { query: { q, limit: 8 } });
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts" />
      <ul className="max-h-48 overflow-y-auto rounded-md border">
        {(list.data?.items ?? []).map((c) => {
          const label = [c.firstName, c.lastName].filter(Boolean).join(" ");
          return (
            <li key={c.id}>
              <button
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-accent",
                  value === c.id && "bg-accent font-medium",
                )}
                onClick={() => onChange(c.id, label)}
              >
                {label}
                {c.companyName ? <span className="text-muted-foreground"> · {c.companyName}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
