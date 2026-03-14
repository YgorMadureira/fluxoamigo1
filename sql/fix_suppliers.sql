-- ============================================================
-- Execute este SQL no Supabase SQL Editor para corrigir a
-- tabela suppliers (adicionar colunas + políticas RLS)
-- ============================================================

-- 1. Adicionar colunas faltantes (seguro - IF NOT EXISTS)
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS contact text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS phone   text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS email   text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS notes   text;

-- 2. Habilitar Row Level Security
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas antigas
DROP POLICY IF EXISTS "suppliers_select"  ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_insert"  ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_update"  ON public.suppliers;
DROP POLICY IF EXISTS "suppliers_delete"  ON public.suppliers;

-- 4. Função auxiliar SECURITY DEFINER (evita recursão no RLS)
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 5. Políticas RLS
CREATE POLICY "suppliers_select"
  ON public.suppliers FOR SELECT TO authenticated
  USING (company_id = public.get_my_company_id());

CREATE POLICY "suppliers_insert"
  ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "suppliers_update"
  ON public.suppliers FOR UPDATE TO authenticated
  USING  (company_id = public.get_my_company_id())
  WITH CHECK (company_id = public.get_my_company_id());

CREATE POLICY "suppliers_delete"
  ON public.suppliers FOR DELETE TO authenticated
  USING (company_id = public.get_my_company_id());
