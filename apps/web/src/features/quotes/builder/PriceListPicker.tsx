import { formatAed } from "@hco/core";
import { formatDecimal } from "@hco/core/quotes/index";
import { ListPlus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PRICE_LIST, type PriceListGroup } from "./priceList";

type PriceItem = PriceListGroup["items"][number];

/** Search the price list and add a single item or a whole plan to the quote. */
export function PriceListPicker({
  suggested,
  onAdd,
}: {
  suggested: PriceListGroup | null;
  onAdd: (items: PriceItem[]) => void;
}) {
  const { t } = useTranslation("quotes");
  const [open, setOpen] = useState(false);
  const groups = suggested ? [suggested, ...PRICE_LIST.filter((g) => g.key !== suggested.key)] : PRICE_LIST;

  const add = (items: PriceItem[]) => {
    onAdd(items);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <ListPlus />
          {t("builder.addFromPriceList")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" collisionPadding={16} className="w-[min(28rem,calc(100vw-2rem))] p-0">
        <Command>
          <CommandInput placeholder={t("builder.priceListSearch")} />
          <CommandList className="max-h-[min(22rem,50dvh)]">
            <CommandEmpty>{t("builder.priceListEmpty")}</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup
                key={group.key}
                heading={
                  group.key === suggested?.key ? t("builder.matchesDeal", { name: group.name }) : group.name
                }
              >
                {group.items.length > 1 ? (
                  <CommandItem
                    value={`${group.key} ${group.name} full plan`}
                    onSelect={() => add(group.items)}
                  >
                    <span className="flex-1 font-medium">
                      {t("builder.fullPlan", { count: group.items.length })}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatAed(group.subtotalAed)}
                    </span>
                  </CommandItem>
                ) : null}
                {group.items.map((item) => (
                  <CommandItem
                    key={item.description}
                    value={`${group.key} ${group.name} ${item.description}`}
                    onSelect={() => add([item])}
                  >
                    <span className="min-w-0 flex-1 whitespace-normal">{item.description}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {item.qty !== "1" ? `${formatDecimal(item.qty)} × ` : ""}
                      {formatAed(item.unitPriceAed)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
