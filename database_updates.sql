-- Database updates for admin functionality

-- 1. Add approval status to seller_profiles
ALTER TABLE seller_profiles 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 2. Add approval status to products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approval_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 3. Add review system for sellers
CREATE TABLE IF NOT EXISTS seller_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID REFERENCES seller_profiles(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_flagged BOOLEAN DEFAULT false,
    flag_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add content flags table
CREATE TABLE IF NOT EXISTS content_flags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content_type TEXT NOT NULL, -- 'review', 'product', 'profile'
    content_id UUID NOT NULL,
    reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    flag_reason TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZERO DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZERO
);

-- 5. Add admin actions log
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'approve_seller', 'delete_seller', 'approve_product', 'delete_product'
    target_id UUID NOT NULL,
    target_type TEXT NOT NULL, -- 'seller', 'product', 'user'
    action_details JSONB,
    created_at TIMESTAMP WITH TIME ZERO DEFAULT NOW()
);

-- 6. Update existing seller_profiles to be approved by default (for existing data)
UPDATE seller_profiles SET is_approved = true WHERE is_approved IS NULL;

-- 7. Update existing products to be approved by default (for existing data)
UPDATE products SET is_approved = true WHERE is_approved IS NULL;

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_seller_reviews_seller_id ON seller_reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_content_flags_content_type ON content_flags(content_type);
CREATE INDEX IF NOT EXISTS idx_content_flags_is_resolved ON content_flags(is_resolved);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);

-- 9. Add RLS policies for admin access
-- Note: These policies assume admin users have role = 'admin' in their user_metadata

-- Allow admins to view all seller profiles
CREATE POLICY IF NOT EXISTS "Admins can view all seller profiles" ON seller_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Allow admins to update seller profiles
CREATE POLICY IF NOT EXISTS "Admins can update seller profiles" ON seller_profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Allow admins to delete seller profiles
CREATE POLICY IF NOT EXISTS "Admins can delete seller profiles" ON seller_profiles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Allow admins to view all products
CREATE POLICY IF NOT EXISTS "Admins can view all products" ON products
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Allow admins to update products
CREATE POLICY IF NOT EXISTS "Admins can update products" ON products
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Allow admins to delete products
CREATE POLICY IF NOT EXISTS "Admins can delete products" ON products
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );
