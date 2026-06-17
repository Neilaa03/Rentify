BEGIN;

-- Keep public.pickup as the handover/status table.
-- Store the actual pickup/return code hashes in public.code, linked by pickup_id.
ALTER TABLE public.code
  ALTER COLUMN code TYPE text;

ALTER TABLE public.code
  ADD COLUMN IF NOT EXISTS flow text,
  ADD COLUMN IF NOT EXISTS qr_token_hash text,
  ADD COLUMN IF NOT EXISTS verified_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0);

UPDATE public.code
SET flow = 'pickup'
WHERE flow IS NULL;

UPDATE public.code
SET attempts = 0
WHERE attempts IS NULL;

ALTER TABLE public.code
  ALTER COLUMN flow SET DEFAULT 'pickup',
  ALTER COLUMN flow SET NOT NULL,
  ALTER COLUMN attempts SET DEFAULT 0,
  ALTER COLUMN attempts SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'code_flow_check'
      AND conrelid = 'public.code'::regclass
  ) THEN
    ALTER TABLE public.code
      ADD CONSTRAINT code_flow_check CHECK (flow IN ('pickup', 'return'));
  END IF;
END $$;

DELETE FROM public.code c
USING (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY pickup_id, flow
        ORDER BY created_at DESC NULLS LAST, id
      ) AS row_number
    FROM public.code
  ) ranked
  WHERE row_number > 1
) duplicates
WHERE c.id = duplicates.id;

CREATE UNIQUE INDEX IF NOT EXISTS code_pickup_id_flow_idx
  ON public.code (pickup_id, flow);

-- Move any existing pickup codes into public.code.
INSERT INTO public.code (
  pickup_id,
  flow,
  code,
  qr_token_hash,
  expires_at,
  verified_at,
  verified_by,
  attempts,
  created_at
)
SELECT
  id,
  'pickup',
  pickup_code_hash,
  pickup_qr_token_hash,
  pickup_code_expires_at,
  pickup_verified_at,
  pickup_verified_by,
  COALESCE(pickup_attempts, 0),
  NOW()
FROM public.pickup
WHERE pickup_code_hash IS NOT NULL
ON CONFLICT (pickup_id, flow)
DO UPDATE SET
  code = EXCLUDED.code,
  qr_token_hash = EXCLUDED.qr_token_hash,
  expires_at = EXCLUDED.expires_at,
  verified_at = EXCLUDED.verified_at,
  verified_by = EXCLUDED.verified_by,
  attempts = EXCLUDED.attempts;

-- Move any existing return codes into public.code.
INSERT INTO public.code (
  pickup_id,
  flow,
  code,
  qr_token_hash,
  expires_at,
  verified_at,
  verified_by,
  attempts,
  created_at
)
SELECT
  id,
  'return',
  return_code_hash,
  return_qr_token_hash,
  return_code_expires_at,
  return_verified_at,
  return_verified_by,
  COALESCE(return_attempts, 0),
  NOW()
FROM public.pickup
WHERE return_code_hash IS NOT NULL
ON CONFLICT (pickup_id, flow)
DO UPDATE SET
  code = EXCLUDED.code,
  qr_token_hash = EXCLUDED.qr_token_hash,
  expires_at = EXCLUDED.expires_at,
  verified_at = EXCLUDED.verified_at,
  verified_by = EXCLUDED.verified_by,
  attempts = EXCLUDED.attempts;

ALTER TABLE public.pickup
  DROP COLUMN IF EXISTS pickup_code_hash,
  DROP COLUMN IF EXISTS pickup_code_expires_at,
  DROP COLUMN IF EXISTS pickup_verified_at,
  DROP COLUMN IF EXISTS pickup_verified_by,
  DROP COLUMN IF EXISTS pickup_attempts,
  DROP COLUMN IF EXISTS pickup_qr_token_hash,
  DROP COLUMN IF EXISTS return_code_hash,
  DROP COLUMN IF EXISTS return_qr_token_hash,
  DROP COLUMN IF EXISTS return_code_expires_at,
  DROP COLUMN IF EXISTS return_verified_at,
  DROP COLUMN IF EXISTS return_verified_by,
  DROP COLUMN IF EXISTS return_attempts;

COMMIT;
