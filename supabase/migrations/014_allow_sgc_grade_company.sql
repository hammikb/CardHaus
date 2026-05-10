ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_grade_company_check;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_grade_company_check
  CHECK (grade_company IS NULL OR grade_company IN ('PSA', 'BGS', 'CGC', 'SGC'));
