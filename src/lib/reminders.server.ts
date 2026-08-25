import { sendTemplateEmail } from "@/lib/email-templates/send-email";

type AnyRow = Record<string, any>;

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function reminderLeadMin(settingsDoc: unknown): number {
  const booking = asRecord(settingsDoc);
  const raw = Number(booking["reminderLeadMin"] ?? 120);
  if (!Number.isFinite(raw)) return 120;
  return Math.min(10080, Math.max(5, Math.floor(raw)));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

function mapsUrl(branch: AnyRow | null) {
  if (!branch) return "";
  if (branch.maps_url) return String(branch.maps_url);
  if (branch.lat != null && branch.lng != null) return `https://www.google.com/maps/search/?api=1&query=${branch.lat},${branch.lng}`;
  return "";
}

function templateBody(salonName: string, branchName: string, customerName: string, startsAt: string) {
  return `مرحباً ${customerName}، نذكرك بموعدك في ${salonName}${branchName ? ` - ${branchName}` : ""} بتاريخ ${formatDateTime(startsAt)}.`;
}

export async function processDueBookingReminders(limit = 50) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date();
  const nowIso = now.toISOString();
  const horizonIso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select(`
      id, code, salon_id, branch_id, customer_id, staff_id, starts_at, duration_min, status,
      customers(name, email, phone),
      staff(name, email, phone),
      branches(name, phone, whatsapp, email, maps_url, lat, lng),
      salons(name),
      booking_services(sort_order, services(name))
    `)
    .is("reminder_sent_at", null)
    .is("reminder_error", null)
    .in("status", ["new", "confirmed"])
    .gte("starts_at", nowIso)
    .lte("starts_at", horizonIso)
    .order("starts_at", { ascending: true })
    .limit(Math.min(200, Math.max(1, Math.floor(limit))));

  if (error) throw new Error(error.message);

  const bookings = (data ?? []) as AnyRow[];
  const salonIds = [...new Set(bookings.map((b) => String(b.salon_id)).filter(Boolean))];
  const settingsBySalon = new Map<string, unknown>();
  if (salonIds.length > 0) {
    const { data: settingsRows } = await supabaseAdmin
      .from("salon_settings")
      .select("salon_id, booking")
      .in("salon_id", salonIds);
    for (const row of settingsRows ?? []) settingsBySalon.set(String(row.salon_id), row.booking);
  }

  let processed = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const booking of bookings) {
    const startMs = new Date(String(booking.starts_at)).getTime();
    const lead = reminderLeadMin(settingsBySalon.get(String(booking.salon_id)));
    if (startMs - now.getTime() > lead * 60_000) continue;
    processed += 1;

    const salon = first<AnyRow>(booking.salons);
    const branch = first<AnyRow>(booking.branches);
    const customer = first<AnyRow>(booking.customers);
    const staff = first<AnyRow>(booking.staff);
    const serviceNames = ((booking.booking_services ?? []) as AnyRow[])
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      .map((x) => first<AnyRow>(x.services)?.name)
      .filter(Boolean)
      .join("، ");

    const salonName = String(salon?.name ?? "الصالون");
    const branchName = String(branch?.name ?? "");
    const customerName = String(customer?.name ?? "عميلتنا");
    const email = typeof customer?.email === "string" ? customer.email : "";
    const message = templateBody(salonName, branchName, customerName, String(booking.starts_at));

    const baseEvent = {
      salon_id: String(booking.salon_id),
      branch_id: booking.branch_id ?? null,
      booking_id: String(booking.id),
      staff_id: booking.staff_id ?? null,
      customer_id: booking.customer_id ?? null,
      kind: "booking_reminder",
      title: `تذكير ${booking.code}`,
      body: message,
      scheduled_for: String(booking.starts_at),
      meta: { bookingCode: booking.code, leadMinutes: lead, branchName },
    };

    const { data: eventRow } = await supabaseAdmin
      .from("notification_events")
      .insert({ ...baseEvent, channel: "email", recipient: email || null, status: email ? "pending" : "skipped" })
      .select("id")
      .maybeSingle();

    if (!email) {
      await supabaseAdmin.from("bookings").update({ reminder_sent_at: nowIso, reminder_error: "no_customer_email" }).eq("id", booking.id);
      skipped += 1;
      continue;
    }

    try {
      const result = await sendTemplateEmail("booking_reminder", email, {
        templateData: {
          salonName,
          branchName,
          customerName,
          bookingCode: String(booking.code),
          serviceNames,
          staffName: String(staff?.name ?? ""),
          dateTime: formatDateTime(String(booking.starts_at)),
          branchPhone: String(branch?.phone ?? branch?.whatsapp ?? ""),
          mapsUrl: mapsUrl(branch),
        },
        idempotencyKey: `booking-reminder:${booking.id}`,
      });
      if (!result.sent) throw new Error(result.reason);
      await supabaseAdmin.from("notification_events").update({ status: "sent", sent_at: nowIso, error: null }).eq("id", eventRow?.id ?? "00000000-0000-0000-0000-000000000000");
      await supabaseAdmin.from("bookings").update({ reminder_sent_at: nowIso, reminder_error: null }).eq("id", booking.id);
      sent += 1;
    } catch (err) {
      const reason = err instanceof Error ? err.message : "send_failed";
      if (eventRow?.id) await supabaseAdmin.from("notification_events").update({ status: "failed", error: reason }).eq("id", eventRow.id);
      await supabaseAdmin.from("bookings").update({ reminder_error: reason }).eq("id", booking.id);
      failed += 1;
    }
  }

  return { processed, sent, skipped, failed };
}
