-- Expand card_type enum to support more TCGs
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_card_type_check;
ALTER TABLE listings ADD CONSTRAINT listings_card_type_check
  CHECK (card_type IN ('pokemon','mtg','sports','yugioh','lorcana','one_piece','digimon','other'));

-- Add product_type column (single/graded/sealed)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'single'
  CHECK (product_type IN ('single','graded','sealed'));

-- Add sealed-specific metadata columns
ALTER TABLE listings ADD COLUMN IF NOT EXISTS sealed_type text
  CHECK (sealed_type IS NULL OR sealed_type IN ('booster_box','booster_pack','elite_trainer_box','collection_box','tin','bundle','blister','other'));

ALTER TABLE listings ADD COLUMN IF NOT EXISTS quantity int NOT NULL DEFAULT 1
  CHECK (quantity > 0);

-- Update cards table to track game/TCG
ALTER TABLE cards ADD COLUMN IF NOT EXISTS game text NOT NULL DEFAULT 'pokemon';

-- Create index for product_type filtering
CREATE INDEX IF NOT EXISTS idx_listings_product_type ON listings(product_type);
CREATE INDEX IF NOT EXISTS idx_listings_game ON listings(card_type, product_type);

-- Enable RLS on cards table and add public read policy
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cards are publicly readable" ON cards;
DROP POLICY IF EXISTS "Service can insert cards" ON cards;
CREATE POLICY "Cards are publicly readable" ON cards FOR SELECT USING (true);
CREATE POLICY "Service can insert cards" ON cards FOR INSERT WITH CHECK (true);
