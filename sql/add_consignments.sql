-- ============================================================
-- Execute este SQL no SQL Editor do Supabase Dashboard
-- Adiciona o controle de Consignação com Fornecedores:
--   - consignments: produtos recebidos em consignação (por lote)
--   - consignment_payments: pagamentos feitos ao fornecedor,
--     aplicados a uma linha de consignação específica
-- ============================================================

-- ╔════════════════════════════════════════════════════════════╗
-- ║  1. TABELAS                                                ║
-- ╚════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.consignments (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id     uuid        NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  product_id      uuid        DEFAULT NULL REFERENCES public.products(id) ON DELETE SET NULL,
  product_name    text        NOT NULL,
  sku             text        DEFAULT NULL,
  quantity        integer     NOT NULL CHECK (quantity > 0),
  unit_cost       numeric     NOT NULL DEFAULT 0,
  received_date   date        NOT NULL DEFAULT CURRENT_DATE,
  notes           text        DEFAULT NULL,
  user_id         uuid        DEFAULT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.consignment_payments (
  id                uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  consignment_id    uuid        NOT NULL REFERENCES public.consignments(id) ON DELETE CASCADE,
  quantity_paid     integer     NOT NULL CHECK (quantity_paid > 0),
  amount            numeric     NOT NULL DEFAULT 0,
  payment_date      date        NOT NULL DEFAULT CURRENT_DATE,
  notes             text        DEFAULT NULL,
  user_id           uuid        DEFAULT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ╔════════════════════════════════════════════════════════════╗
-- ║  2. ÍNDICES                                                ║
-- ╚════════════════════════════════════════════════════════════╝

CREATE INDEX IF NOT EXISTS idx_consignments_company          ON public.consignments(company_id);
CREATE INDEX IF NOT EXISTS idx_consignments_supplier         ON public.consignments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_consignments_product          ON public.consignments(product_id);
CREATE INDEX IF NOT EXISTS idx_consignment_payments_company  ON public.consignment_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_consignment_payments_consig   ON public.consignment_payments(consignment_id);

-- ╔════════════════════════════════════════════════════════════╗
-- ║  3. ROW LEVEL SECURITY (RLS)                               ║
-- ╚════════════════════════════════════════════════════════════╝
-- Reutiliza public.get_my_company_id(), já criada em full_schema.sql

ALTER TABLE public.consignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consignments_select" ON public.consignments;
DROP POLICY IF EXISTS "consignments_insert" ON public.consignments;
DROP POLICY IF EXISTS "consignments_update" ON public.consignments;
DROP POLICY IF EXISTS "consignments_delete" ON public.consignments;

CREATE POLICY "consignments_select" ON public.consignments
  FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "consignments_insert" ON public.consignments
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "consignments_update" ON public.consignments
  FOR UPDATE TO authenticated
  USING  (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "consignments_delete" ON public.consignments
  FOR DELETE TO authenticated
  USING (company_id = public.get_my_company_id());

ALTER TABLE public.consignment_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consignment_payments_select" ON public.consignment_payments;
DROP POLICY IF EXISTS "consignment_payments_insert" ON public.consignment_payments;
DROP POLICY IF EXISTS "consignment_payments_update" ON public.consignment_payments;
DROP POLICY IF EXISTS "consignment_payments_delete" ON public.consignment_payments;

CREATE POLICY "consignment_payments_select" ON public.consignment_payments
  FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "consignment_payments_insert" ON public.consignment_payments
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "consignment_payments_update" ON public.consignment_payments
  FOR UPDATE TO authenticated
  USING  (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "consignment_payments_delete" ON public.consignment_payments
  FOR DELETE TO authenticated
  USING (company_id = public.get_my_company_id());

-- ╔════════════════════════════════════════════════════════════╗
-- ║  4. TRIGGER: auto-atualizar updated_at                     ║
-- ╚════════════════════════════════════════════════════════════╝
-- Reutiliza public.handle_updated_at(), já criada em full_schema.sql

DROP TRIGGER IF EXISTS set_consignments_updated_at ON public.consignments;
CREATE TRIGGER set_consignments_updated_at
  BEFORE UPDATE ON public.consignments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ╔════════════════════════════════════════════════════════════╗
-- ║  5. GRANTS                                                 ║
-- ╚════════════════════════════════════════════════════════════╝

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consignments          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consignment_payments  TO authenticated;

-- ╔════════════════════════════════════════════════════════════╗
-- ║  FIM                                                        ║
-- ╚════════════════════════════════════════════════════════════╝
-- Após rodar este SQL, a tela "Consignação" do app já pode ser usada.
