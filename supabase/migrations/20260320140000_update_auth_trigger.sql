-- This trigger replaces the old handle_new_user function
-- Instead of just creating a profile, it also creates a customer record
-- It bypasses Row Level Security (RLS) entirely, solving the insert lock during signup.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Create the basic profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  -- 2. Create the customer record, if CPF was provided during signup
  IF NEW.raw_user_meta_data->>'cpf' IS NOT NULL AND NEW.raw_user_meta_data->>'cpf' != '' THEN
    -- Try to insert to avoid duplicate key violations dropping the whole transaction
    BEGIN
      INSERT INTO public.customers (id, cpf, full_name, email, phone)
      VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'cpf',
        NEW.raw_user_meta_data->>'full_name',
        NEW.email,
        NEW.raw_user_meta_data->>'phone'
      );
    EXCEPTION WHEN unique_violation THEN
      -- If CPF already exists on another user but this triggers, ignore insert to avoid blocking basic user creation
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;
