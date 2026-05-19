-- 5/22 사용자 명시 = 시설 가이드 ✎ DB 편집 영역 정합. venues.facility_guide_json 영역 (v6 영역).
-- 외부 SOT 영역 (lib/data/venueFacilityGuide.ts) → DB 영역 사용자 편집·관리자 영역.

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS facility_guide_json jsonb,
  ADD COLUMN IF NOT EXISTS facility_guide_url text,
  ADD COLUMN IF NOT EXISTS specs_text text,
  ADD COLUMN IF NOT EXISTS specs_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_venues_facility_guide ON public.venues((facility_guide_json IS NOT NULL));

COMMENT ON COLUMN public.venues.facility_guide_json IS '시설 가이드 영역 구조화 JSON (VenueFacilityGuide 스키마). 사용자 편집 영역 DB 영역.';
COMMENT ON COLUMN public.venues.facility_guide_url IS '시설 가이드북·매뉴얼 PDF 영역 URL.';
COMMENT ON COLUMN public.venues.specs_text IS '시설 가이드 영역 사람용 텍스트 영역 (Vision 영역 추출 또는 사용자 입력).';
