-- bookings: track whether service materials were already deducted
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stock_deducted boolean NOT NULL DEFAULT false;

-- tax configuration on the salon
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS tax_number text;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS vat_rate numeric NOT NULL DEFAULT 15;
ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS expenses_include_vat boolean NOT NULL DEFAULT true;

-- input VAT on expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS vat_amount numeric NOT NULL DEFAULT 0;

-- stocktakes
CREATE TABLE IF NOT EXISTS public.inventory_stocktakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  counted_on date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  status text NOT NULL DEFAULT 'draft',
  diff_qty numeric NOT NULL DEFAULT 0,
  diff_value numeric NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_stocktake_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  stocktake_id uuid NOT NULL REFERENCES public.inventory_stocktakes(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  system_qty numeric NOT NULL DEFAULT 0,
  counted_qty numeric NOT NULL DEFAULT 0,
  diff_qty numeric NOT NULL DEFAULT 0,
  cost_per_unit numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stocktakes_salon ON public.inventory_stocktakes(salon_id, counted_on DESC);
CREATE INDEX IF NOT EXISTS idx_stocktake_lines_take ON public.inventory_stocktake_lines(stocktake_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_stocktakes TO authenticated;
GRANT ALL ON public.inventory_stocktakes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_stocktake_lines TO authenticated;
GRANT ALL ON public.inventory_stocktake_lines TO service_role;

ALTER TABLE public.inventory_stocktakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stocktake_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members manage stocktakes"
  ON public.inventory_stocktakes FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id))
  WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

CREATE POLICY "members manage stocktake lines"
  ON public.inventory_stocktake_lines FOR ALL TO authenticated
  USING (public.can_manage_salon(auth.uid(), salon_id))
  WITH CHECK (public.can_manage_salon(auth.uid(), salon_id));

CREATE TRIGGER trg_stocktakes_updated_at
  BEFORE UPDATE ON public.inventory_stocktakes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- apply a stocktake atomically
CREATE OR REPLACE FUNCTION public.apply_stocktake(p_stocktake_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_salon uuid;
  v_status text;
BEGIN
  SELECT salon_id, status INTO v_salon, v_status
  FROM public.inventory_stocktakes WHERE id = p_stocktake_id FOR UPDATE;

  IF v_salon IS NULL THEN RAISE EXCEPTION 'stocktake not found'; END IF;
  IF NOT public.can_manage_salon(auth.uid(), v_salon) THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF v_status = 'applied' THEN RAISE EXCEPTION 'stocktake already applied'; END IF;

  UPDATE public.inventory_items i
  SET stock = GREATEST(0, l.counted_qty)
  FROM public.inventory_stocktake_lines l
  WHERE l.stocktake_id = p_stocktake_id
    AND l.item_id = i.id
    AND i.salon_id = v_salon;

  UPDATE public.inventory_stocktakes
  SET status = 'applied', applied_at = now()
  WHERE id = p_stocktake_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_stocktake(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.apply_stocktake(uuid) TO authenticated;