-- ═══════════════════════════════════════════════════════════════════════
-- TWERKHUB · Video Heatmap Setup
-- Run this ONCE in the Supabase SQL editor.
-- It is idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════

-- 1) Aggregated heatmap table (one row per video, anonymous bucket counts)
CREATE TABLE IF NOT EXISTS public.video_heatmap (
  video_id    text PRIMARY KEY,
  total_views integer NOT NULL DEFAULT 0,
  buckets     jsonb   NOT NULL DEFAULT '[]'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 2) RLS: anyone can read aggregated counts (no PII), nobody can write directly
ALTER TABLE public.video_heatmap ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "heatmap_read_all"  ON public.video_heatmap;
DROP POLICY IF EXISTS "heatmap_no_write"  ON public.video_heatmap;

CREATE POLICY "heatmap_read_all"
  ON public.video_heatmap
  FOR SELECT
  USING (true);

-- (no INSERT/UPDATE/DELETE policy = blocked for everyone except SECURITY DEFINER fns)

-- 3) RPC: clients call this with their per-bucket watch flags.
--    `watched` is an int[] of 0/1 values, length = number of buckets in the video
--    (e.g. 60 buckets for a 60s video at 1s granularity, or 30 buckets for 5%).
--
--    NOTE: must be LANGUAGE plpgsql because we use the FOR i IN 1..N LOOP
--    construct, which is plpgsql-only. Declaring it LANGUAGE sql is what
--    causes the "syntax error at or near .." error you saw.
CREATE OR REPLACE FUNCTION public.record_watch(vid text, watched int[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  arr_len     int;
  existing    jsonb;
  new_buckets jsonb;
  idx         int;
  cur_val     int;
  add_val     int;
BEGIN
  -- Defensive validation
  IF vid IS NULL OR length(vid) = 0 THEN
    RETURN;
  END IF;
  IF watched IS NULL THEN
    RETURN;
  END IF;
  arr_len := array_length(watched, 1);
  IF arr_len IS NULL OR arr_len = 0 OR arr_len > 600 THEN
    -- 600 cap: prevents abuse with absurdly long arrays
    RETURN;
  END IF;

  -- First view of this video?
  SELECT buckets INTO existing FROM public.video_heatmap WHERE video_id = vid;

  IF existing IS NULL THEN
    INSERT INTO public.video_heatmap (video_id, total_views, buckets)
    VALUES (vid, 1, to_jsonb(watched));
    RETURN;
  END IF;

  -- Merge: new_buckets[i] = existing[i] + watched[i] (zero-padded)
  new_buckets := '[]'::jsonb;
  FOR idx IN 1..arr_len LOOP
    cur_val := COALESCE((existing->>(idx - 1))::int, 0);
    add_val := COALESCE(watched[idx], 0);
    -- Clamp add_val to {0,1} to prevent inflation attacks
    IF add_val < 0 THEN add_val := 0; END IF;
    IF add_val > 1 THEN add_val := 1; END IF;
    new_buckets := new_buckets || to_jsonb(cur_val + add_val);
  END LOOP;

  UPDATE public.video_heatmap
     SET total_views = total_views + 1,
         buckets     = new_buckets,
         updated_at  = now()
   WHERE video_id = vid;
END;
$$;

-- 4) Grant execute to both anon and authenticated callers
GRANT EXECUTE ON FUNCTION public.record_watch(text, int[]) TO anon, authenticated;

-- 5) Index for any future "most-watched" queries
CREATE INDEX IF NOT EXISTS idx_video_heatmap_views
  ON public.video_heatmap (total_views DESC);

-- ═══════════════════════════════════════════════════════════════════════
-- Quick test (uncomment to verify):
-- SELECT public.record_watch('TEST_VIDEO', ARRAY[1,1,0,1,0,0,1,1,1,0]::int[]);
-- SELECT public.record_watch('TEST_VIDEO', ARRAY[0,1,1,1,0,0,0,1,1,1]::int[]);
-- SELECT * FROM public.video_heatmap WHERE video_id = 'TEST_VIDEO';
-- DELETE FROM public.video_heatmap WHERE video_id = 'TEST_VIDEO';
-- ═══════════════════════════════════════════════════════════════════════
