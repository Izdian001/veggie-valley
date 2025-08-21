-- ========== FINAL ADMIN SETUP SCRIPT ==========
-- Run this script to ensure admin user is properly configured

-- This script expects that the admin user exists in auth.users with the email below.
-- If the user does not exist, create it in Supabase Dashboard → Authentication → Add user,
-- mark "Auto confirm" and then run this script.

DO $$
DECLARE
  v_admin_email text := 'syed.izdian.siraji@gmail.com';
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id FROM auth.users WHERE email = v_admin_email;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin user with email % does not exist in auth.users. Create it first in the Supabase Auth UI.', v_admin_email;
  END IF;

  -- Step 1: Update user metadata to set admin role (merge, do not overwrite other fields)
  UPDATE auth.users 
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
                           || jsonb_build_object('role', 'admin', 'full_name', 'Admin User')
  WHERE id = v_admin_id;

  -- Step 2: Ensure profile exists with admin role
  INSERT INTO public.profiles (
      id,
      email,
      full_name,
      username,
      avatar_url,
      phone,
      address,
      city,
      state,
      postal_code,
      role,
      is_verified,
      created_at,
      updated_at
  ) VALUES (
      v_admin_id,
      v_admin_email,
      'Admin User',
      'admin',
      NULL,
      '+1234567890',
      'Admin Address',
      'Admin City',
      'Admin State',
      '12345',
      'admin',
      true,
      NOW(),
      NOW()
  ) ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      is_verified = true,
      updated_at = NOW();

  -- Step 3: Ensure admin profile exists in admin_profiles
  INSERT INTO public.admin_profiles (
      id,
      admin_level,
      permissions,
      last_login,
      is_active,
      created_at,
      updated_at
  ) VALUES (
      v_admin_id,
      'super_admin',
      ARRAY['manage_users', 'manage_sellers', 'manage_products', 'view_reports', 'system_settings'],
      NOW(),
      true,
      NOW(),
      NOW()
  ) ON CONFLICT (id) DO UPDATE SET
      admin_level = 'super_admin',
      is_active = true,
      last_login = NOW(),
      updated_at = NOW();
END $$;

-- Step 4: Verify the setup
SELECT 
    'User Metadata' as check_type,
    email,
    raw_user_meta_data
FROM auth.users 
WHERE email = 'syed.izdian.siraji@gmail.com'

UNION ALL

SELECT 
    'Profile' as check_type,
    email,
    to_jsonb(role) as data
FROM public.profiles 
WHERE email = 'syed.izdian.siraji@gmail.com'

UNION ALL

SELECT 
    'Admin Profile' as check_type,
    p.email,
    to_jsonb(ap.admin_level) as data
FROM public.admin_profiles ap
JOIN public.profiles p ON p.id = ap.id
WHERE p.email = 'syed.izdian.siraji@gmail.com';
