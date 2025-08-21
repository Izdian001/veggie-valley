-- ========== CORRECTED ADMIN SETUP SCRIPT ==========
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

-- Replace 'ADMIN_USER_ID' with your actual user ID: 8f0cb7f0-baff-4ff6-a1fd-ce895ee00dd2
-- Replace 'admin@example.com' with your actual admin email

-- Insert admin profile with correct schema
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
    '8f0cb7f0-baff-4ff6-a1fd-ce895ee00dd2', -- Replace with your actual admin user UUID
    'syed.izdian.siraji@gmail.com', -- Replace with your actual admin email
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
);

-- ========== STEP 3: Create Admin Profile ==========
INSERT INTO public.admin_profiles (
    id,
    admin_level,
    permissions,
    last_login,
    created_at,
    updated_at
) VALUES (
    '8f0cb7f0-baff-4ff6-a1fd-ce895ee00dd2', -- Replace with your actual admin user UUID
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
    p.email,
    p.full_name,
    p.username,
    p.role,
    ap.admin_level,
    ap.permissions
FROM public.profiles p
JOIN public.admin_profiles ap ON p.id = ap.id
WHERE p.username = 'admin';

-- ========== STEP 5: Test Admin Access ==========
-- Verify the admin can access admin data
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    ap.admin_level,
    ap.is_active
FROM public.profiles p
JOIN public.admin_profiles ap ON p.id = ap.id
WHERE p.id = '8f0cb7f0-baff-4ff6-a1fd-ce895ee00dd2';

-- ========== SECURITY NOTES ==========
-- 1. Change the default admin password immediately after creation
-- 2. Use a strong, unique password
-- 3. Enable 2FA if possible
-- 4. Monitor admin account activity
-- 5. Regularly rotate admin credentials
-- 6. Delete this file after use

-- ========== ADMIN CREDENTIALS ==========
-- Email: syed.izdian.siraji@gmail.com
-- Password: [Your chosen password]
-- Role: admin
-- Full Name: Admin User
-- Admin Level: super_admin
-- Permissions: All system permissions
