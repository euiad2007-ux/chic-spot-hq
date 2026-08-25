import { useSalon, formatSAR, type Invoice } from "@/lib/salon-store";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { X, Printer, Download, Mail, MessageCircle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useSiteSettings, waLink } from "@/lib/site-settings";
import { useInvoiceSettings, fillInvoiceTemplate } from "@/lib/invoice-settings";
import { buildInvoicePdf, downloadPdf, uploadInvoicePdf } from "@/lib/invoice-pdf";
import { sendInvoiceEmail } from "@/lib/invoice-mail.functions";
import { getDataContext } from "@/lib/db/context";

const METHOD_LABEL = {
  cash: "نقدي", mada: "مدى", card: "بطاقة", apple_pay: "Apple Pay", transfer: "تحويل",
} as const;

interface Props {
  invoice: Invoice;
  onClose: () => void;
}

export function InvoiceReceipt({ invoice, onClose }: Props) {
  const { customers, bookings, services, staff } = useSalon((s) => s);
  const site = useSiteSettings();
  const cfg = useInvoiceSettings();
  const paperRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<null | "pdf" | "email" | "wa">(null);
  const autoSent = useRef(false);

  const customer = customers.find((c) => c.id === invoice.customerId);
  const booking = bookings.find((b) => b.id === invoice.bookingId);
  const bookingServices = booking ? services.filter((s) => booking.serviceIds.includes(s.id)) : [];
  const bookingStaff = booking ? staff.find((s) => s.id === booking.staffId) : null;

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const d = new Date(invoice.createdAt);
  const dateStr = new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "long", day: "numeric" }).format(d);
  const timeStr = new Intl.DateTimeFormat("ar-SA", { hour: "2-digit", minute: "2-digit" }).format(d);

  const qrPayload = [
    `Seller: ${site.salonName}`,
    `VAT: ${cfg.vatNumber}`,
    `Date: ${d.toISOString()}`,
    `Total: ${invoice.total.toFixed(2)}`,
    `VAT Amount: ${invoice.vat.toFixed(2)}`,
    `Invoice: ${invoice.number}`,
  ].join("\n");

  const thermal = cfg.paper === "thermal";

  const vars = {
    salon: site.salonName,
    branch: site.branchName,
    customer: customer?.name ?? "عميلتنا",
    number: invoice.number,
    total: formatSAR(invoice.total),
    date: dateStr,
    time: timeStr,
  };

  async function makePdf() {
    const node = paperRef.current;
    if (!node) throw new Error("تعذر تجهيز الفاتورة");
    return buildInvoicePdf(node, {
      number: invoice.number,
      paper: cfg.paper,
      thermalWidthMm: cfg.thermalWidthMm,
    });
  }

  const handleDownload = async () => {
    setBusy("pdf");
    try {
      downloadPdf(await makePdf());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر إنشاء ملف PDF");
    } finally {
      setBusy(null);
    }
  };

  const handleEmail = async (silent = false) => {
    if (!customer?.email) {
      if (!silent) toast.error("لا يوجد بريد إلكتروني مسجّل للعميلة");
      return;
    }
    setBusy("email");
    try {
      const salonId = getDataContext()?.salonId;
      const pdf = await makePdf();
      const pdfUrl = salonId ? await uploadInvoicePdf(salonId, pdf) : "";
      const res = await sendInvoiceEmail({
        data: {
          to: customer.email,
          salonName: site.salonName,
          branchName: cfg.showBranch ? site.branchName : "",
          logoUrl: cfg.showLogo ? site.logoUrl : "",
          customerName: customer.name,
          invoiceNumber: invoice.number,
          dateTime: `${dateStr} · ${timeStr}`,
          staffName: cfg.showStaff ? (bookingStaff?.name ?? "") : "",
          total: formatSAR(invoice.total),
          vat: formatSAR(invoice.vat),
          pdfUrl,
          footerNote: cfg.footerNote,
        },
      });
      if (res.ok) toast.success("تم إرسال الفاتورة إلى بريد العميلة");
      else if (!silent) toast.error(`تعذر إرسال البريد: ${res.reason}`);
    } catch (e) {
      if (!silent) toast.error(e instanceof Error ? e.message : "تعذر إرسال البريد");
    } finally {
      setBusy(null);
    }
  };

  const handleWhatsapp = async () => {
    if (!customer?.phone) {
      toast.error("لا يوجد رقم جوال مسجّل للعميلة");
      return;
    }
    setBusy("wa");
    try {
      const salonId = getDataContext()?.salonId;
      let pdfUrl = "";
      try {
        const pdf = await makePdf();
        pdfUrl = salonId ? await uploadInvoicePdf(salonId, pdf) : "";
      } catch {
        pdfUrl = "";
      }
      const msg = fillInvoiceTemplate(cfg.waTemplate, { ...vars, pdf: pdfUrl });
      window.open(waLink(customer.phone, msg), "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر إرسال الواتساب");
    } finally {
      setBusy(null);
    }
  };

  // Automatic email delivery once per opened receipt.
  useEffect(() => {
    if (autoSent.current || !cfg.autoEmail || !customer?.email) return;
    autoSent.current = true;
    const t = setTimeout(() => void handleEmail(true), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.autoEmail, customer?.email, invoice.id]);

  const items = bookingServices.length
    ? bookingServices.map((s) => ({ id: s.id, name: s.name, meta: `${s.durationMin} دقيقة · ${s.category}`, price: s.price }))
    : [{ id: "x", name: "خدمة", meta: "", price: invoice.subtotal }];

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm overflow-y-auto p-4 print:bg-white print:p-0 print:static print:overflow-visible">
      <div
        className={
          "mx-auto " +
          (thermal ? "max-w-sm" : "max-w-3xl") +
          " print:max-w-none"
        }
      >
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 print:hidden">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2"
            >
              <Printer className="size-4" /> طباعة {thermal ? "حرارية" : "A4"}
            </button>
            <button
              onClick={handleDownload}
              disabled={busy !== null}
              className="px-3 py-2 rounded-xl glass-card text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {busy === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} PDF
            </button>
            <button
              onClick={() => void handleEmail()}
              disabled={busy !== null}
              className="px-3 py-2 rounded-xl glass-card text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {busy === "email" ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} إيميل
            </button>
            <button
              onClick={() => void handleWhatsapp()}
              disabled={busy !== null}
              className="px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              {busy === "wa" ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />} واتساب
            </button>
          </div>
          <button onClick={onClose} className="size-10 rounded-xl glass-card grid place-items-center">
            <X className="size-5" />
          </button>
        </div>

        {/* Paper */}
        <div
          ref={paperRef}
          className={
            "receipt bg-white text-neutral-900 mx-auto shadow-2xl print:shadow-none " +
            (thermal ? "rounded-2xl p-4 text-[12px]" : "rounded-2xl p-8 text-sm")
          }
          style={thermal ? { width: cfg.thermalWidthMm === 58 ? 300 : 384 } : undefined}
        >
          {/* Header: logo + salon + branch */}
          <div className={thermal ? "text-center space-y-1" : "flex items-start justify-between gap-6"}>
            <div className={thermal ? "space-y-1" : "space-y-1"}>
              {cfg.showLogo && site.logoUrl && (
                <img
                  src={site.logoUrl}
                  alt={site.salonName}
                  className={thermal ? "h-14 mx-auto object-contain" : "h-16 object-contain"}
                />
              )}
              {cfg.showSalonName && <div className={thermal ? "text-base font-black" : "text-2xl font-black"}>{site.salonName}</div>}
              {cfg.showBranch && site.branchName && (
                <div className="text-neutral-500 text-xs">فرع: {site.branchName}</div>
              )}
              {site.phone && <div className="text-neutral-500 text-[11px] font-mono">{site.phone}</div>}
            </div>
            <div className={thermal ? "pt-1" : "text-left"}>
              <div className="text-[10px] uppercase tracking-widest text-neutral-500">{cfg.invoiceTitle}</div>
              <div className="font-mono font-bold">{invoice.number}</div>
              {cfg.showDateTime && (
                <div className="text-[11px] text-neutral-500 mt-1">
                  {dateStr} · {timeStr}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-dashed border-neutral-300 my-3" />

          {/* Meta */}
          <div className={thermal ? "space-y-1 text-[11px]" : "grid grid-cols-3 gap-4 text-xs"}>
            {cfg.showCustomer && (
              <div>
                <div className="text-neutral-500">العميلة</div>
                <div className="font-semibold">{customer?.name ?? "—"}</div>
                <div className="text-neutral-500 font-mono">{customer?.phone ?? ""}</div>
              </div>
            )}
            {cfg.showStaff && (
              <div>
                <div className="text-neutral-500">الموظف</div>
                <div className="font-semibold">{bookingStaff?.name ?? "—"}</div>
              </div>
            )}
            <div>
              <div className="text-neutral-500">رقم الحجز</div>
              <div className="font-mono font-semibold">{booking?.code ?? "—"}</div>
            </div>
          </div>

          <div className="border-t border-dashed border-neutral-300 my-3" />

          {/* Items */}
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-neutral-500">
                <th className="text-right pb-2">الخدمة</th>
                <th className="text-left pb-2">السعر</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="align-baseline">
                  <td className="py-1">
                    <div className="font-semibold">{it.name}</div>
                    {it.meta && <div className="text-[10px] text-neutral-500">{it.meta}</div>}
                  </td>
                  <td className="py-1 text-left font-mono font-semibold">{formatSAR(it.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-dashed border-neutral-300 my-3" />

          {/* Totals */}
          <div className="space-y-1">
            <Row label="المجموع الفرعي" value={formatSAR(invoice.subtotal)} />
            {invoice.discount > 0 && <Row label="الخصم" value={`- ${formatSAR(invoice.discount)}`} tone="text-emerald-600" />}
            {cfg.showVatBreakdown && (
              <Row label="ضريبة القيمة المضافة (15%)" value={formatSAR(invoice.vat)} tone="text-neutral-500" />
            )}
            <div className="flex justify-between items-center mt-2 pt-2 border-t-2 border-double border-neutral-900">
              <span className="font-bold">الإجمالي المستحق</span>
              <span className={thermal ? "text-lg font-black" : "text-2xl font-black"}>{formatSAR(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-xs pt-1">
              <span className="text-neutral-500">طريقة الدفع</span>
              <span className="font-semibold">{METHOD_LABEL[invoice.method]} · مدفوع</span>
            </div>
          </div>

          {(cfg.showBarcode || cfg.showQr) && <div className="border-t border-dashed border-neutral-300 my-3" />}

          {/* Barcode + QR */}
          <div className={thermal ? "flex flex-col items-center gap-2" : "grid grid-cols-[1fr_auto] gap-6 items-center"}>
            {cfg.showBarcode && (
              <div className="min-w-0 overflow-hidden">
                <Barcode
                  value={invoice.number}
                  format="CODE128"
                  height={thermal ? 40 : 54}
                  width={1.3}
                  fontSize={11}
                  margin={0}
                  displayValue
                  background="#ffffff"
                  lineColor="#111111"
                />
              </div>
            )}
            {cfg.showQr && (
              <div className="p-1.5 bg-white border border-neutral-200 rounded-lg">
                <QRCodeSVG value={qrPayload} size={thermal ? 88 : 104} bgColor="#ffffff" fgColor="#111111" level="M" />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center pt-3">
            {cfg.vatNumber && <div className="text-[10px] text-neutral-500">الرقم الضريبي: {cfg.vatNumber}</div>}
            {cfg.crNumber && <div className="text-[10px] text-neutral-500">السجل التجاري: {cfg.crNumber}</div>}
            <div className="text-xs font-semibold mt-1">{cfg.footerNote}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between">
      <span className={tone ?? "text-neutral-600"}>{label}</span>
      <span className={"font-mono font-semibold " + (tone ?? "")}>{value}</span>
    </div>
  );
}
