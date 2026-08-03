import { supabase } from "@/integrations/supabase/client";

export interface ZatcaConfig {
  enabled: boolean;
  env: "sandbox" | "simulation" | "production";
  vat_number: string;
  seller_name: string;
  common_name: string;
  has_credentials: boolean;
  last_hash: string | null;
  last_submitted_at: string | null;
}

export interface EInvoiceSubmission {
  id: string;
  doc_type: string;
  doc_number: string | null;
  doc_uuid: string | null;
  invoice_hash: string | null;
  previous_hash: string | null;
  env: string;
  status: string;
  error: string | null;
  submitted_at: string | null;
  created_at: string;
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "قيد الانتظار",
  generated: "مُولَّدة محليًا",
  reported: "مُبلَّغة لهيئة الضريبة",
  cleared: "مُصادق عليها",
  rejected: "مرفوضة",
  failed: "فشل الإرسال",
};

const EMPTY: ZatcaConfig = {
  enabled: false,
  env: "sandbox",
  vat_number: "",
  seller_name: "",
  common_name: "",
  has_credentials: false,
  last_hash: null,
  last_submitted_at: null,
};

/** The salon's ZATCA integration settings (credentials are never returned raw). */
export async function loadZatcaConfig(salonId: string): Promise<ZatcaConfig> {
  const { data, error } = await supabase
    .from("zatca_config")
    .select("enabled,env,vat_number,seller_name,common_name,binary_token,secret,last_hash,last_submitted_at")
    .eq("salon_id", salonId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return EMPTY;
  return {
    enabled: !!data.enabled,
    env: (data.env ?? "sandbox") as ZatcaConfig["env"],
    vat_number: data.vat_number ?? "",
    seller_name: data.seller_name ?? "",
    common_name: data.common_name ?? "",
    has_credentials: !!(data.binary_token && data.secret),
    last_hash: data.last_hash ?? null,
    last_submitted_at: data.last_submitted_at ?? null,
  };
}

/** Saves the integration settings. Blank credential fields keep the stored values. */
export async function saveZatcaConfig(
  salonId: string,
  input: {
    enabled: boolean;
    env: ZatcaConfig["env"];
    vat_number: string;
    seller_name: string;
    common_name: string;
    binary_token?: string;
    secret?: string;
  },
): Promise<void> {
  const row: {
    salon_id: string;
    enabled: boolean;
    env: string;
    vat_number: string | null;
    seller_name: string | null;
    common_name: string | null;
    binary_token?: string;
    secret?: string;
  } = {
    salon_id: salonId,
    enabled: input.enabled,
    env: input.env,
    vat_number: input.vat_number.trim() || null,
    seller_name: input.seller_name.trim() || null,
    common_name: input.common_name.trim() || null,
  };
  if (input.binary_token?.trim()) row.binary_token = input.binary_token.trim();
  if (input.secret?.trim()) row.secret = input.secret.trim();


  const { error } = await supabase.from("zatca_config").upsert(row, { onConflict: "salon_id" });
  if (error) throw new Error(error.message);
}

/** Submission log for the salon, newest first. */
export async function listSubmissions(salonId: string, limit = 200): Promise<EInvoiceSubmission[]> {
  const { data, error } = await supabase
    .from("einvoice_submissions")
    .select(
      "id,doc_type,doc_number,doc_uuid,invoice_hash,previous_hash,env,status,error,submitted_at,created_at",
    )
    .eq("salon_id", salonId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** SHA-256 of the document XML, Base64 encoded — the ZATCA invoice hash. */
export async function invoiceHash(xml: string): Promise<string> {
  const bytes = new TextEncoder().encode(xml);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const view = new Uint8Array(digest);
  let bin = "";
  for (const b of view) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function toBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Records the outcome of a submission and chains the hash for the next document. */
export async function recordSubmission(input: {
  salonId: string;
  docType: "invoice" | "credit_note";
  invoiceId?: string | null;
  creditNoteId?: string | null;
  docNumber: string;
  docUuid: string;
  hash: string;
  qr: string;
  xml: string;
  env: string;
  status: string;
  response?: unknown;
  error?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("record_einvoice_submission", {
    _salon: input.salonId,
    _doc_type: input.docType,
    _invoice: (input.invoiceId ?? null) as unknown as string,
    _credit_note: (input.creditNoteId ?? null) as unknown as string,
    _doc_number: input.docNumber,
    _doc_uuid: input.docUuid,
    _hash: input.hash,
    _qr: input.qr,
    _xml: input.xml,
    _env: input.env,
    _status: input.status,
    _response: (input.response ?? null) as never,
    _error: input.error ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
