import { useState, useCallback } from "react";
import { toast } from "sonner";
import { getInvoiceUrlAction } from "@/features/user/orders/actions/getInvoiceUrlAction";

const URL_CACHE_DURATION_MS = 50 * 60 * 1000; // 50 minutes

export function useInvoicePreview(orderId: string) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [urlFetchedAt, setUrlFetchedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openPreview = useCallback(
    async (invoicePdfPath: string) => {
      // Open modal immediately
      setIsModalOpen(true);
      setError(null);

      // Check if we have a cached URL that's still valid
      const now = Date.now();
      if (
        previewUrl &&
        urlFetchedAt &&
        now - urlFetchedAt < URL_CACHE_DURATION_MS
      ) {
        // Use cached URL
        return;
      }

      // Fetch fresh signed URL
      setIsLoadingUrl(true);
      try {
        const result = await getInvoiceUrlAction({
          invoicePdfPath,
          orderId,
        });

        if (!result.success) {
          setError(result.error);
          return;
        }

        setPreviewUrl(result.url);
        setUrlFetchedAt(Date.now());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invoice");
      } finally {
        setIsLoadingUrl(false);
      }
    },
    [previewUrl, urlFetchedAt, orderId],
  );

  const closePreview = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const downloadInvoice = useCallback(
    async (invoicePdfPath: string) => {
      setIsLoadingUrl(true);
      try {
        const result = await getInvoiceUrlAction({
          invoicePdfPath,
          orderId,
        });

        if (!result.success) {
          toast.error(result.error);
          return;
        }

        window.open(result.url, "_blank", "noopener,noreferrer");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to download invoice",
        );
      } finally {
        setIsLoadingUrl(false);
      }
    },
    [orderId],
  );

  return {
    isModalOpen,
    isLoadingUrl,
    previewUrl,
    urlFetchedAt,
    error,
    openPreview,
    closePreview,
    downloadInvoice,
  };
}
