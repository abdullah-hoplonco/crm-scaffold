import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { buildDocumentText, type QuoteDocumentModel } from "./model";

/** Build the quotation PDF in the browser and save it as Q-2026-0005.pdf. */
export function useDownloadQuotePdf() {
  const { t } = useTranslation(["quotes", "common"]);
  const [pending, setPending] = useState(false);

  const download = useCallback(
    async (model: QuoteDocumentModel) => {
      setPending(true);
      const fileName = `${model.number ?? t("quotes:pdf.draftFile")}.pdf`;
      try {
        const { renderQuotePdf } = await import("./pdf/QuotePdf");
        const blob = await renderQuotePdf(buildDocumentText(t, model));
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
        toast.success(t("quotes:pdf.downloaded", { file: fileName }));
      } catch (error) {
        console.error("[quotes] PDF generation failed", error);
        toast.error(t("quotes:pdf.failed"));
      } finally {
        setPending(false);
      }
    },
    [t],
  );

  return { download, pending };
}
