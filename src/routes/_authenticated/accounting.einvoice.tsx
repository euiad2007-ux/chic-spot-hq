import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { FileCode2, ShieldCheck, ShieldAlert, Download, Printer } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { AccountingNav } from "@/components/salon/accounting-nav";
import { useAccount } from "@/hooks/use-account";
import { formatSAR } from "@/lib/salon-store";
import { loadEInvoices, loadSeller, type EInvoiceRow } from "@/lib/db/einvoice-repo";
import { checkCompliance, ublInvoiceXml, zatcaQrPayload } from "@/lib/einvoice";
import { exportCsv, exportJson, exportText, printReport, stampName } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/accounting/einvoice")({
  head: () => ({
    meta: [
      { title: "الفواتير الإلكترونية — تكامل فاتورة ZATCA | Salon Flow" },
      {
        name: "description",
        content:
          "توليد الفواتير الإلكترونية بصيغة UBL 2.1 ورمز QR بترميز TLV حسب متطلبات هيئة الزكاة والضريبة، مع فحص الالتزام وتصدير الأرشيف.",
      },
      { property: "og:title", content: "الفواتير الإلكترونية — Salon Flow" },
      { property: "og:description", content: "تكامل الفواتير الإلكترونية ZATCA وتصدير UBL XML." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EInvoicePage,
});

const monthStart = () => new Date().toISOString().slice(0, 8) + "01";
const today = () => new Date().toISOString().slice(0, 10);

function EInvoicePage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [selected, setSelected] = useState<EInvoiceRow | null>(null);

  const seller = useQuery({
    queryKey: ["einvoice-seller", salonId],
    queryFn: () => loadSeller(salonId!),
    enabled: !!salonId,
  });

  const list = useQuery({
    queryKey: ["einvoices", salonId, from, to, seller.data?.vatRate],
    queryFn: () => loadEInvoices(salonId!, from, to, seller.data?.vatRate ?? 15),
    enabled: !!salonId && !!seller.data,
  });

  const rows = list.data ?? [];
  const sellerInfo = seller.data ?? { name: "", vatNumber: "", vatRate: 15 };

  const audit = useMemo(
    () => rows.map((r) => ({ row: r, issues: checkCompliance(sellerInfo, r) })),
    [rows, sellerInfo],
  );
  const compliant = audit.filter((a) => a.issues.length === 0).length;
  const totals = rows.reduce(
    (a, r) => ({ total: a.total + r.total, vat: a.vat + r.vat }),
    { total: 0, vat: 0 },
  );

  const active = selected ?? rows[0] ?? null;
  const activeQr = active ? zatcaQrPayload(sellerInfo, active) : "";
  const activeIssues = active ? checkCompliance(sellerInfo, active) : [];

  return (
    <AppShell
      title="الفواتير الإلكترونية"
      subtitle="تكامل فاتورة ZATCA — رمز QR بترميز TLV وملف UBL 2.1 لكل فاتورة"
    >
      <div className="space-y-4">
        <AccountingNav />

        <section className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-end gap-3 print:hidden">
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">من</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
          </label>
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">إلى</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
          </label>
          <div className="ms-auto flex flex-wrap gap-2">
            <button
              onClick={() =>
                exportCsv(
                  stampName("einvoices"),
                  ["رقم الفاتورة", "التاريخ", "العميل", "قبل الضريبة", "الخصم", "الضريبة", "الإجمالي", "الحالة", "متوافقة"],
                  audit.map((a) => [
                    a.row.number,
                    a.row.issuedAt.slice(0, 10),
                    a.row.customerName ?? "",
                    a.row.subtotal,
                    a.row.discount,
                    a.row.vat,
                    a.row.total,
                    a.row.status,
                    a.issues.length === 0 ? "نعم" : a.issues.map((i) => i.field).join(" | "),
                  ]),
                )
              }
              className="h-10 px-3 rounded-xl border border-border font-bold text-sm inline-flex items-center gap-2"
            >
              <Download className="size-4" /> تصدير CSV
            </button>
            <button
              onClick={() =>
                exportJson(
                  stampName("einvoice-archive", "json"),
                  rows.map((r) => ({
                    number: r.number,
                    uuid: r.uuid,
                    issuedAt: r.issuedAt,
                    total: r.total,
                    vat: r.vat,
                    qr: zatcaQrPayload(sellerInfo, r),
                    xml: ublInvoiceXml(sellerInfo, r),
                  })),
                )
              }
              className="h-10 px-3 rounded-xl border border-border font-bold text-sm inline-flex items-center gap-2"
            >
              <FileCode2 className="size-4" /> أرشيف الفترة (JSON)
            </button>
            <button
              onClick={printReport}
              className="h-10 px-3 rounded-xl border border-border font-bold text-sm inline-flex items-center gap-2"
            >
              <Printer className="size-4" /> طباعة / PDF
            </button>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-4">
          <Kpi label="عدد الفواتير" value={String(rows.length)} />
          <Kpi label="إجمالي المبيعات" value={formatSAR(totals.total)} />
          <Kpi label="ضريبة المخرجات" value={formatSAR(totals.vat)} />
          <Kpi
            label="فواتير متوافقة"
            value={`${compliant} / ${rows.length}`}
            tone={rows.length > 0 && compliant === rows.length ? "ok" : "warn"}
          />
        </div>

        {!sellerInfo.vatNumber && (
          <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-bold text-destructive">
            لم يتم إدخال الرقم الضريبي للمنشأة — أضفه من صفحة الضرائب والإقرارات قبل إصدار فواتير إلكترونية.
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl border border-border bg-card overflow-x-auto">
            <h2 className="p-4 font-bold">فواتير الفترة</h2>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 text-right">رقم الفاتورة</th>
                  <th className="p-3 text-right">التاريخ</th>
                  <th className="p-3 text-right">العميل</th>
                  <th className="p-3 text-right">الضريبة</th>
                  <th className="p-3 text-right">الإجمالي</th>
                  <th className="p-3 text-right">الالتزام</th>
                  <th className="p-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr
                    key={a.row.id}
                    onClick={() => setSelected(a.row)}
                    className={
                      active?.id === a.row.id
                        ? "border-t border-border bg-primary/5 cursor-pointer"
                        : "border-t border-border cursor-pointer hover:bg-muted/30"
                    }
                  >
                    <td className="p-3 font-mono text-xs text-primary">{a.row.number}</td>
                    <td className="p-3 text-xs">{a.row.issuedAt.slice(0, 10)}</td>
                    <td className="p-3 font-semibold">{a.row.customerName ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{formatSAR(a.row.vat)}</td>
                    <td className="p-3 font-bold">{formatSAR(a.row.total)}</td>
                    <td className="p-3">
                      {a.issues.length === 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/15 text-success px-2 py-1 text-[11px] font-bold">
                          <ShieldCheck className="size-3" /> متوافقة
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 text-destructive px-2 py-1 text-[11px] font-bold">
                          <ShieldAlert className="size-3" /> {a.issues.length} ملاحظة
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportText(
                            `${a.row.number.replace(/\W+/g, "-")}.xml`,
                            ublInvoiceXml(sellerInfo, a.row),
                          );
                        }}
                        className="h-8 px-2 rounded-lg border border-border text-xs font-bold"
                      >
                        XML
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      لا توجد فواتير في هذه الفترة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <h2 className="font-bold">تفاصيل الفاتورة الإلكترونية</h2>
            {!active && <p className="text-sm text-muted-foreground">اختر فاتورة لعرض رمز QR وملف UBL.</p>}
            {active && (
              <>
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-white p-2">
                    <QRCodeSVG value={activeQr} size={112} />
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="font-mono text-primary">{active.number}</div>
                    <div className="text-muted-foreground text-xs">{sellerInfo.name || "—"}</div>
                    <div className="text-muted-foreground text-xs font-mono">
                      الرقم الضريبي: {sellerInfo.vatNumber || "—"}
                    </div>
                    <div className="font-bold">{formatSAR(active.total)}</div>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/40 p-3 text-[11px] font-mono break-all">{activeQr}</div>

                {activeIssues.length > 0 && (
                  <ul className="space-y-1 text-xs text-destructive">
                    {activeIssues.map((i) => (
                      <li key={i.field}>• {i.field}: {i.message}</li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-wrap gap-2 print:hidden">
                  <button
                    onClick={() =>
                      exportText(
                        `${active.number.replace(/\W+/g, "-")}.xml`,
                        ublInvoiceXml(sellerInfo, active),
                      )
                    }
                    className="h-10 px-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm inline-flex items-center gap-2"
                  >
                    <Download className="size-4" /> تنزيل UBL 2.1
                  </button>
                  <button
                    onClick={() => navigator.clipboard?.writeText(activeQr)}
                    className="h-10 px-3 rounded-xl border border-border font-bold text-sm"
                  >
                    نسخ رمز QR
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  const color = tone === "ok" ? "text-success" : tone === "warn" ? "text-destructive" : "";
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-black ${color}`}>{value}</div>
    </div>
  );
}
