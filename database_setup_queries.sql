-- ========================================
-- VEGGIE VALLEY DATABASE SETUP QUERIES
-- Run these in your Supabase SQL Editor
-- ========================================

-- Enable pgcrypto for UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========== BASE PROFILES ==========
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  role TEXT DEFAULT 'buyer' CHECK (role IN ('buyer','seller','admin')),
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ========== SELLER PROFILES ==========
CREATE TABLE IF NOT EXISTS public.seller_profiles (
  id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  farm_name TEXT NOT NULL,
  bio TEXT,
  years_farming INTEGER,
  certifications TEXT[] DEFAULT ARRAY[]::TEXT[],
  cover_image_url TEXT,
  rating DECIMAL(2,1) DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,
      is_approved BOOLEAN DEFAULT TRUE,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ========== BUYER PROFILES ==========
CREATE TABLE IF NOT EXISTS public.buyer_profiles (
  id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  preferences TEXT[],
  favorite_products UUID[] DEFAULT ARRAY[]::UUID[],
  loyalty_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ========== ADMIN PROFILES ==========
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  admin_level TEXT DEFAULT 'admin' CHECK (admin_level IN ('admin', 'super_admin', 'moderator')),
  permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
  department TEXT,
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Add missing columns if they don't exist (for existing tables)
DO $$ 
BEGIN
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admin_profiles' AND column_name = 'is_active') THEN
        ALTER TABLE public.admin_profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Add admin_level column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admin_profiles' AND column_name = 'admin_level') THEN
        ALTER TABLE public.admin_profiles ADD COLUMN admin_level TEXT DEFAULT 'admin';
    END IF;
    
    -- Add last_login column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admin_profiles' AND column_name = 'last_login') THEN
        ALTER TABLE public.admin_profiles ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- ========== CATEGORIES ==========
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ========== PRODUCTS ==========
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  quantity_available INTEGER NOT NULL DEFAULT 0,
  min_order_quantity INTEGER DEFAULT 1,
  images TEXT[],
  is_approved BOOLEAN DEFAULT TRUE,
  is_organic BOOLEAN DEFAULT FALSE,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ========== ORDERS ==========
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  order_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  delivery_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ========== INSERT SAMPLE DATA ==========

-- Insert sample categories
INSERT INTO public.categories (name, description) VALUES
('Vegetables', 'Fresh vegetables from local farms'),
('Fruits', 'Fresh fruits and berries'),
('Grains', 'Whole grains and cereals'),
('Dairy', 'Fresh dairy products')
ON CONFLICT (name) DO NOTHING;

-- ========== ROW LEVEL SECURITY (RLS) ==========

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Anyone can view approved products" ON public.products;
DROP POLICY IF EXISTS "Sellers can view their own products" ON public.products;
DROP POLICY IF EXISTS "Sellers can insert their own products" ON public.products;
DROP POLICY IF EXISTS "Sellers can update their own products" ON public.products;

DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;

DROP POLICY IF EXISTS "Buyers can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Sellers can view orders for their products" ON public.orders;
DROP POLICY IF EXISTS "Buyers can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Sellers can update orders for their products" ON public.orders;

-- Create policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Products policies
CREATE POLICY "Anyone can view approved products" ON public.products
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Sellers can view their own products" ON public.products
  FOR SELECT USING (seller_id = auth.uid());

CREATE POLICY "Sellers can insert their own products" ON public.products
  FOR INSERT WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers can update their own products" ON public.products
  FOR UPDATE USING (seller_id = auth.uid());

-- Categories policies
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);

-- Orders policies
CREATE POLICY "Buyers can view their own orders" ON public.orders
  FOR SELECT USING (buyer_id = auth.uid());

CREATE POLICY "Sellers can view orders for their products" ON public.orders
  FOR SELECT USING (seller_id = auth.uid());

CREATE POLICY "Buyers can insert their own orders" ON public.orders
  FOR INSERT WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Sellers can update orders for their products" ON public.orders
  FOR UPDATE USING (seller_id = auth.uid());

-- ========== FUNCTIONS ==========

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_seller_profiles_updated_at ON public.seller_profiles;
DROP TRIGGER IF EXISTS update_buyer_profiles_updated_at ON public.buyer_profiles;
DROP TRIGGER IF EXISTS update_admin_profiles_updated_at ON public.admin_profiles;
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_profiles_updated_at BEFORE UPDATE ON public.seller_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buyer_profiles_updated_at BEFORE UPDATE ON public.buyer_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_profiles_updated_at BEFORE UPDATE ON public.admin_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== QUERIES TO CHECK DATA ==========

-- Check if tables exist and have data
SELECT 'profiles' as table_name, COUNT(*) as count FROM public.profiles
UNION ALL
SELECT 'seller_profiles', COUNT(*) FROM public.seller_profiles
UNION ALL
SELECT 'buyer_profiles', COUNT(*) FROM public.buyer_profiles
UNION ALL
SELECT 'categories', COUNT(*) FROM public.categories
UNION ALL
SELECT 'products', COUNT(*) FROM public.products
UNION ALL
SELECT 'orders', COUNT(*) FROM public.orders;

-- Check products with approval status
SELECT 
  name,
  price,
  unit,
  quantity_available,
  is_approved,
  created_at
FROM public.products
ORDER BY created_at DESC;

-- ========== AUTO-APPROVAL QUERIES ==========

-- Auto-approve all existing sellers
UPDATE public.seller_profiles SET is_approved = true WHERE is_approved = false OR is_approved IS NULL;

-- Auto-approve all existing products
UPDATE public.products SET is_approved = true WHERE is_approved = false OR is_approved IS NULL;

-- ========== STORAGE SETUP ==========

-- Create avatars storage bucket (run this in Supabase SQL Editor)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policy for avatars (run this in Supabase SQL Editor)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policy for avatars (run this in Supabase SQL Editor)
-- CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ========== ADMIN SECURITY POLICIES ==========

-- Drop existing admin policies if they exist
DROP POLICY IF EXISTS "Admins can manage admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all sellers" ON public.seller_profiles;
DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

-- Admin profiles policy - only admins can access admin profiles
CREATE POLICY "Admins can manage admin profiles" ON public.admin_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Admin can manage all seller profiles
CREATE POLICY "Admins can manage all sellers" ON public.seller_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Admin can manage all products
CREATE POLICY "Admins can manage all products" ON public.products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Admin can view all orders
CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Admin can manage categories
CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- ========== ADMIN AUDIT LOGGING ==========

-- Create admin actions audit table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES public.admin_profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable RLS on audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- ========== SECURITY FUNCTIONS ==========

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE id = user_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  admin_id UUID,
  action TEXT,
  table_name TEXT DEFAULT NULL,
  record_id UUID DEFAULT NULL,
  old_values JSONB DEFAULT NULL,
  new_values JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.admin_audit_log (
    admin_id, action, table_name, record_id, old_values, new_values
  ) VALUES (
    admin_id, action, table_name, record_id, old_values, new_values
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== SECURITY NOTES ==========
-- 1. Admin accounts can ONLY be created through manual database insertion
-- 2. Public signup form does NOT include admin role option
-- 3. All admin actions are logged and audited
-- 4. Row Level Security (RLS) protects all admin data
-- 5. Middleware validates admin access on all admin routes
-- 6. Admin credentials should be stored securely and rotated regularly
