-- Reviews and Products RLS + reviewer_id helper + aggregates backfill
-- Idempotent-safe as much as possible

-- ========== REVIEWS: RLS and policies ==========
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Insert policy: buyers can insert reviews for their own orders (no delivered check)
DROP POLICY IF EXISTS "Buyers can create reviews for their orders" ON public.reviews;
CREATE POLICY "Buyers can create reviews for their orders"
ON public.reviews
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = buyer_id AND
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.buyer_id = auth.uid()
  )
);

-- Select policy: users can view reviews related to their orders (buyer/seller)
DROP POLICY IF EXISTS "Users can view relevant reviews" ON public.reviews;
CREATE POLICY "Users can view relevant reviews"
ON public.reviews
FOR SELECT TO authenticated
USING (
  auth.uid() = buyer_id OR auth.uid() = seller_id OR
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
  )
);

-- Optional: Uncomment to allow any authenticated user to read all reviews
-- CREATE POLICY IF NOT EXISTS "Any auth can view seller reviews"
-- ON public.reviews FOR SELECT TO authenticated USING (true);

-- ========== REVIEWS: reviewer_id helper ==========
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS reviewer_id UUID;

CREATE OR REPLACE FUNCTION public.set_reviewer_id_from_buyer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reviewer_id IS NULL THEN
    NEW.reviewer_id = NEW.buyer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_reviewer_id ON public.reviews;
CREATE TRIGGER trg_set_reviewer_id
BEFORE INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.set_reviewer_id_from_buyer();

-- Backfill reviewer_id for existing rows
UPDATE public.reviews
SET reviewer_id = buyer_id
WHERE reviewer_id IS NULL;

-- ========== SELLER PROFILES aggregates ==========
ALTER TABLE public.seller_profiles
ADD COLUMN IF NOT EXISTS rating numeric,
ADD COLUMN IF NOT EXISTS total_reviews integer;

-- Backfill rating/total_reviews from reviews
UPDATE public.seller_profiles sp
SET 
  rating = COALESCE(r.avg_rating, 0),
  total_reviews = COALESCE(r.cnt, 0)
FROM (
  SELECT seller_id AS id, AVG(rating)::numeric AS avg_rating, COUNT(*)::int AS cnt
  FROM public.reviews
  GROUP BY seller_id
) r
WHERE sp.id = r.id;

-- Create missing rows for sellers that have reviews but no profile row
INSERT INTO public.seller_profiles (id, rating, total_reviews)
SELECT r.seller_id, AVG(r.rating)::numeric, COUNT(*)::int
FROM public.reviews r
LEFT JOIN public.seller_profiles sp ON sp.id = r.seller_id
WHERE sp.id IS NULL
GROUP BY r.seller_id;

-- ========== PRODUCTS public read policy ==========
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved products" ON public.products;
CREATE POLICY "Public can view approved products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (
  COALESCE(is_approved, false) = true
  OR status IN ('active','approved')
  OR status IS NULL
);
