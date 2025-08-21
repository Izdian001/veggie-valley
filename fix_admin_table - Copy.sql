-- ========== FIX ADMIN PROFILES TABLE STRUCTURE ==========
-- Run this script if you're getting "column is_active does not exist" error

-- Add missing columns to admin_profiles table
DO $$ 
BEGIN
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admin_profiles' AND column_name = 'is_active') THEN
        ALTER TABLE public.admin_profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        RAISE NOTICE 'Added is_active column to admin_profiles table';
    ELSE
        RAISE NOTICE 'is_active column already exists in admin_profiles table';
    END IF;
    
    -- Add admin_level column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admin_profiles' AND column_name = 'admin_level') THEN
        ALTER TABLE public.admin_profiles ADD COLUMN admin_level TEXT DEFAULT 'admin';
        RAISE NOTICE 'Added admin_level column to admin_profiles table';
    ELSE
        RAISE NOTICE 'admin_level column already exists in admin_profiles table';
    END IF;
    
    -- Add last_login column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admin_profiles' AND column_name = 'last_login') THEN
        ALTER TABLE public.admin_profiles ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added last_login column to admin_profiles table';
    ELSE
        RAISE NOTICE 'last_login column already exists in admin_profiles table';
    END IF;
END $$;

-- Update existing admin profiles to have is_active = true
UPDATE public.admin_profiles SET is_active = true WHERE is_active IS NULL;

-- Update existing admin profiles to have admin_level = 'super_admin' if not set
UPDATE public.admin_profiles SET admin_level = 'super_admin' WHERE admin_level IS NULL;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'admin_profiles' 
ORDER BY ordinal_position;

-- Test the RLS policies
SELECT * FROM public.admin_profiles LIMIT 1;
