import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type {
  OrgOrderDetail,
  OrgOrderItem,
} from "@/lib/supabase/queries/org-orders";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvoiceData {
  invoiceNumber: string;
  invoiceYear: number;
  issuedAt: string | null;
  order: OrgOrderDetail;
  orgName: string;
  orgLogoUrl?: string | null;
  orgContactEmail?: string | null;
  isDraft?: boolean;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    position: "relative",
  },
  watermark: {
    position: "absolute",
    top: "40%",
    left: "10%",
    transform: "rotate(-45deg)",
    opacity: 0.08,
  },
  watermarkText: {
    fontSize: 120,
    color: "#FF6600",
    fontWeight: "bold",
  },
  header: {
    marginBottom: 20,
  },
  orgLogo: {
    width: 100,
    height: 60,
    objectFit: "contain",
    marginBottom: 8,
  },
  orgName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  orgContact: {
    fontSize: 9,
    color: "#666",
    marginBottom: 16,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "right",
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 12,
    textAlign: "right",
    marginBottom: 4,
  },
  draftBadge: {
    backgroundColor: "#FF6600",
    color: "white",
    padding: "4 8",
    fontSize: 10,
    fontWeight: "bold",
    alignSelf: "flex-end",
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 10,
    textAlign: "right",
    color: "#666",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "uppercase",
    color: "#333",
  },
  text: {
    fontSize: 10,
    marginBottom: 3,
    lineHeight: 1.4,
  },
  textBold: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 3,
  },
  textMuted: {
    fontSize: 9,
    color: "#666",
    marginBottom: 2,
  },
  divider: {
    borderBottom: "1 solid #ddd",
    marginVertical: 12,
  },
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1 solid #333",
    paddingBottom: 6,
    marginBottom: 6,
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottom: "0.5 solid #eee",
  },
  bundleHeader: {
    flexDirection: "row",
    paddingVertical: 8,
    backgroundColor: "#f5f5f5",
    fontWeight: "bold",
  },
  bundleComponent: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingLeft: 20,
    backgroundColor: "#fafafa",
    fontSize: 9,
  },
  col1: {
    flex: 3,
  },
  col2: {
    flex: 1,
    textAlign: "center",
  },
  col3: {
    flex: 1,
    textAlign: "right",
  },
  col4: {
    flex: 1,
    textAlign: "right",
  },
  financialSummary: {
    marginLeft: "auto",
    width: 200,
    marginTop: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 10,
  },
  summaryValue: {
    fontSize: 10,
    textAlign: "right",
  },
  summaryDivider: {
    borderTop: "1 solid #333",
    marginVertical: 6,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 12,
    fontWeight: "bold",
  },
  paymentBlock: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 4,
  },
  warningBlock: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#fff3cd",
    borderRadius: 4,
  },
  warningText: {
    fontSize: 9,
    color: "#856404",
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: "1 solid #ddd",
    paddingTop: 8,
    fontSize: 8,
    color: "#666",
    textAlign: "center",
  },
  preOrderBadge: {
    fontSize: 8,
    color: "#666",
    fontStyle: "italic",
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `PHP ${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatAddress(address: Record<string, unknown> | null): string {
  if (!address) return "";
  const parts: string[] = [];
  if (address.street) parts.push(String(address.street));
  if (address.barangay) parts.push(`Brgy. ${String(address.barangay)}`);
  if (address.city)
    parts.push(`${String(address.city)}, ${String(address.province ?? "")}`);
  if (address.postal_code) parts.push(String(address.postal_code));
  return parts.join(", ");
}

type BundleGroup = {
  header: OrgOrderItem & { bundle_instance_id: string };
  components: OrgOrderItem[];
};

function groupItems(items: OrgOrderItem[]): (BundleGroup | OrgOrderItem)[] {
  const bundleMap = new Map<string, BundleGroup>();
  const standalones: OrgOrderItem[] = [];

  for (const item of items) {
    // Check if item has bundle_instance_id
    const bundleInstanceId = item.bundle_instance_id;

    if (!bundleInstanceId) {
      standalones.push(item);
    } else if (item.is_bundle_header) {
      const existing = bundleMap.get(bundleInstanceId);
      const headerWithId = { ...item, bundle_instance_id: bundleInstanceId };
      if (existing) {
        existing.header = headerWithId;
      } else {
        bundleMap.set(bundleInstanceId, {
          header: headerWithId,
          components: [],
        });
      }
    } else {
      const existing = bundleMap.get(bundleInstanceId);
      if (existing) {
        existing.components.push(item);
      } else {
        // Initialize with a temporary header (will be replaced when we encounter the actual header)
        bundleMap.set(bundleInstanceId, {
          header: { ...item, bundle_instance_id: bundleInstanceId },
          components: [item],
        });
      }
    }
  }

  return [...Array.from(bundleMap.values()), ...standalones];
}

// ─── Components ───────────────────────────────────────────────────────────────

function DraftWatermark() {
  return React.createElement(
    View,
    { style: styles.watermark },
    React.createElement(Text, { style: styles.watermarkText }, "DRAFT"),
  );
}

function InvoiceHeader({
  data,
  isDraft,
}: {
  data: InvoiceData;
  isDraft: boolean;
}) {
  return React.createElement(
    View,
    { style: styles.header },
    React.createElement(
      View,
      { style: { flexDirection: "row", justifyContent: "space-between" } },
      React.createElement(
        View,
        null,
        data.orgLogoUrl &&
          React.createElement(Image, {
            src: data.orgLogoUrl,
            style: styles.orgLogo,
          }),
        React.createElement(Text, { style: styles.orgName }, data.orgName),
        data.orgContactEmail &&
          React.createElement(
            Text,
            { style: styles.orgContact },
            data.orgContactEmail,
          ),
      ),
      React.createElement(
        View,
        { style: { alignItems: "flex-end" } },
        React.createElement(Text, { style: styles.invoiceTitle }, "INVOICE"),
        React.createElement(
          Text,
          { style: styles.invoiceNumber },
          data.invoiceNumber,
        ),
        isDraft &&
          React.createElement(
            View,
            { style: styles.draftBadge },
            React.createElement(Text, null, "DRAFT"),
          ),
        data.issuedAt &&
          React.createElement(
            Text,
            { style: styles.invoiceDate },
            "Date: ",
            formatDate(data.issuedAt),
          ),
        isDraft &&
          !data.issuedAt &&
          React.createElement(
            Text,
            { style: styles.invoiceDate },
            "PENDING CONFIRMATION",
          ),
      ),
    ),
  );
}

function BillTo({ data }: { data: InvoiceData }) {
  const { order } = data;
  return React.createElement(
    View,
    { style: styles.section },
    React.createElement(Text, { style: styles.sectionTitle }, "Bill To:"),
    React.createElement(Text, { style: styles.textBold }, order.customer_name),
    order.customer_contact &&
      React.createElement(Text, { style: styles.text }, order.customer_contact),
    order.fulfillment_method === "delivery" &&
      order.delivery_address &&
      React.createElement(
        Text,
        { style: styles.text },
        formatAddress(order.delivery_address),
      ),
    order.fulfillment_method === "pickup" &&
      React.createElement(Text, { style: styles.textMuted }, "Pickup order"),
  );
}

function OrderMeta({ data }: { data: InvoiceData }) {
  const { order } = data;
  const paymentLabel =
    order.payment_method === "gcash" ? "GCash" : "Cash on Pickup";
  const fulfillmentLabel =
    order.fulfillment_method === "delivery" ? "Delivery" : "Pickup";

  return React.createElement(
    View,
    { style: styles.section },
    React.createElement(
      View,
      { style: { flexDirection: "row", gap: 20 } },
      React.createElement(
        View,
        null,
        React.createElement(Text, { style: styles.textMuted }, "Order #:"),
        React.createElement(
          Text,
          { style: styles.textBold },
          order.order_number,
        ),
      ),
      React.createElement(
        View,
        null,
        React.createElement(Text, { style: styles.textMuted }, "Payment:"),
        React.createElement(Text, { style: styles.text }, paymentLabel),
      ),
      React.createElement(
        View,
        null,
        React.createElement(Text, { style: styles.textMuted }, "Fulfillment:"),
        React.createElement(Text, { style: styles.text }, fulfillmentLabel),
      ),
    ),
  );
}

function ItemsTable({ items }: { items: OrgOrderItem[] }) {
  const grouped = groupItems(items);

  function isBundleGroup(
    item: BundleGroup | OrgOrderItem,
  ): item is BundleGroup {
    return "header" in item && "components" in item;
  }

  return React.createElement(
    View,
    { style: styles.table },
    React.createElement(
      View,
      { style: styles.tableHeader },
      React.createElement(Text, { style: styles.col1 }, "Item"),
      React.createElement(Text, { style: styles.col2 }, "Qty"),
      React.createElement(Text, { style: styles.col3 }, "Unit Price"),
      React.createElement(Text, { style: styles.col4 }, "Subtotal"),
    ),
    grouped.map((entry, idx) => {
      if (isBundleGroup(entry)) {
        const { header, components } = entry;
        return React.createElement(
          View,
          { key: `bundle-${idx}` },
          React.createElement(
            View,
            { style: styles.bundleHeader },
            React.createElement(
              Text,
              { style: styles.col1 },
              (header.bundle_name_snapshot ?? "Bundle") +
                (header.is_pre_order ? " (Pre-order)" : ""),
            ),
            React.createElement(
              Text,
              { style: styles.col2 },
              header.quantity.toString(),
            ),
            React.createElement(
              Text,
              { style: styles.col3 },
              formatCurrency(header.unit_price),
            ),
            React.createElement(
              Text,
              { style: styles.col4 },
              formatCurrency(header.subtotal),
            ),
          ),
          components.map((comp, compIdx) =>
            React.createElement(
              View,
              { key: `comp-${idx}-${compIdx}`, style: styles.bundleComponent },
              React.createElement(
                Text,
                { style: styles.col1 },
                comp.product_name +
                  (comp.variation_name ? ` — ${comp.variation_name}` : ""),
              ),
              React.createElement(
                Text,
                { style: styles.col2 },
                comp.quantity.toString(),
              ),
              React.createElement(Text, { style: styles.col3 }, "—"),
              React.createElement(Text, { style: styles.col4 }, "—"),
            ),
          ),
        );
      } else {
        const item = entry;
        return React.createElement(
          View,
          { key: `item-${idx}`, style: styles.tableRow },
          React.createElement(
            Text,
            { style: styles.col1 },
            item.product_name +
              (item.variation_name ? ` — ${item.variation_name}` : "") +
              (item.is_pre_order ? " (Pre-order)" : ""),
          ),
          React.createElement(
            Text,
            { style: styles.col2 },
            item.quantity.toString(),
          ),
          React.createElement(
            Text,
            { style: styles.col3 },
            formatCurrency(item.unit_price),
          ),
          React.createElement(
            Text,
            { style: styles.col4 },
            formatCurrency(item.subtotal),
          ),
        );
      }
    }),
  );
}

function FinancialSummary({ data }: { data: InvoiceData }) {
  const { order } = data;
  return React.createElement(
    View,
    { style: styles.financialSummary },
    React.createElement(
      View,
      { style: styles.summaryRow },
      React.createElement(Text, { style: styles.summaryLabel }, "Subtotal:"),
      React.createElement(
        Text,
        { style: styles.summaryValue },
        formatCurrency(order.subtotal),
      ),
    ),
    order.discount_amount > 0 &&
      React.createElement(
        View,
        { style: styles.summaryRow },
        React.createElement(Text, { style: styles.summaryLabel }, "Discount:"),
        React.createElement(
          Text,
          { style: styles.summaryValue },
          "-" + formatCurrency(order.discount_amount),
        ),
      ),
    React.createElement(View, { style: styles.summaryDivider }),
    React.createElement(
      View,
      { style: styles.totalRow },
      React.createElement(Text, { style: styles.totalLabel }, "TOTAL:"),
      React.createElement(
        Text,
        { style: styles.totalValue },
        formatCurrency(order.total_amount),
      ),
    ),
    React.createElement(View, { style: styles.summaryDivider }),
    React.createElement(
      View,
      { style: styles.summaryRow },
      React.createElement(Text, { style: styles.summaryLabel }, "Commission:"),
      React.createElement(
        Text,
        { style: styles.summaryValue },
        formatCurrency(order.commission_amount),
      ),
    ),
    React.createElement(
      View,
      { style: styles.summaryRow },
      React.createElement(Text, { style: styles.summaryLabel }, "Payout:"),
      React.createElement(
        Text,
        { style: styles.summaryValue },
        formatCurrency(order.org_payout_amount),
      ),
    ),
  );
}

function PaymentBlock({
  data,
  isDraft,
}: {
  data: InvoiceData;
  isDraft: boolean;
}) {
  const { order } = data;
  const paymentMethod =
    order.payment_method === "gcash" ? "GCash" : "Cash on Pickup";
  const statusLabels: Record<string, string> = {
    pending: "Pending",
    proof_submitted: "Proof Submitted",
    confirmed: "Confirmed",
    rejected: "Rejected",
  };

  return React.createElement(
    View,
    { style: styles.paymentBlock },
    React.createElement(
      View,
      { style: { flexDirection: "row", marginBottom: 4 } },
      React.createElement(Text, { style: styles.textBold }, "Payment Method: "),
      React.createElement(Text, { style: styles.text }, paymentMethod),
    ),
    React.createElement(
      View,
      { style: { flexDirection: "row", marginBottom: 4 } },
      React.createElement(Text, { style: styles.textBold }, "Payment Status: "),
      React.createElement(
        Text,
        { style: styles.text },
        statusLabels[order.payment_status],
      ),
    ),
    isDraft &&
      React.createElement(
        View,
        { style: styles.warningBlock },
        React.createElement(
          Text,
          { style: styles.warningText },
          "⚠ This is a draft invoice. Payment has not been confirmed.",
        ),
        React.createElement(
          Text,
          { style: styles.warningText },
          "The final invoice will be issued upon order completion.",
        ),
      ),
  );
}

function Footer({ data }: { data: InvoiceData }) {
  return React.createElement(
    View,
    { style: styles.footer },
    React.createElement(
      Text,
      null,
      `Generated by Verch Platform | ${data.orgName} | ${data.invoiceNumber}`,
    ),
    React.createElement(Text, null, "This invoice was system-generated."),
  );
}

function InvoiceDocument({
  data,
  isDraft,
}: {
  data: InvoiceData;
  isDraft: boolean;
}) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      isDraft && React.createElement(DraftWatermark),
      React.createElement(InvoiceHeader, { data, isDraft }),
      React.createElement(View, { style: styles.divider }),
      React.createElement(BillTo, { data }),
      React.createElement(OrderMeta, { data }),
      React.createElement(View, { style: styles.divider }),
      React.createElement(ItemsTable, { items: data.order.items }),
      React.createElement(FinancialSummary, { data }),
      React.createElement(PaymentBlock, { data, isDraft }),
      React.createElement(Footer, { data }),
    ),
  );
}

// ─── Exported Function ────────────────────────────────────────────────────────

/**
 * Generates an invoice PDF from order data.
 *
 * @param data - Invoice data including order details
 * @param isDraft - If true, renders with "DRAFT" watermark and no issued_at
 * @returns PDF as a Buffer
 */
export async function generateInvoicePdf(
  data: InvoiceData,
  isDraft: boolean = false,
): Promise<Buffer> {
  const element = React.createElement(InvoiceDocument, { data, isDraft });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(element as any);
}
