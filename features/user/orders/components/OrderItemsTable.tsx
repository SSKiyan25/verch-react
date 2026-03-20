"use client";

import { Badge } from "@/components/ui/badge";
import type { OrderDetailItem } from "@/lib/supabase/queries/orders";

interface OrderItemsTableProps {
  items: OrderDetailItem[];
}

type BundleGroup = {
  header: OrderDetailItem;
  components: OrderDetailItem[];
};

function groupItems(
  items: OrderDetailItem[],
): (BundleGroup | OrderDetailItem)[] {
  const bundleMap = new Map<string, BundleGroup>();
  const standalones: OrderDetailItem[] = [];

  for (const item of items) {
    if (item.bundle_instance_id === null) {
      standalones.push(item);
    } else if (item.is_bundle_header) {
      const existing = bundleMap.get(item.bundle_instance_id);
      if (existing) {
        existing.header = item;
      } else {
        bundleMap.set(item.bundle_instance_id, {
          header: item,
          components: [],
        });
      }
    } else {
      const existing = bundleMap.get(item.bundle_instance_id);
      if (existing) {
        existing.components.push(item);
      } else {
        bundleMap.set(item.bundle_instance_id, {
          header: item,
          components: [],
        });
      }
    }
  }

  return [...Array.from(bundleMap.values()), ...standalones];
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  })
    .format(amount)
    .replace("PHP", "₱");

function AttributeChips({
  attributes,
}: {
  attributes: Record<string, unknown> | null;
}) {
  if (!attributes) return null;
  const entries = Object.entries(attributes);
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className="inline-block px-1.5 py-0.5 bg-muted text-muted-foreground text-xs rounded"
        >
          {String(value)}
        </span>
      ))}
    </div>
  );
}

function isBundleGroup(
  item: BundleGroup | OrderDetailItem,
): item is BundleGroup {
  return "header" in item && "components" in item;
}

export function OrderItemsTable({ items }: OrderItemsTableProps) {
  const grouped = groupItems(items);

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-xs uppercase tracking-wide">
            <th className="text-left py-2 pr-3 font-medium">Item</th>
            <th className="text-center py-2 px-2 font-medium w-12">Qty</th>
            <th className="text-right py-2 px-2 font-medium w-24">
              Unit Price
            </th>
            <th className="text-right py-2 pl-2 font-medium w-24">Subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {grouped.map((entry) => {
            if (isBundleGroup(entry)) {
              const { header, components } = entry;
              return (
                <>
                  {/* Bundle header row */}
                  <tr key={header.id} className="bg-muted/40">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {header.bundle_name_snapshot ?? "Bundle"}
                        </span>
                        {header.is_pre_order && (
                          <Badge variant="secondary" className="text-xs">
                            Pre-order
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="text-center py-3 px-2">{header.quantity}</td>
                    <td className="text-right py-3 px-2">
                      {formatCurrency(header.unit_price)}
                    </td>
                    <td className="text-right py-3 pl-2 font-medium">
                      {formatCurrency(header.subtotal)}
                    </td>
                  </tr>
                  {/* Bundle component rows */}
                  {components.map((comp) => (
                    <tr key={comp.id} className="bg-muted/10">
                      <td className="py-2 pr-3 pl-6">
                        <div className="text-muted-foreground">
                          <span>{comp.product_name_snapshot}</span>
                          {comp.variation_name_snapshot && (
                            <span className="text-muted-foreground/70">
                              {" "}
                              — {comp.variation_name_snapshot}
                            </span>
                          )}
                          <AttributeChips
                            attributes={comp.attributes_snapshot}
                          />
                        </div>
                      </td>
                      <td className="text-center py-2 px-2 text-muted-foreground">
                        {comp.quantity}
                      </td>
                      <td className="text-right py-2 px-2">
                        <span className="text-xs text-muted-foreground italic">
                          Included
                        </span>
                      </td>
                      <td className="text-right py-2 pl-2">
                        <span className="text-xs text-muted-foreground">—</span>
                      </td>
                    </tr>
                  ))}
                </>
              );
            }

            // Standalone item
            const item = entry as OrderDetailItem;
            return (
              <tr key={item.id}>
                <td className="py-3 pr-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {item.product_name_snapshot}
                      </span>
                      {item.is_pre_order && (
                        <Badge variant="secondary" className="text-xs">
                          Pre-order
                        </Badge>
                      )}
                    </div>
                    {item.variation_name_snapshot && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.variation_name_snapshot}
                      </p>
                    )}
                    <AttributeChips attributes={item.attributes_snapshot} />
                  </div>
                </td>
                <td className="text-center py-3 px-2">{item.quantity}</td>
                <td className="text-right py-3 px-2">
                  {formatCurrency(item.unit_price)}
                </td>
                <td className="text-right py-3 pl-2 font-medium">
                  {formatCurrency(item.subtotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
