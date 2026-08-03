/** ZATCA (Fatoora) gateway calls — server only. */

const BASE: Record<string, string> = {
  sandbox: "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal",
  simulation: "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation",
  production: "https://gw-fatoora.zatca.gov.sa/e-invoicing/core",
};

export interface ZatcaSendResult {
  status: "generated" | "reported" | "cleared" | "rejected" | "failed";
  env: string;
  /** JSON (or raw text) response from the gateway, kept as a string for transport. */
  response: string | null;
  error: string | null;
}

/**
 * Reports a single document to the Fatoora reporting API.
 * Without stored onboarding credentials the document is only generated locally,
 * which keeps the archive/QR flow usable before onboarding is finished.
 */
export async function reportDocument(input: {
  env: string;
  binaryToken: string | null;
  secret: string | null;
  uuid: string;
  invoiceHash: string;
  xmlBase64: string;
  clearance: boolean;
}): Promise<ZatcaSendResult> {
  const base = BASE[input.env];
  if (!base || !input.binaryToken || !input.secret) {
    return {
      status: "generated",
      env: "offline",
      response: JSON.stringify({ note: "تم التوليد محليًا: لم يتم إكمال ربط الاعتماد مع هيئة الضريبة" }),
      error: null,
    };
  }

  const path = input.clearance ? "/invoices/clearance/single" : "/invoices/reporting/single";
  const auth = Buffer.from(`${input.binaryToken}:${input.secret}`).toString("base64");

  let res: Response;
  try {
    res = await fetch(base + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Version": "V2",
        "Accept-Language": "en",
        Authorization: `Basic ${auth}`,
        ...(input.clearance ? { "Clearance-Status": "1" } : {}),
      },
      body: JSON.stringify({
        invoiceHash: input.invoiceHash,
        uuid: input.uuid,
        invoice: input.xmlBase64,
      }),
    });
  } catch (e) {
    return {
      status: "failed",
      env: input.env,
      response: null,
      error: e instanceof Error ? e.message : "تعذّر الاتصال ببوابة الفاتورة الإلكترونية",
    };
  }

  const text = await res.text();
  const body = text || null;

  if (!res.ok) {
    return {
      status: res.status === 400 ? "rejected" : "failed",
      env: input.env,
      response: body,
      error: `رفض من بوابة الفاتورة [${res.status}]: ${text.slice(0, 500)}`,
    };
  }

  return {
    status: input.clearance ? "cleared" : "reported",
    env: input.env,
    response: body,
    error: null,
  };
}
