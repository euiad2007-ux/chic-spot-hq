import { supabase } from "@/integrations/supabase/client";

/** Legal profile of the merchant store, editable from the dashboard. */
export interface StoreProfile {
  id: string;
  name: string;
  phone: string;
  currency: string;
  country: string;
  vatNumber: string;
  taxNumber: string;
  slug: string;
}

export type VerificationStatus = "draft" | "pending" | "verified" | "rejected";

export interface StoreDocFile {
  path: string;
  label: string;
  uploadedAt: string;
}

export interface StoreVerification {
  docKind: "commercial" | "freelance" | "identity";
  docNumber: string;
  docIssuedOn: string;
  docExpiresOn: string;
  legalName: string;
  nationalId: string;
  bankName: string;
  iban: string;
  accountHolder: string;
  files: StoreDocFile[];
  status: VerificationStatus;
  reviewNote: string;
}

export const EMPTY_VERIFICATION: StoreVerification = {
  docKind: "commercial",
  docNumber: "",
  docIssuedOn: "",
  docExpiresOn: "",
  legalName: "",
  nationalId: "",
  bankName: "",
  iban: "",
  accountHolder: "",
  files: [],
  status: "draft",
  reviewNote: "",
};

export const DOC_KINDS: { id: StoreVerification["docKind"]; label: string }[] = [
  { id: "commercial", label: "سجل تجاري" },
  { id: "freelance", label: "شهادة عمل حر" },
  { id: "identity", label: "هوية / إقامة" },
];

export const CURRENCIES = ["SAR", "AED", "KWD", "QAR", "BHD", "OMR", "EGP", "USD", "EUR"];

export const COUNTRIES: { code: string; label: string }[] = [
  { code: "SA", label: "السعودية" },
  { code: "AE", label: "الإمارات" },
  { code: "KW", label: "الكويت" },
  { code: "QA", label: "قطر" },
  { code: "BH", label: "البحرين" },
  { code: "OM", label: "عُمان" },
  { code: "EG", label: "مصر" },
  { code: "JO", label: "الأردن" },
];

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  draft: "غير مكتمل",
  pending: "بانتظار المراجعة",
  verified: "موثّق",
  rejected: "مرفوض",
};

/** Reads the store's own legal profile. */
export async function loadStoreProfile(salonId: string): Promise<StoreProfile> {
  const { data, error } = await supabase
    .from("salons")
    .select("id, name, phone, currency, country, vat_number, tax_number, slug")
    .eq("id", salonId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("لم يتم العثور على بيانات المتجر");
  return {
    id: data.id,
    name: data.name ?? "",
    phone: data.phone ?? "",
    currency: data.currency ?? "SAR",
    country: data.country ?? "SA",
    vatNumber: data.vat_number ?? "",
    taxNumber: data.tax_number ?? "",
    slug: data.slug ?? "",
  };
}

export async function saveStoreProfile(p: StoreProfile): Promise<void> {
  const { error } = await supabase
    .from("salons")
    .update({
      name: p.name.trim(),
      phone: p.phone.trim() || null,
      currency: p.currency,
      country: p.country,
      vat_number: p.vatNumber.trim() || null,
      tax_number: p.taxNumber.trim() || null,
    })
    .eq("id", p.id);
  if (error) throw new Error(error.message);
}

export async function loadVerification(salonId: string): Promise<StoreVerification> {
  const { data, error } = await supabase
    .from("salon_verification")
    .select("*")
    .eq("salon_id", salonId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { ...EMPTY_VERIFICATION };
  const files = Array.isArray(data.files) ? (data.files as unknown as StoreDocFile[]) : [];
  return {
    docKind: (data.doc_kind as StoreVerification["docKind"]) ?? "commercial",
    docNumber: data.doc_number ?? "",
    docIssuedOn: data.doc_issued_on ?? "",
    docExpiresOn: data.doc_expires_on ?? "",
    legalName: data.legal_name ?? "",
    nationalId: data.national_id ?? "",
    bankName: data.bank_name ?? "",
    iban: data.iban ?? "",
    accountHolder: data.account_holder ?? "",
    files,
    status: (data.status as VerificationStatus) ?? "draft",
    reviewNote: data.review_note ?? "",
  };
}

export async function saveVerification(
  salonId: string,
  v: StoreVerification,
  submit = false,
): Promise<VerificationStatus> {
  const status: VerificationStatus = submit ? "pending" : v.status === "verified" ? "verified" : "draft";
  const { error } = await supabase.from("salon_verification").upsert(
    {
      salon_id: salonId,
      doc_kind: v.docKind,
      doc_number: v.docNumber.trim() || null,
      doc_issued_on: v.docIssuedOn || null,
      doc_expires_on: v.docExpiresOn || null,
      legal_name: v.legalName.trim() || null,
      national_id: v.nationalId.trim() || null,
      bank_name: v.bankName.trim() || null,
      iban: v.iban.replace(/\s+/g, "").toUpperCase() || null,
      account_holder: v.accountHolder.trim() || null,
      files: v.files as never,
      status,
      submitted_at: submit ? new Date().toISOString() : null,
    } as never,
    { onConflict: "salon_id" },
  );
  if (error) throw new Error(error.message);
  return status;
}

const MAX_DOC_BYTES = 10 * 1024 * 1024;

/** Uploads one legal document into the salon's private folder. */
export async function uploadStoreDoc(
  salonId: string,
  file: File,
  label: string,
): Promise<StoreDocFile> {
  if (file.size > MAX_DOC_BYTES) throw new Error("حجم الملف أكبر من 10 ميجابايت");
  const ok = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
  if (!ok.includes(file.type)) throw new Error("الصيغ المدعومة: PDF أو PNG أو JPG");
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${salonId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("salon-docs")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return { path, label: label.trim() || file.name, uploadedAt: new Date().toISOString() };
}

export async function storeDocUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("salon-docs").createSignedUrl(path, 60 * 10);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function removeStoreDoc(path: string): Promise<void> {
  const { error } = await supabase.storage.from("salon-docs").remove([path]);
  if (error) throw new Error(error.message);
}
