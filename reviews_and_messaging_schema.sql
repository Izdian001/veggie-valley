-- Reviews and Messaging Features Database Schema for Veggie Valley
-- Run these queries in your Supabase SQL Editor

-- 1. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL,
    buyer_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    seller_reply TEXT,
    seller_reply_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_reviews_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_buyer FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_seller FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- 3. Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_messages_order FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- 4. Ensure required columns exist (safe re-run)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS order_id UUID;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS buyer_id UUID;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS seller_id UUID;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS review_text TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS seller_reply TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS seller_reply_date TIMESTAMPTZ;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS order_id UUID;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS receiver_id UUID;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Ensure foreign keys exist (safe re-run)
DO $$
BEGIN
  -- reviews.order_id -> orders.id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'order_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_reviews_order' AND conrelid = 'public.reviews'::regclass
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT fk_reviews_order FOREIGN KEY (order_id)
      REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;

  -- reviews.buyer_id -> profiles.id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'buyer_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_reviews_buyer' AND conrelid = 'public.reviews'::regclass
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT fk_reviews_buyer FOREIGN KEY (buyer_id)
      REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- reviews.seller_id -> profiles.id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'seller_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_reviews_seller' AND conrelid = 'public.reviews'::regclass
  ) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT fk_reviews_seller FOREIGN KEY (seller_id)
      REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- messages.order_id -> orders.id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'order_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_messages_order' AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT fk_messages_order FOREIGN KEY (order_id)
      REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;

  -- messages.sender_id -> profiles.id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_messages_sender' AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id)
      REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  -- messages.receiver_id -> profiles.id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'receiver_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_messages_receiver' AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id)
      REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5.1 Backfill data into newly added columns for existing reviews rows (safe no-op if already set)
DO $$
BEGIN
  -- Copy reviewer_id -> buyer_id when buyer_id is null
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'reviewer_id'
  ) THEN
    UPDATE public.reviews
    SET buyer_id = reviewer_id
    WHERE buyer_id IS NULL
      AND reviewer_id IS NOT NULL;
  END IF;

  -- Copy comment -> review_text when review_text is null
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'comment'
  ) THEN
    UPDATE public.reviews
    SET review_text = comment
    WHERE review_text IS NULL
      AND comment IS NOT NULL;
  END IF;

  -- Ensure updated_at is populated
  UPDATE public.reviews
  SET updated_at = COALESCE(updated_at, NOW())
  WHERE updated_at IS NULL;
END $$;

-- 6. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON public.reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_buyer_id ON public.reviews(buyer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_seller_id ON public.reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_messages_order_id ON public.messages(order_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for Reviews
-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Buyers can create reviews for their orders" ON public.reviews;
DROP POLICY IF EXISTS "Users can view relevant reviews" ON public.reviews;
DROP POLICY IF EXISTS "Sellers can update their replies" ON public.reviews;

-- Buyers can insert reviews for their own orders
CREATE POLICY "Buyers can create reviews for their orders" 
ON public.reviews
FOR INSERT 
TO authenticated
WITH CHECK (
    auth.uid() = buyer_id AND 
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE id = order_id 
        AND buyer_id = auth.uid()
        AND status = 'delivered'
    )
);

-- Users can view reviews for orders they're involved in
CREATE POLICY "Users can view relevant reviews" 
ON public.reviews
FOR SELECT 
TO authenticated
USING (
    auth.uid() = buyer_id OR 
    auth.uid() = seller_id OR
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE id = order_id 
        AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
);

-- Sellers can update their replies
CREATE POLICY "Sellers can update their replies" 
ON public.reviews
FOR UPDATE 
TO authenticated
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

-- 8. RLS Policies for Messages
-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Users can send messages for their orders" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages for their orders" ON public.messages;
DROP POLICY IF EXISTS "Users can mark their messages as read" ON public.messages;

-- Users can insert messages for orders they're involved in
CREATE POLICY "Users can send messages for their orders" 
ON public.messages
FOR INSERT 
TO authenticated
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE id = order_id 
        AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
);

-- Users can view messages for their orders
CREATE POLICY "Users can view messages for their orders" 
ON public.messages
FOR SELECT 
TO authenticated
USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id OR
    EXISTS (
        SELECT 1 FROM public.orders 
        WHERE id = order_id 
        AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
);

-- Users can update read status of messages they received
CREATE POLICY "Users can mark their messages as read" 
ON public.messages
FOR UPDATE 
TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- 9. Create function for automatic timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create trigger for automatic timestamps on reviews
CREATE OR REPLACE TRIGGER update_reviews_updated_at 
BEFORE UPDATE ON public.reviews
FOR EACH ROW 
EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Create a function to get unread message count
CREATE OR REPLACE FUNCTION public.get_unread_message_count(user_id UUID, order_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.messages 
        WHERE receiver_id = user_id 
        AND messages.order_id = order_id
        AND is_read = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create a function to check if user can review an order
CREATE OR REPLACE FUNCTION public.can_review_order(user_id UUID, order_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.orders 
        WHERE id = order_id 
        AND buyer_id = user_id
        AND status = 'delivered'
        AND NOT EXISTS (
            SELECT 1 
            FROM public.reviews 
            WHERE reviews.order_id = orders.id 
            AND reviews.buyer_id = user_id
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
