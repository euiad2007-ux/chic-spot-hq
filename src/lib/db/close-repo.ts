import { supabase } from "@/integrations/supabase/client";

export interface FiscalYear {
  id: string;
  year: number;
  start_date: string;
  end_date: string;
  status: "open" | "closed";
  net_profit: number;
  total_revenue: number;
  total_expenses: number;
  closing_entry_id: string | null;
  note: string | null;
  closed_at: string | null;
}

/** Every fiscal year row recorded for the salon, newest first. */
export async function listFiscalYears(salonId: string): Promise<FiscalYear[]> {
  const { data, error } = await supabase
    .from("fiscal_years")
    .select(
      "id,year,start_date,end_date,status,net_profit,total_revenue,total_expenses,closing_entry_id,note,closed_at",
    )
    .eq("salon_id", salonId)
    .order("year", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    ...r,
    status: r.status as "open" | "closed",
    net_profit: Number(r.net_profit),
    total_revenue: Number(r.total_revenue),
    total_expenses: Number(r.total_expenses),
  }));
}

/** Posts the year-end closing entry and locks the year. Owner only. */
export async function closeFiscalYear(salonId: string, year: number, note?: string): Promise<string> {
  const { data, error } = await supabase.rpc("close_fiscal_year", {
    _salon: salonId,
    _year: year,
    _note: note?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Reverses the closing entry and unlocks the year again. Owner only. */
export async function reopenFiscalYear(salonId: string, year: number): Promise<void> {
  const { error } = await supabase.rpc("reopen_fiscal_year", { _salon: salonId, _year: year });
  if (error) throw new Error(error.message);
}
