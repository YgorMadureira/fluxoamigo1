-- ============================================================
-- FLUXO AMIGO – SCHEMA COMPLETO PARA SUPABASE (do zero)
-- Execute este SQL no SQL Editor do Supabase Dashboard
-- ============================================================

-- ╔════════════════════════════════════════════════════════════╗
-- ║  0. EXTENSÕES NECESSÁRIAS                                  ║
-- ╚════════════════════════════════════════════════════════════╝
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ╔════════════════════════════════════════════════════════════╗
-- ║  1. TABELAS                                                ║
-- ╚════════════════════════════════════════════════════════════╝

-- 1.1 companies (empresa / tenant)
CREATE TABLE public.companies (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          text        NOT NULL,
  gemini_api_key text       DEFAULT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 1.2 profiles (perfil do usuário, 1:1 com auth.users)
CREATE TABLE public.profiles (
  id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id    uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name     text        DEFAULT NULL,
  role          text        NOT NULL DEFAULT 'user',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 1.3 shop_configs (credenciais Shopee por empresa)
CREATE TABLE public.shop_configs (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    uuid        NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  partner_id    text        DEFAULT NULL,
  partner_key   text        DEFAULT NULL,
  shop_id       text        DEFAULT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 1.4 categories (categorias de produtos)
CREATE TABLE public.categories (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 1.5 suppliers (fornecedores)
CREATE TABLE public.suppliers (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  contact       text        DEFAULT NULL,
  phone         text        DEFAULT NULL,
  email         text        DEFAULT NULL,
  notes         text        DEFAULT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 1.6 products (produtos/estoque)
CREATE TABLE public.products (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  sku             text        DEFAULT NULL,
  unit_price      numeric     NOT NULL DEFAULT 0,
  cost_price      numeric     NOT NULL DEFAULT 0,
  stock_quantity  integer     NOT NULL DEFAULT 0,
  min_stock       integer     NOT NULL DEFAULT 0,
  category        text        DEFAULT NULL,
  category_id     uuid        DEFAULT NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 1.7 sales (vendas)
CREATE TABLE public.sales (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid        DEFAULT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id      uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id      uuid        DEFAULT NULL REFERENCES public.products(id) ON DELETE SET NULL,
  product_name    text        NOT NULL,
  quantity        integer     NOT NULL DEFAULT 1,
  unit_price      numeric     NOT NULL,
  total_amount    numeric     NOT NULL,
  sale_date       date        NOT NULL DEFAULT CURRENT_DATE,
  source          text        NOT NULL DEFAULT 'manual',
  shopee_order_id text        DEFAULT NULL,
  status          text        NOT NULL DEFAULT 'completed',
  notes           text        DEFAULT NULL,
  seller_name     text        DEFAULT NULL,
  category_id     uuid        DEFAULT NULL REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 1.8 purchases (compras)
CREATE TABLE public.purchases (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid        DEFAULT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id      uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id      uuid        DEFAULT NULL REFERENCES public.products(id) ON DELETE SET NULL,
  product_name    text        NOT NULL,
  quantity        integer     NOT NULL DEFAULT 1,
  unit_cost       numeric     NOT NULL,
  total_amount    numeric     NOT NULL,
  purchase_date   date        NOT NULL DEFAULT CURRENT_DATE,
  supplier        text        DEFAULT NULL,
  category        text        NOT NULL DEFAULT 'Geral',
  notes           text        DEFAULT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 1.9 inventory_logs (histórico de movimentações de estoque)
CREATE TABLE public.inventory_logs (
  id                uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           uuid        DEFAULT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id        uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type              text        NOT NULL,       -- 'sale', 'purchase', 'adjustment', etc.
  quantity_change   integer     NOT NULL,
  quantity_before   integer     NOT NULL,
  quantity_after    integer     NOT NULL,
  justification     text        DEFAULT NULL,
  reference_id      uuid        DEFAULT NULL,   -- id da venda/compra que gerou o log
  user_name         text        DEFAULT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);


-- ╔════════════════════════════════════════════════════════════╗
-- ║  2. ÍNDICES ÚTEIS                                          ║
-- ╚════════════════════════════════════════════════════════════╝
CREATE INDEX idx_profiles_company      ON public.profiles(company_id);
CREATE INDEX idx_products_company      ON public.products(company_id);
CREATE INDEX idx_products_category_id  ON public.products(category_id);
CREATE INDEX idx_sales_company         ON public.sales(company_id);
CREATE INDEX idx_sales_date            ON public.sales(sale_date);
CREATE INDEX idx_sales_category_id     ON public.sales(category_id);
CREATE INDEX idx_purchases_company     ON public.purchases(company_id);
CREATE INDEX idx_purchases_date        ON public.purchases(purchase_date);
CREATE INDEX idx_categories_company    ON public.categories(company_id);
CREATE INDEX idx_suppliers_company     ON public.suppliers(company_id);
CREATE INDEX idx_inventory_logs_product ON public.inventory_logs(product_id);
CREATE INDEX idx_inventory_logs_date   ON public.inventory_logs(created_at);


-- ╔════════════════════════════════════════════════════════════╗
-- ║  3. FUNÇÃO AUXILIAR (SECURITY DEFINER) – evita recursão   ║
-- ╚════════════════════════════════════════════════════════════╝
-- Retorna o company_id do perfil do usuário logado.
-- Usada dentro das políticas RLS para filtrar dados por empresa.

CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;


-- ╔════════════════════════════════════════════════════════════╗
-- ║  4. ROW LEVEL SECURITY (RLS)                               ║
-- ╚════════════════════════════════════════════════════════════╝

-- ── 4.1 companies ──────────────────────────────────────────
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_select" ON public.companies
  FOR SELECT TO authenticated
  USING (id = public.get_my_company_id());

CREATE POLICY "companies_update" ON public.companies
  FOR UPDATE TO authenticated
  USING  (id = public.get_my_company_id())
  WITH CHECK (id = public.get_my_company_id());

-- ── 4.2 profiles ───────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING  (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ── 4.3 shop_configs ───────────────────────────────────────
ALTER TABLE public.shop_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_configs_select" ON public.shop_configs
  FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "shop_configs_insert" ON public.shop_configs
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "shop_configs_update" ON public.shop_configs
  FOR UPDATE TO authenticated
  USING  (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

-- ── 4.4 categories ─────────────────────────────────────────
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select" ON public.categories
  FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "categories_insert" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "categories_update" ON public.categories
  FOR UPDATE TO authenticated
  USING  (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "categories_delete" ON public.categories
  FOR DELETE TO authenticated
  USING (company_id = public.get_my_company_id());

-- ── 4.5 suppliers ──────────────────────────────────────────
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_select" ON public.suppliers
  FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "suppliers_insert" ON public.suppliers
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "suppliers_update" ON public.suppliers
  FOR UPDATE TO authenticated
  USING  (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "suppliers_delete" ON public.suppliers
  FOR DELETE TO authenticated
  USING (company_id = public.get_my_company_id());

-- ── 4.6 products ───────────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select" ON public.products
  FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "products_insert" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "products_update" ON public.products
  FOR UPDATE TO authenticated
  USING  (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "products_delete" ON public.products
  FOR DELETE TO authenticated
  USING (company_id = public.get_my_company_id());

-- ── 4.7 sales ──────────────────────────────────────────────
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_select" ON public.sales
  FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "sales_insert" ON public.sales
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "sales_update" ON public.sales
  FOR UPDATE TO authenticated
  USING  (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "sales_delete" ON public.sales
  FOR DELETE TO authenticated
  USING (company_id = public.get_my_company_id());

-- ── 4.8 purchases ──────────────────────────────────────────
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchases_select" ON public.purchases
  FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "purchases_insert" ON public.purchases
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "purchases_update" ON public.purchases
  FOR UPDATE TO authenticated
  USING  (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "purchases_delete" ON public.purchases
  FOR DELETE TO authenticated
  USING (company_id = public.get_my_company_id());

-- ── 4.9 inventory_logs ─────────────────────────────────────
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

-- inventory_logs não tem company_id direto; filtramos via product
CREATE POLICY "inventory_logs_select" ON public.inventory_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = inventory_logs.product_id
        AND p.company_id = public.get_my_company_id()
    )
  );

CREATE POLICY "inventory_logs_insert" ON public.inventory_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = inventory_logs.product_id
        AND p.company_id = public.get_my_company_id()
    )
  );


-- ╔════════════════════════════════════════════════════════════╗
-- ║  5. TRIGGER: auto-atualizar updated_at                     ║
-- ╚════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_purchases_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_shop_configs_updated_at
  BEFORE UPDATE ON public.shop_configs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ╔════════════════════════════════════════════════════════════╗
-- ║  6. TRIGGER: criar perfil + empresa automaticamente       ║
--     ao registrar um novo usuário no auth                     ║
-- ╚════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id uuid;
  user_full_name text;
BEGIN
  -- Pega o nome do metadata do signup (se existir)
  user_full_name := NEW.raw_user_meta_data ->> 'full_name';

  -- Cria uma empresa para o novo usuário
  INSERT INTO public.companies (name)
  VALUES (COALESCE(user_full_name, 'Minha Empresa'))
  RETURNING id INTO new_company_id;

  -- Cria o perfil vinculado
  INSERT INTO public.profiles (id, company_id, full_name, role)
  VALUES (NEW.id, new_company_id, user_full_name, 'admin');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ╔════════════════════════════════════════════════════════════╗
-- ║  7. GRANTS (permissões para roles anon e authenticated)   ║
-- ╚════════════════════════════════════════════════════════════╝

-- Authenticated users precisam SELECT/INSERT/UPDATE/DELETE nas tabelas
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_configs   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases      TO authenticated;
GRANT SELECT, INSERT             ON public.inventory_logs  TO authenticated;

-- Função auxiliar precisa ser executável
GRANT EXECUTE ON FUNCTION public.get_my_company_id()     TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_updated_at()     TO authenticated;

-- Anon precisa de SELECT mínimo para signup flow
GRANT SELECT ON public.profiles TO anon;


-- ╔════════════════════════════════════════════════════════════╗
-- ║  FIM DO SCHEMA                                             ║
-- ╚════════════════════════════════════════════════════════════╝
-- Após rodar este SQL:
-- 1. Crie um usuário no Auth do Supabase (ou via signUp no app)
-- 2. O trigger on_auth_user_created criará automaticamente
--    a empresa e o perfil com role 'admin'
-- 3. Faça login no app e comece a usar!
