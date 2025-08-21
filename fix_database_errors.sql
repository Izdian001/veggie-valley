-- ========== FIX DATABASE ERRORS IMMEDIATELY ==========
-- This script fixes the infinite recursion and profile update issues

-- Step 1: Drop ALL existing RLS policies to avoid conflicts
DROP POLICY IF EXISTS "Admin users can manage admin_profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Admin users can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin users can manage seller_profiles" ON public.seller_profiles;
DROP POLICY IF EXISTS "Admin users can manage products" ON public.products;
DROP POLICY IF EXISTS "Admin users can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Admin users can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Users can access own admin profile" ON public.admin_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own seller profile" ON public.seller_profiles;
DROP POLICY IF EXISTS "Sellers can manage own products" ON public.products;
DROP POLICY IF EXISTS "Admin access to all data" ON public.profiles;
DROP POLICY IF EXISTS "Admin access to seller profiles" ON public.seller_profiles;
DROP POLICY IF EXISTS "Admin access to products" ON public.products;

-- Step 2: Create simple, working RLS policies
-- Admin profiles - only allow access to own profile
CREATE POLICY "Users can access own admin profile" ON public.admin_profiles
    FOR ALL USING (auth.uid() = id);

-- Profiles - allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Seller profiles - allow users to manage their own
CREATE POLICY "Users can manage own seller profile" ON public.seller_profiles
    FOR ALL USING (auth.uid() = id);

-- Products - allow sellers to manage their own products
CREATE POLICY "Sellers can manage own products" ON public.products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.seller_profiles 
            WHERE seller_profiles.id = products.seller_id 
            AND seller_profiles.id = auth.uid()
        )
    );

-- Allow admin users to access all data (simple check)
CREATE POLICY "Admin access to all data" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_profiles 
            WHERE admin_profiles.id = auth.uid() 
            AND admin_profiles.is_active = true
        )
    );

CREATE POLICY "Admin access to seller profiles" ON public.seller_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_profiles 
            WHERE admin_profiles.id = auth.uid() 
            AND admin_profiles.is_active = true
        )
    );

CREATE POLICY "Admin access to products" ON public.products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_profiles 
            WHERE admin_profiles.id = auth.uid() 
            AND admin_profiles.is_active = true
        )
    );

-- Step 3: Ensure admin_profiles table has correct structure
DO $$ 
BEGIN
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admin_profiles' AND column_name = 'is_active') THEN
        ALTER TABLE public.admin_profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Update existing admin profiles to have is_active = true
    UPDATE public.admin_profiles SET is_active = true WHERE is_active IS NULL;
END $$;

-- Step 4: Verify the fixes
SELECT 'Policies created successfully' as status;
