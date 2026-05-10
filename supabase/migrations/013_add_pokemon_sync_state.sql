-- Tracks resumable catalog imports that are advanced by Supabase Cron.
CREATE TABLE IF NOT EXISTS public.pokemon_sync_state (
  sync_key text PRIMARY KEY,
  next_page integer NOT NULL DEFAULT 1 CHECK (next_page >= 1),
  batch_size integer NOT NULL DEFAULT 250 CHECK (batch_size >= 250 AND batch_size % 250 = 0),
  total_synced integer NOT NULL DEFAULT 0 CHECK (total_synced >= 0),
  last_count integer NOT NULL DEFAULT 0 CHECK (last_count >= 0),
  has_more boolean NOT NULL DEFAULT true,
  last_status text NOT NULL DEFAULT 'idle',
  last_error text,
  last_synced_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pokemon_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage pokemon sync state" ON public.pokemon_sync_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.pokemon_sync_state (sync_key, next_page, batch_size)
VALUES ('pokemon_cards', 1, 250)
ON CONFLICT (sync_key) DO NOTHING;
