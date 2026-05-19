-- 5/22 사용자 명시 = signage_types 영역 layout·sample_image_url·hidden 영역 신규 컬럼
-- localStorage 영역 (mice_signage_type_overrides·samples·hidden) → DB 영역 정합

ALTER TABLE public.signage_types
  ADD COLUMN IF NOT EXISTS sample_image_url text,
  ADD COLUMN IF NOT EXISTS layout text DEFAULT '세로',
  ADD COLUMN IF NOT EXISTS hidden boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_signage_types_hidden ON public.signage_types(hidden) WHERE hidden = false;

COMMENT ON COLUMN public.signage_types.sample_image_url IS '예시 이미지 URL (RightPanel 영역 자동 grep). localStorage mice_signage_type_samples 영역 통합';
COMMENT ON COLUMN public.signage_types.layout IS '세로·가로·정사각. localStorage mice_signage_type_overrides 영역 통합';
COMMENT ON COLUMN public.signage_types.hidden IS 'soft delete 영역. localStorage mice_hidden_signage_types 영역 통합';
