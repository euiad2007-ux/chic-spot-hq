import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Receipt, FileText, Save, RotateCcw, Loader2, Mail, MessageCircle } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import {
  useInvoiceSettings,
  invoiceSettingsActions,
  type InvoiceSettings,
} from "@/lib/invoice-settings";
import { useSiteSettings } from "@/lib/site-settings";

export const Route = createFileRoute("/_authenticated/invoice-settings")({
  head: () => ({
    meta: [
      { title: "ضبط الفواتير — Chic Spot" },
      { name: "description", content: "اختيار نوع الفاتورة الحرارية أو A4 وتخصيص بياناتها وإرسالها للعميلة تلقائياً بالبريد والواتساب." },
      { property: "og:title", content: "ضبط الفواتير — Chic Spot" },
      { property: "og:description", content: "تحكم كامل في شكل الفاتورة ومحتواها وطرق إرسالها للعميلات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvoiceSettingsPage,
});

function InvoiceSettingsPage() {
  const cfg = useInvoiceSettings();
  const site = useSiteSettings();
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof InvoiceSettings>(k: K, v: InvoiceSettings[K]) =>
    invoiceSettingsActions.update({ [k]: v } as Partial<InvoiceSettings>);

  const save = async () => {
    setSaving(true);
    try {
      await invoiceSettingsActions.saveNow();
      toast.success("تم حفظ إعدادات الفواتير");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="ضبط الفواتير"
      subtitle="نوع الورق، محتوى الفاتورة، والإرسال الآلي للعميلة"
      action={
        <div className="flex gap-2">
          <button
            onClick={() => {
              invoiceSettingsActions.reset();
              toast.info("تم استرجاع الإعدادات الافتراضية");
            }}
            className="px-3 py-2 rounded-xl glass-card text-sm font-semibold flex items-center gap-2"
          >
            <RotateCcw className="size-4" /> افتراضي
          </button>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} حفظ التغييرات
          </button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Paper */}
          <Card title="نوع الفاتورة">
            <div className="grid sm:grid-cols-2 gap-3">
              <PaperOption
                active={cfg.paper === "thermal"}
                onClick={() => set("paper", "thermal")}
                icon={<Receipt className="size-5" />}
                title="فاتورة حرارية"
                desc="طابعات الكاشير 58 أو 80 ملم"
              />
              <PaperOption
                active={cfg.paper === "a4"}
                onClick={() => set("paper", "a4")}
                icon={<FileText className="size-5" />}
                title="فاتورة عادية A4"
                desc="فاتورة ضريبية كاملة للطباعة والأرشفة"
              />
            </div>
            {cfg.paper === "thermal" && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">عرض الورق</span>
                {[58, 80].map((w) => (
                  <button
                    key={w}
                    onClick={() => set("thermalWidthMm", w as 58 | 80)}
                    className={
                      "px-3 py-1.5 rounded-lg text-sm font-semibold border " +
                      (cfg.thermalWidthMm === w
                        ? "bg-primary text-primary-foreground border-transparent"
                        : "glass-card border-border/60")
                    }
                  >
                    {w} ملم
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Content */}
          <Card title="محتوى الفاتورة">
            <div className="grid sm:grid-cols-2 gap-2">
              <Toggle label="الشعار" value={cfg.showLogo} onChange={(v) => set("showLogo", v)} />
              <Toggle label="اسم الصالون" value={cfg.showSalonName} onChange={(v) => set("showSalonName", v)} />
              <Toggle label="اسم الفرع" value={cfg.showBranch} onChange={(v) => set("showBranch", v)} />
              <Toggle label="التاريخ والوقت" value={cfg.showDateTime} onChange={(v) => set("showDateTime", v)} />
              <Toggle label="اسم الموظف" value={cfg.showStaff} onChange={(v) => set("showStaff", v)} />
              <Toggle label="بيانات العميلة" value={cfg.showCustomer} onChange={(v) => set("showCustomer", v)} />
              <Toggle label="رمز QR (ZATCA)" value={cfg.showQr} onChange={(v) => set("showQr", v)} />
              <Toggle label="الباركود" value={cfg.showBarcode} onChange={(v) => set("showBarcode", v)} />
              <Toggle label="تفصيل ضريبة القيمة المضافة" value={cfg.showVatBreakdown} onChange={(v) => set("showVatBreakdown", v)} />
            </div>
          </Card>

          {/* Identity */}
          <Card title="بيانات المنشأة على الفاتورة">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="الرقم الضريبي" value={cfg.vatNumber} onChange={(v) => set("vatNumber", v)} />
              <Field label="السجل التجاري" value={cfg.crNumber} onChange={(v) => set("crNumber", v)} />
              <Field label="عنوان الفاتورة" value={cfg.invoiceTitle} onChange={(v) => set("invoiceTitle", v)} />
              <Field label="ملاحظة أسفل الفاتورة" value={cfg.footerNote} onChange={(v) => set("footerNote", v)} />
            </div>
          </Card>

          {/* Delivery */}
          <Card title="الإرسال الآلي للعميلة">
            <div className="space-y-3">
              <Toggle
                label="إرسال الفاتورة PDF تلقائياً إلى البريد الإلكتروني"
                icon={<Mail className="size-4" />}
                value={cfg.autoEmail}
                onChange={(v) => set("autoEmail", v)}
              />
              <Toggle
                label="تجهيز رسالة واتساب بالفاتورة عند إتمام الدفع"
                icon={<MessageCircle className="size-4" />}
                value={cfg.autoWhatsapp}
                onChange={(v) => set("autoWhatsapp", v)}
              />
              <Field label="عنوان رسالة البريد" value={cfg.emailSubject} onChange={(v) => set("emailSubject", v)} />
              <div>
                <label className="text-xs text-muted-foreground">نص رسالة الواتساب</label>
                <textarea
                  value={cfg.waTemplate}
                  onChange={(e) => set("waTemplate", e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-xl glass-card px-3 py-2 text-sm bg-transparent outline-none"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  المتغيرات المتاحة: {"{customer}"} {"{salon}"} {"{branch}"} {"{number}"} {"{total}"} {"{date}"} {"{time}"} {"{pdf}"}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-6 h-fit">
          <Card title="معاينة سريعة">
            <div
              className="bg-white text-neutral-900 rounded-xl p-4 mx-auto text-[12px]"
              style={{ width: cfg.paper === "thermal" ? (cfg.thermalWidthMm === 58 ? 260 : 300) : "100%" }}
            >
              <div className="text-center space-y-1">
                {cfg.showLogo && site.logoUrl && (
                  <img src={site.logoUrl} alt={site.salonName} className="h-12 mx-auto object-contain" />
                )}
                {cfg.showSalonName && <div className="font-black">{site.salonName}</div>}
                {cfg.showBranch && site.branchName && (
                  <div className="text-neutral-500 text-[11px]">فرع: {site.branchName}</div>
                )}
                <div className="text-[10px] tracking-widest text-neutral-500">{cfg.invoiceTitle}</div>
              </div>
              <div className="border-t border-dashed border-neutral-300 my-2" />
              <div className="space-y-0.5 text-[11px]">
                <div className="flex justify-between"><span>رقم الفاتورة</span><span className="font-mono">INV-1024</span></div>
                {cfg.showDateTime && <div className="flex justify-between"><span>التاريخ</span><span>اليوم · 14:30</span></div>}
                {cfg.showCustomer && <div className="flex justify-between"><span>العميلة</span><span>سارة</span></div>}
                {cfg.showStaff && <div className="flex justify-between"><span>الموظف</span><span>نورة</span></div>}
              </div>
              <div className="border-t border-dashed border-neutral-300 my-2" />
              <div className="flex justify-between"><span>صبغة شعر</span><span className="font-mono">300.00</span></div>
              {cfg.showVatBreakdown && (
                <div className="flex justify-between text-neutral-500 text-[11px] mt-1"><span>ض.ق.م 15%</span><span className="font-mono">45.00</span></div>
              )}
              <div className="flex justify-between font-black mt-1 pt-1 border-t border-neutral-900">
                <span>الإجمالي</span><span className="font-mono">345.00</span>
              </div>
              {(cfg.showQr || cfg.showBarcode) && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  {cfg.showBarcode && <div className="h-8 w-24 bg-[repeating-linear-gradient(90deg,#111_0_2px,#fff_2px_4px)]" />}
                  {cfg.showQr && <div className="size-12 bg-[conic-gradient(#111_0_25%,#fff_0_50%,#111_0_75%,#fff_0)] bg-[length:8px_8px]" />}
                </div>
              )}
              <div className="text-center text-[10px] text-neutral-500 mt-2">{cfg.footerNote}</div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-2xl p-5">
      <h2 className="font-bold mb-4">{title}</h2>
      {children}
    </section>
  );
}

function PaperOption({
  active, onClick, icon, title, desc,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={
        "text-right rounded-2xl p-4 border transition " +
        (active ? "border-primary bg-primary/10" : "border-border/60 glass-card hover:border-primary/40")
      }
    >
      <div className="flex items-center gap-2 font-bold">{icon}{title}</div>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </button>
  );
}

function Toggle({
  label, value, onChange, icon,
}: { label: string; value: boolean; onChange: (v: boolean) => void; icon?: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 glass-card cursor-pointer">
      <span className="text-sm flex items-center gap-2">{icon}{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--primary)]"
      />
    </label>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl glass-card px-3 py-2 text-sm bg-transparent outline-none"
      />
    </div>
  );
}
