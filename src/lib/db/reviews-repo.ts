import { supabase } from "@/integrations/supabase/client";

export interface SalonReviewRow {
  id: string;
  bookingId: string | null;
  rating: number;
  comment: string;
  displayName: string;
  published: boolean;
  createdAt: string;
}

/**
 * Submits (or updates) the review for one of the signed-in customer's bookings.
 * The database function proves the booking is hers and already completed.
 */
export async function submitReview(
  bookingId: string,
  rating: number,
  comment?: string,
  displayName?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("submit_salon_review", {
    _booking: bookingId,
    _rating: rating,
    _comment: comment?.trim() || undefined,
    _display_name: displayName?.trim() || undefined,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Reviews of the signed-in customer's own bookings (RLS scoped). */
export async function listMyReviews(customerId: string): Promise<SalonReviewRow[]> {
  const { data } = await supabase
    .from("salon_reviews")
    .select("id, booking_id, rating, comment, display_name, published, created_at")
    .eq("customer_id", customerId);
  return (data ?? []).map(mapRow);
}

/** All reviews of a salon, for dashboard moderation. */
export async function listSalonReviews(salonId: string): Promise<SalonReviewRow[]> {
  const { data } = await supabase
    .from("salon_reviews")
    .select("id, booking_id, rating, comment, display_name, published, created_at")
    .eq("salon_id", salonId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapRow);
}

export async function setReviewPublished(id: string, published: boolean): Promise<void> {
  const { error } = await supabase.from("salon_reviews").update({ published }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase.from("salon_reviews").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

function mapRow(r: {
  id: string;
  booking_id: string | null;
  rating: number | null;
  comment: string | null;
  display_name: string | null;
  published: boolean | null;
  created_at: string;
}): SalonReviewRow {
  return {
    id: r.id,
    bookingId: r.booking_id,
    rating: r.rating ?? 5,
    comment: r.comment ?? "",
    displayName: r.display_name ?? "",
    published: r.published ?? true,
    createdAt: r.created_at,
  };
}
