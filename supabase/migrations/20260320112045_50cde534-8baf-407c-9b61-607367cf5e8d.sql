
-- Fix search path for prevent_cpf_update function
CREATE OR REPLACE FUNCTION public.prevent_cpf_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.cpf IS NOT NULL AND OLD.cpf != '' AND NEW.cpf != OLD.cpf THEN
    RAISE EXCEPTION 'CPF cannot be changed after registration';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
