-- δ-PR#4 (2026-05-20): AI 추천 정확도 신규 측정 + 동의어 자동 변환 + 잔존 localStorage 4종 폐기
--
-- 정책 (PO 확정):
--   1. AI 추천 정확도 = "AI 추천 그대로 발주 완료 비율" (옵션 1)
--   3. 동의어 자동 변환 = 옵션 B (미분류 태그 + 학습 풀 제외)
--   4. 예시 이미지 = localStorage → DB 공유화 (signage_types.sample_image_url)
--
-- 본 SQL은 사용자 영역(Supabase Studio)에서 직접 실행. 자동 적용 안 함.
-- 클라이언트 코드는 graceful degradation으로 적용 전에도 동작.

-- ═══════════════════════════════════════════════════════════════
-- ① AI 추천 정확도 신규 측정 컬럼 (design_items)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE design_items
  ADD COLUMN IF NOT EXISTS created_by_ai BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_initial_category TEXT,
  ADD COLUMN IF NOT EXISTS ai_initial_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS ai_initial_width_mm INTEGER,
  ADD COLUMN IF NOT EXISTS ai_initial_height_mm INTEGER;

COMMENT ON COLUMN design_items.created_by_ai IS 'PR#4: AI 응답으로 INSERT된 항목 (TRUE) vs 사용자 직접 추가 (FALSE)';
COMMENT ON COLUMN design_items.ai_initial_category IS 'PR#4: AI 초기 추천 category — 사용자가 수정 전 원본';
COMMENT ON COLUMN design_items.ai_initial_quantity IS 'PR#4: AI 초기 추천 quantity';
COMMENT ON COLUMN design_items.ai_initial_width_mm IS 'PR#4: AI 초기 추천 width_mm';
COMMENT ON COLUMN design_items.ai_initial_height_mm IS 'PR#4: AI 초기 추천 height_mm';

-- ═══════════════════════════════════════════════════════════════
-- ② 동의어 자동 변환 (design_items에 normalize 결과 + status)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE design_items
  ADD COLUMN IF NOT EXISTS category_normalized TEXT,
  ADD COLUMN IF NOT EXISTS category_normalize_status TEXT
    CHECK (category_normalize_status IN ('matched', 'unmatched', 'manual_override'));

COMMENT ON COLUMN design_items.category_normalized IS 'PR#4: 12 표준 카테고리 정규화 결과. unmatched면 NULL.';
COMMENT ON COLUMN design_items.category_normalize_status IS 'PR#4: matched=학습 풀 포함 / unmatched=제외+로그 / manual_override=관리자 매핑';

CREATE INDEX IF NOT EXISTS idx_design_items_normalize_status
  ON design_items(category_normalize_status)
  WHERE category_normalize_status IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- ③ 미분류 누적 로그 테이블
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS unmatched_category_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_category TEXT NOT NULL UNIQUE,
  occurrences INTEGER DEFAULT 1 NOT NULL,
  first_seen TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_seen TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_to TEXT,
  sample_design_item_id UUID REFERENCES design_items(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_unmatched_category_log_resolved
  ON unmatched_category_log(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_unmatched_category_log_last_seen
  ON unmatched_category_log(last_seen DESC) WHERE resolved_at IS NULL;

COMMENT ON TABLE unmatched_category_log IS 'PR#4: 12 표준 카테고리에 매칭 실패한 raw_category 누적. 관리자가 학습 관리자 UI에서 매핑.';

-- ═══════════════════════════════════════════════════════════════
-- ④ 잔존 localStorage 4종 → DB 영속화
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE signage_aliases ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE signage_types  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE signage_types  ADD COLUMN IF NOT EXISTS sample_image_url TEXT;
ALTER TABLE venues         ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN signage_aliases.is_hidden IS 'PR#4: localStorage mice_hidden_seed_aliases 대체';
COMMENT ON COLUMN signage_types.is_hidden IS 'PR#4: localStorage mice_hidden_signage_types 대체';
COMMENT ON COLUMN signage_types.sample_image_url IS 'PR#4: localStorage mice_signage_type_samples 대체 (모든 사용자 공유)';
COMMENT ON COLUMN venues.is_hidden IS 'PR#4: localStorage mice_hidden_facility_venues 대체';

-- ═══════════════════════════════════════════════════════════════
-- ⑤ RLS 정책 — unmatched_category_log
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE unmatched_category_log ENABLE ROW LEVEL SECURITY;

-- admin = 전체 권한
DROP POLICY IF EXISTS "admin full access unmatched_category_log" ON unmatched_category_log;
CREATE POLICY "admin full access unmatched_category_log" ON unmatched_category_log
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 일반 사용자도 INSERT는 가능 (design_items INSERT 시점에 자동 호출)
DROP POLICY IF EXISTS "user can insert unmatched" ON unmatched_category_log;
CREATE POLICY "user can insert unmatched" ON unmatched_category_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- 일반 사용자 SELECT — design_items.category_normalize_status 매핑 추적 시 활용
DROP POLICY IF EXISTS "user can read unmatched" ON unmatched_category_log;
CREATE POLICY "user can read unmatched" ON unmatched_category_log
  FOR SELECT TO authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════
-- 검증 (실행 후 확인용)
-- ═══════════════════════════════════════════════════════════════
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'design_items' AND column_name IN ('created_by_ai', 'ai_initial_category', 'category_normalized', 'category_normalize_status');
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'unmatched_category_log';
-- SELECT column_name FROM information_schema.columns WHERE table_name IN ('signage_aliases', 'signage_types', 'venues') AND column_name = 'is_hidden';
