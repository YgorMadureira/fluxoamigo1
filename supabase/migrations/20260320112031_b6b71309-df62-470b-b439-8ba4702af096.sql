
-- Create customers table linked to auth.users
CREATE TABLE public.customers (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cpf text UNIQUE NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  cep text,
  address text,
  address_number text,
  complement text,
  city text,
  state text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Customers can read their own data
CREATE POLICY "Customers can read own data"
ON public.customers FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Customers can update own data (except CPF handled in trigger)
CREATE POLICY "Customers can update own data"
ON public.customers FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Customers can insert own data
CREATE POLICY "Customers can insert own data"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Admins can read all customers
CREATE POLICY "Admins can read all customers"
ON public.customers FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to prevent CPF update after initial set
CREATE OR REPLACE FUNCTION public.prevent_cpf_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.cpf IS NOT NULL AND OLD.cpf != '' AND NEW.cpf != OLD.cpf THEN
    RAISE EXCEPTION 'CPF cannot be changed after registration';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_cpf_change
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_cpf_update();

-- Add customer_id and order tracking fields to sales concept
-- We'll add customer_id to track which customer made the purchase
-- Note: sales table is on external ERP, so we store order info in a new orders table here

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) NOT NULL,
  company_id text NOT NULL DEFAULT 'default',
  items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric NOT NULL DEFAULT 0,
  shipping_cost numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  tracking_code text,
  shipping_address jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own orders"
ON public.orders FOR SELECT
TO authenticated
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert own orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can read all orders"
ON public.orders FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
