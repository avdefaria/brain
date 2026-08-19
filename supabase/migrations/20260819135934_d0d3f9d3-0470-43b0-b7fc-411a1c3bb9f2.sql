
-- 1. Security Definer function to check role without recursion
CREATE OR REPLACE FUNCTION public.check_is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

GRANT EXECUTE ON FUNCTION public.check_is_admin(UUID) TO authenticated, service_role;

-- 2. Trigger function to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, function, employment_type)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    new.raw_user_meta_data->>'avatar_url',
    CASE WHEN (SELECT count(*) FROM public.user_roles WHERE role = 'admin') = 0 THEN 'Administrador'::public.user_function ELSE 'Designer'::public.user_function END,
    'PJ'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- 3. Fix profiles RLS to prevent recursion
-- First, drop existing policies that might be recursive
DROP POLICY IF EXISTS "Usuários podem ver qualquer perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem editar o próprio perfil" ON public.profiles;

-- Create clean policies
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Fix user_roles RLS
DROP POLICY IF EXISTS "Usuários podem ver os próprios papéis" ON public.user_roles;

CREATE POLICY "Users can see their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can see all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.check_is_admin(auth.uid()));

-- 5. Ensure the requested admin user has a profile and role
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'alan.vieira.faria@gmail.com';
  
  IF target_user_id IS NOT NULL THEN
    -- Ensure profile exists
    INSERT INTO public.profiles (id, full_name, function, employment_type)
    VALUES (target_user_id, 'Alan Vieira Faria', 'Administrador', 'PJ')
    ON CONFLICT (id) DO NOTHING;
    
    -- Ensure admin role exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
