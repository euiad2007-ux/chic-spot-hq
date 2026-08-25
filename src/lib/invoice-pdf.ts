import { supabase } from "@/integrations/supabase/client";

/**
 * Turns the rendered invoice DOM node into a PDF (thermal roll or A4) and
 * uploads it to the private `invoices` bucket, returning a long-lived signed
 * URL that can be emailed or sent over WhatsApp.
 *
 * The receipt is rasterised first so Arabic shaping stays perfect in the PDF.
 */
export interface BuiltInvoicePdf {
  blob: Blob;
  fileName: string;
}

export async function buildInvoicePdf(
  node: HTMLElement,
  opts: { number: string; paper: "thermal" | "a4"; thermalWidthMm?: number },
): Promise<BuiltInvoicePdf> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const canvas = await html2canvas(node, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    logging: false,
  });
  const img = canvas.toDataURL("image/jpeg", 0.94);

  let pdf: import("jspdf").jsPDF;
  if (opts.paper === "a4") {
    pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageW = 210;
    const margin = 12;
    const w = pageW - margin * 2;
    const h = (canvas.height / canvas.width) * w;
    pdf.addImage(img, "JPEG", margin, margin, w, Math.min(h, 297 - margin * 2));
  } else {
    const w = opts.thermalWidthMm ?? 80;
    const h = (canvas.height / canvas.width) * w;
    pdf = new jsPDF({ unit: "mm", format: [w, h], orientation: "portrait" });
    pdf.addImage(img, "JPEG", 0, 0, w, h);
  }

  const safe = opts.number.replace(/[^\w-]+/g, "-");
  return { blob: pdf.output("blob"), fileName: `invoice-${safe}.pdf` };
}

/** Triggers a local download of the generated PDF. */
export function downloadPdf({ blob, fileName }: BuiltInvoicePdf) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Uploads the PDF and returns a signed URL valid for 30 days. */
export async function uploadInvoicePdf(
  salonId: string,
  { blob, fileName }: BuiltInvoicePdf,
): Promise<string> {
  const path = `${salonId}/${Date.now()}-${fileName}`;
  const up = await supabase.storage.from("invoices").upload(path, blob, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (up.error) throw new Error(up.error.message);
  const signed = await supabase.storage.from("invoices").createSignedUrl(path, 60 * 60 * 24 * 30);
  if (signed.error || !signed.data?.signedUrl) throw new Error(signed.error?.message ?? "تعذر إنشاء رابط الفاتورة");
  return signed.data.signedUrl;
}
