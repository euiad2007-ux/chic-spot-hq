import { useSalon, formatSAR, type Invoice } from "@/lib/salon-store";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { X, Printer, Download, Sparkles } from "lucide-react";
import { useEffect } from "react";

const METHOD_LABEL = {
  cash: "نقدي", mada: "مدى", card: "بطاقة", apple_pay: "Apple Pay", transfer: "تحويل",
} as const;

interface Props {
  invoice: Invoice;
  onClose: () => void;
}

export function InvoiceReceipt({ invoice, onClose }: Props) {
  const { customers, bookings, services, staff } = useSalon((s) => s);
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

  // ZATCA-style QR payload (simplified)
  const qrPayload = [
    `Seller: Lamsa Salon`,
    `VAT: 300000000000003`,
    `Date: ${d.toISOString()}`,
    `Total: ${invoice.total.toFixed(2)}`,
    `VAT Amount: ${invoice.vat.toFixed(2)}`,
    `Invoice: ${invoice.number}`,
  ].join("\n");

  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm grid place-items-center p-4 print:bg-white print:p-0 print:static">
      <div className="w-full max-w-md max-h-[95vh] overflow-y-auto print:max-h-none print:overflow-visible print:max-w-none">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3 print:hidden">
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:brightness-110">
              <Printer className="size-4" /> طباعة
            </button>
            <button onClick={handlePrint} className="px-3 py-2 rounded-xl glass-card text-sm font-semibold flex items-center gap-2 hover:bg-muted/30">
              <Download className="size-4" /> PDF
            </button>
          </div>
          <button onClick={onClose} className="size-10 rounded-xl glass-card grid place-items-center hover:bg-muted/30">
            <X className="size-5" />
          </button>
        </div>

        {/* Receipt */}
        <div className="receipt bg-white text-neutral-900 rounded-2xl overflow-hidden shadow-2xl print:rounded-none print:shadow-none">
          {/* Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#1E1533] via-[#2a1d4a] to-[#0F0B1F] text-white p-6 pb-8">
            <div className="absolute -top-8 -right-8 size-32 rounded-full bg-[#A78BFA]/20 blur-2xl" />
            <div className="absolute -bottom-8 -left-8 size-32 rounded-full bg-[#F0ABFC]/20 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="size-5 text-[#F0ABFC]" />
                  <div className="text-xl font-black tracking-tight">لمسة</div>
                </div>
                <div className="text-xs text-white/70">صالون التجميل الملكي</div>
              </div>
              <div className="text-left">
                <div className="text-[10px] text-white/60 uppercase tracking-widest">فاتورة ضريبية</div>
                <div className="text-sm font-mono font-bold text-[#F0ABFC]">{invoice.number}</div>
              </div>
            </div>
          </div>

          {/* Zig-zag edge */}
          <div className="relative -mt-3 h-3 bg-white"
            style={{
              WebkitMaskImage: "radial-gradient(circle 6px at 6px 0, transparent 98%, black 100%)",
              maskImage: "radial-gradient(circle 6px at 6px 0, transparent 98%, black 100%)",
              WebkitMaskSize: "12px 12px",
              maskSize: "12px 12px",
              backgroundColor: "#1E1533",
            }}
          />

          <div className="p-6 space-y-5">
            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-neutral-500 mb-0.5">التاريخ</div>
                <div className="font-semibold">{dateStr}</div>
              </div>
              <div className="text-left">
                <div className="text-neutral-500 mb-0.5">الوقت</div>
                <div className="font-semibold">{timeStr}</div>
              </div>
              <div>
                <div className="text-neutral-500 mb-0.5">العميلة</div>
                <div className="font-semibold">{customer?.name}</div>
                <div className="text-neutral-500 font-mono text-[11px]">{customer?.phone}</div>
              </div>
              <div className="text-left">
                <div className="text-neutral-500 mb-0.5">الأخصائية</div>
                <div className="font-semibold">{bookingStaff?.name ?? "—"}</div>
                <div className="text-neutral-500 font-mono text-[11px]">{booking?.code}</div>
              </div>
            </div>

            <div className="border-t border-dashed border-neutral-300" />

            {/* Services */}
            <div>
              <div className="flex justify-between text-[11px] text-neutral-500 uppercase tracking-widest mb-2">
                <span>الخدمة</span>
                <span>السعر</span>
              </div>
              <div className="space-y-2">
                {bookingServices.map((s) => (
                  <div key={s.id} className="flex justify-between items-baseline text-sm">
                    <div>
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-[11px] text-neutral-500">{s.durationMin} دقيقة · {s.category}</div>
                    </div>
                    <div className="font-mono font-semibold">{formatSAR(s.price)}</div>
                  </div>
                ))}
                {bookingServices.length === 0 && (
                  <div className="flex justify-between text-sm">
                    <div className="font-semibold">خدمة</div>
                    <div className="font-mono font-semibold">{formatSAR(invoice.subtotal)}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-dashed border-neutral-300" />

            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <Row label="المجموع الفرعي" value={formatSAR(invoice.subtotal)} />
              {invoice.discount > 0 && (
                <Row label="الخصم" value={`- ${formatSAR(invoice.discount)}`} tone="text-emerald-600" />
              )}
              <Row label="ضريبة القيمة المضافة (15%)" value={formatSAR(invoice.vat)} tone="text-neutral-500" />
              <div className="flex justify-between items-center mt-2 pt-3 border-t-2 border-double border-neutral-900">
                <span className="text-sm font-bold">الإجمالي المستحق</span>
                <span className="text-2xl font-black bg-gradient-to-r from-[#7c3aed] to-[#d946ef] bg-clip-text text-transparent">
                  {formatSAR(invoice.total)}
                </span>
              </div>
              <div className="flex justify-between text-xs pt-1">
                <span className="text-neutral-500">طريقة الدفع</span>
                <span className="font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {METHOD_LABEL[invoice.method]} · مدفوع
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-neutral-300" />

            {/* Barcode + QR */}
            <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
              <div className="min-w-0 overflow-hidden">
                <Barcode
                  value={invoice.number}
                  format="CODE128"
                  height={54}
                  width={1.4}
                  fontSize={12}
                  margin={0}
                  displayValue
                  background="#ffffff"
                  lineColor="#0F0B1F"
                />
              </div>
              <div className="p-1.5 bg-white border border-neutral-200 rounded-lg">
                <QRCodeSVG value={qrPayload} size={72} bgColor="#ffffff" fgColor="#0F0B1F" level="M" />
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-2">
              <div className="text-[11px] text-neutral-500">الرقم الضريبي: 300000000000003</div>
              <div className="text-xs font-semibold mt-2">شكراً لزيارتك ✦ نراك قريباً</div>
              <div className="text-[10px] text-neutral-400 mt-1">lamsa.sa · 8001111222</div>
            </div>
          </div>

          {/* bottom zigzag */}
          <div className="h-3 bg-white"
            style={{
              WebkitMaskImage: "radial-gradient(circle 6px at 6px 12px, transparent 98%, black 100%)",
              maskImage: "radial-gradient(circle 6px at 6px 12px, transparent 98%, black 100%)",
              WebkitMaskSize: "12px 12px",
              backgroundColor: "#ffffff",
              borderTop: "1px dashed #d4d4d4",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-600">{label}</span>
      <span className={`font-mono font-semibold ${tone ?? ""}`}>{value}</span>
    </div>
  );
}
