export function buildInvoiceNumber(sequenceNumber: number): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${String(sequenceNumber).padStart(5, "0")}`;
}
