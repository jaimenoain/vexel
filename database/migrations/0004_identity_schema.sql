-- Create Enum
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('CONTROLLER', 'PRINCIPAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Alter table profiles to use the new Enum
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.profiles
  ALTER COLUMN role TYPE app_role
  USING role::app_role;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  -- Check if any profiles exist
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first_user;

  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new.id,
    new.email,
    CASE WHEN is_first_user THEN 'CONTROLLER'::app_role ELSE 'PRINCIPAL'::app_role END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Recreate Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Policies
-- View
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Update
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
