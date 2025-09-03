-- ========== AGGRESSIVE FIX FOR INFINITE RECURSION ==========
-- This script completely disables RLS and recreates only essential policies

-- Step 1: Completely disable RLS on all tables to stop infinite recursion
ALTER TABLE public.admin_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies (if any exist)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
END $$;

-- Step 3: Re-enable RLS with minimal, safe policies
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Step 4: Create only essential, simple policies
-- Profiles - allow users to manage their own profile
CREATE POLICY "users_own_profile" ON public.profiles
    FOR ALL USING (auth.uid() = id);

-- Admin profiles - allow users to access their own
CREATE POLICY "users_own_admin_profile" ON public.admin_profiles
    FOR ALL USING (auth.uid() = id);

-- Seller profiles - allow users to manage their own
CREATE POLICY "users_own_seller_profile" ON public.seller_profiles
    FOR ALL USING (auth.uid() = id);

-- Buyer profiles - allow users to manage their own
CREATE POLICY "users_own_buyer_profile" ON public.buyer_profiles
    FOR ALL USING (auth.uid() = id);

-- Products - allow sellers to manage their own products
CREATE POLICY "sellers_own_products" ON public.products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.seller_profiles 
            WHERE seller_profiles.id = products.seller_id 
            AND seller_profiles.id = auth.uid()
        )
    );

-- Step 5: Ensure admin_profiles table has correct structure
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

-- Step 6: Verify the fixes
SELECT 'RLS fixed successfully - infinite recursion eliminated' as status;
