-- ========== SECURE ADMIN SETUP SCRIPT ==========
-- ⚠️  WARNING: This script should ONLY be run by authorized personnel
-- ⚠️  NEVER commit this file to version control
-- ⚠️  Store this file securely and delete after use

-- ========== STEP 1: Create Admin User in Auth ==========
-- First, you need to manually create an admin user through Supabase Dashboard:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User"
-- 3. Enter admin email and password
-- 4. Set user_metadata: {"role": "admin", "full_name": "Admin User"}

-- ========== STEP 2: Create Admin Profile ==========
-- After creating the auth user, run this to create the profile:

-- Insert admin profile (replace 'ADMIN_USER_ID' with actual UUID from auth.users)
-- First, get the email from auth.users table
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
) 
SELECT 
    'ADMIN_USER_ID', -- Replace with actual admin user UUID
    email,
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
FROM auth.users 
WHERE id = 'ADMIN_USER_ID'; -- Replace with actual admin user UUID

-- ========== STEP 3: Create Admin Profile ==========
INSERT INTO public.admin_profiles (
    id,
    admin_level,
    permissions,
    last_login,
    created_at,
    updated_at
) VALUES (
    'ADMIN_USER_ID', -- Replace with actual admin user UUID
    'super_admin',
    ARRAY['manage_users', 'manage_sellers', 'manage_products', 'view_reports', 'system_settings'],
    NOW(),
    NOW(),
    NOW()
);

-- ========== STEP 4: Verify Admin Creation ==========
-- Check if admin was created successfully:
SELECT 
    p.id,
    p.full_name,
    p.username,
    ap.admin_level,
    ap.permissions
FROM public.profiles p
JOIN public.admin_profiles ap ON p.id = ap.id
WHERE p.username = 'admin';

-- ========== STEP 5: Set Up Row Level Security (RLS) ==========
-- Enable RLS on admin tables
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for admin_profiles (only admins can access)
DROP POLICY IF EXISTS "Admins can manage admin profiles" ON public.admin_profiles;
CREATE POLICY "Admins can manage admin profiles" ON public.admin_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND EXISTS (
                SELECT 1 FROM public.admin_profiles 
                WHERE id = auth.uid()
            )
        )
    );

-- ========== STEP 6: Create Admin Dashboard Access Policy ==========
-- Ensure only admins can access admin routes
-- This will be enforced in your Next.js middleware

-- ========== SECURITY NOTES ==========
-- 1. Change the default admin password immediately after creation
-- 2. Use a strong, unique password
-- 3. Enable 2FA if possible
-- 4. Monitor admin account activity
-- 5. Regularly rotate admin credentials
-- 6. Delete this file after use

-- ========== ADMIN CREDENTIALS TEMPLATE ==========
-- Email: admin@yourdomain.com
-- Password: [Generate strong password]
-- Role: admin
-- Full Name: Admin User
-- Admin Level: super_admin
-- Permissions: All system permissions
