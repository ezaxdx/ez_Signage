-- ============================================================
-- migration_v10_new_structure.sql
-- 5/14 회의 결정 사항 반영 — 환경장식물 발주 툴 새 구조
-- 작성: 2026-05-15
-- SOT: docs/NEW_STRUCTURE_260514.md
-- ============================================================
--
-- 적용 절차:
--   1. 컴펌 후 Supabase Studio SQL Editor에서 본 파일 RUN
--   2. lib/data/v2/* 시드 import (signageCategoriesSeed·venueListSeed·eventOrderListSeed)
--   3. lib/ai/v2/recommendationLogic.ts 활성화
--   4. UI 갱신 (환경장식물 종류 관리 24종 반영)
--
-- 기존 테이블 호환:
--   - signage_types (11종 기존) → signage_categories (24종 신규)
--   - venues (30개) → venues + venue_halls (L2 신설)
--   - design_items 컬럼 보강 (category_v2, no_data_flag 등)
--
-- ============================================================

-- ============================================================
-- 1. signage_categories — 15 확정 + 9 pending = 24종 마스터
-- ============================================================
CREATE TABLE IF NOT EXISTS signage_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,                -- outer_wall, route_banner, did_signage 등
  label TEXT NOT NULL,                     -- 외벽 가로현수막, 동선 배너 등
  description TEXT NOT NULL,
  is_pending BOOLEAN NOT NULL DEFAULT false,  -- true = 5/14 회의 의제 9종
  priority SMALLINT NOT NULL CHECK (priority IN (1, 2, 3)),
  typical_size_mm JSONB NOT NULL,          -- {min_width, max_width, min_height, max_height}
  match_keywords TEXT[] NOT NULL DEFAULT '{}',
  source_keywords TEXT[] NOT NULL DEFAULT '{}',
  default_quantity_formula TEXT NOT NULL,
  parent_category_key TEXT,                -- 통합 검토 후보 (pop_special → form_board_pop)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signage_categories_pending ON signage_categories(is_pending);
CREATE INDEX IF NOT EXISTS idx_signage_categories_priority ON signage_categories(priority);

COMMENT ON TABLE signage_categories IS '환경장식물 24종 마스터 (5/14 회의 + SPP 47종 학습 결과)';
COMMENT ON COLUMN signage_categories.is_pending IS 'true = 컴펌 안 났음 (9종 의제, 채택/거절/통합 후 false)';

-- ============================================================
-- 2. venues 보강 — 12항목 시설 가이드 메타 (5/14 회의 확정 12항목)
-- ============================================================
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS venue_specs JSONB,       -- 12항목 메타
  ADD COLUMN IF NOT EXISTS specs_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS has_full_specs BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS facility_guide_url TEXT;

COMMENT ON COLUMN venues.venue_specs IS '12항목 메타: area_sqm, ceiling_height_m, seat_count, entrance_locations, main_route, allowed_categories, denied_categories, size_constraints, electrical_audio, facility_guide_url, learned_at, additional_memo';

-- ============================================================
-- 3. venue_halls — L2 (상세 행사장/홀) 신설
-- ============================================================
CREATE TABLE IF NOT EXISTS venue_halls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                      -- 그랜드볼룸, 아셈볼룸, 제1전시장 3-4-5홀
  parent_hall_id UUID REFERENCES venue_halls(id),  -- 홀 안 부속 공간 계층
  hall_specs JSONB,                        -- 홀 단위 12항목 메타
  area_sqm NUMERIC,
  ceiling_height_m NUMERIC,
  seat_count INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_halls_venue ON venue_halls(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_halls_active ON venue_halls(is_active);

COMMENT ON TABLE venue_halls IS 'L2 상세 행사장/홀 (5/14 회의: 코엑스 그랜드볼룸·아셈볼룸·오디토리움 / 킨텍스 1전시장 3-4-5홀 등)';

-- ============================================================
-- 4. event_series — 연도별 반복 행사 시리즈
-- ============================================================
CREATE TABLE IF NOT EXISTS event_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                      -- BCWW, KME, 스마트국토엑스포
  code_pattern TEXT,                       -- 행사 코드 패턴 (BCWW = 18,19,20)
  description TEXT,
  default_venue_id UUID REFERENCES venues(id),  -- 통상 개최 행사장
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_series_name ON event_series(name);

COMMENT ON TABLE event_series IS '연도별 반복 행사 시리즈 (BCWW 18·19·20, KME 18·19, 스마트국토 18·19 등)';

-- ============================================================
-- 5. events — L3 (진행 행사) 보강
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,                        -- YYNNNN (183090 BCWW 2018)
  name TEXT NOT NULL,
  year INTEGER,
  event_series_id UUID REFERENCES event_series(id),
  venue_id UUID NOT NULL REFERENCES venues(id),
  hall_ids UUID[] NOT NULL DEFAULT '{}',   -- 사용 홀 (다중)
  area_sqm NUMERIC,                        -- 행사 면적 (㎡)
  expected_attendees INTEGER,
  is_international BOOLEAN NOT NULL DEFAULT false,
  has_vip BOOLEAN NOT NULL DEFAULT false,
  program_parts TEXT[] NOT NULL DEFAULT '{}',
  event_date DATE,
  setup_date DATE,
  teardown_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_venue ON events(venue_id);
CREATE INDEX IF NOT EXISTS idx_events_series ON events(event_series_id);
CREATE INDEX IF NOT EXISTS idx_events_year ON events(year);

COMMENT ON COLUMN events.code IS 'YYNNNN 6자리 (예: 183090 = 2018 BCWW, 245006 = 2024 SPP)';

-- ============================================================
-- 6. event_signage_orders — N:M 매핑 (행사 × 카테고리 × 환경장식물)
-- ============================================================
CREATE TABLE IF NOT EXISTS event_signage_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category_key TEXT NOT NULL REFERENCES signage_categories(key),
  program_part TEXT,                       -- 40.04~40.20
  location TEXT,                           -- 자유 텍스트 (B홀 입구 에스컬레이터 상단 등)
  size_width_mm INTEGER,
  size_height_mm INTEGER,
  quantity INTEGER NOT NULL DEFAULT 1,
  purpose TEXT,                            -- 정적 vs 동선 (x_banner_static vs route_banner 분기)
  notes TEXT,
  /** 학습 가중치 */
  data_stage TEXT NOT NULL DEFAULT 'finalized' CHECK (data_stage IN ('input', 'mid', 'confirmed', 'finalized')),
  weight INTEGER NOT NULL DEFAULT 100,     -- 10·30·70·100% (단계별)
  /** 메타 */
  source_file TEXT,                        -- 학습 출처 (BCWW_2018.csv 등)
  source_row INTEGER,                      -- Excel row 번호
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_orders_event ON event_signage_orders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_orders_category ON event_signage_orders(category_key);
CREATE INDEX IF NOT EXISTS idx_event_orders_part ON event_signage_orders(program_part);
CREATE INDEX IF NOT EXISTS idx_event_orders_stage ON event_signage_orders(data_stage);

COMMENT ON TABLE event_signage_orders IS 'N:M 매핑 — 행사 × 카테고리 × 환경장식물 row. 학습 데이터 + 신규 발주 모두 적재.';
COMMENT ON COLUMN event_signage_orders.weight IS '단계별 가중치 (input 10·mid 30·confirmed 70·finalized 100)';

-- ============================================================
-- 7. venue_category_coverage — 행사장 × 카테고리 학습 보유 매트릭스
-- ============================================================
CREATE TABLE IF NOT EXISTS venue_category_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  category_key TEXT NOT NULL REFERENCES signage_categories(key),
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'denied', 'unknown')),
  /** 학습 데이터 */
  order_count INTEGER NOT NULL DEFAULT 0,  -- 누적 발주 건수
  avg_size_width_mm INTEGER,
  avg_size_height_mm INTEGER,
  avg_quantity NUMERIC,
  last_seen_date DATE,
  source TEXT,                             -- 'facility_guide' / 'order_history' / 'manual'
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(venue_id, category_key)
);

CREATE INDEX IF NOT EXISTS idx_venue_coverage_venue ON venue_category_coverage(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_coverage_status ON venue_category_coverage(status);

COMMENT ON TABLE venue_category_coverage IS '행사장 × 카테고리 학습 보유 매트릭스 (30 venues × 24 categories = 720 셀)';

-- ============================================================
-- 8. ai_recommendation_logs — AI 추천 로그 (4단 안전망 ④ 모니터링)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_recommendation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  /** 입력 */
  venue_id UUID REFERENCES venues(id),
  hall_ids UUID[],
  program_parts TEXT[],
  event_meta JSONB,                        -- attendees, is_international, has_vip 등
  has_floor_plan BOOLEAN NOT NULL DEFAULT false,
  /** 출력 */
  recommended_items JSONB NOT NULL,        -- RecommendItemV2[]
  total_items INTEGER NOT NULL DEFAULT 0,
  no_data_items INTEGER NOT NULL DEFAULT 0,
  facility_violation_items INTEGER NOT NULL DEFAULT 0,
  fallback_used BOOLEAN NOT NULL DEFAULT false,
  /** 메트릭 */
  api_model TEXT,                          -- gemini-2.5-flash 등
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_krw NUMERIC,
  duration_ms INTEGER,
  /** 사용자 피드백 */
  user_corrected BOOLEAN NOT NULL DEFAULT false,
  correction_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recommend_logs_user ON ai_recommendation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_recommend_logs_venue ON ai_recommendation_logs(venue_id);
CREATE INDEX IF NOT EXISTS idx_recommend_logs_created ON ai_recommendation_logs(created_at);

COMMENT ON TABLE ai_recommendation_logs IS '4단 안전망 ④ 모니터링용 추천 로그. KPI 산출 + 오답률 추적.';

-- ============================================================
-- 9. ai_persona_revision_queue — 페르소나 자동 보강 큐 (3회 누적 시 알림)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_persona_revision_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule TEXT NOT NULL,                      -- "코엑스 천정 행잉 학습 부재" 등
  rule_hash TEXT NOT NULL UNIQUE,          -- 정규화된 rule (중복 카운트)
  count INTEGER NOT NULL DEFAULT 1,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,                 -- 관리자 검토 완료 시각
  resolved BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_persona_revision_hash ON ai_persona_revision_queue(rule_hash);
CREATE INDEX IF NOT EXISTS idx_persona_revision_pending ON ai_persona_revision_queue(resolved) WHERE resolved = false;

COMMENT ON TABLE ai_persona_revision_queue IS '4단 안전망 ④ — 3회 누적 시 가이드/페르소나 검토 필요 알림';

-- ============================================================
-- 10. design_items 보강 — 새 카테고리 + 안전 플래그
-- ============================================================
ALTER TABLE design_items
  ADD COLUMN IF NOT EXISTS category_v2 TEXT REFERENCES signage_categories(key),
  ADD COLUMN IF NOT EXISTS no_data_flag BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS facility_violation_flag BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_stage TEXT NOT NULL DEFAULT 'input' CHECK (data_stage IN ('input', 'mid', 'confirmed', 'finalized')),
  ADD COLUMN IF NOT EXISTS weight INTEGER NOT NULL DEFAULT 10;

COMMENT ON COLUMN design_items.category_v2 IS '24종 마스터 카테고리 (v2). 기존 category 컬럼과 병존 → 마이그레이션 후 교체';

-- ============================================================
-- 11. RLS 정책 (Row Level Security)
-- ============================================================
ALTER TABLE signage_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_signage_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_category_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_persona_revision_queue ENABLE ROW LEVEL SECURITY;

-- 시드 데이터 모두 SELECT 허용 (앱에서 활용)
CREATE POLICY signage_categories_read ON signage_categories FOR SELECT USING (true);
CREATE POLICY venue_halls_read ON venue_halls FOR SELECT USING (true);
CREATE POLICY event_series_read ON event_series FOR SELECT USING (true);
CREATE POLICY events_read ON events FOR SELECT USING (true);
CREATE POLICY event_signage_orders_read ON event_signage_orders FOR SELECT USING (true);
CREATE POLICY venue_category_coverage_read ON venue_category_coverage FOR SELECT USING (true);

-- INSERT/UPDATE/DELETE는 admin만
CREATE POLICY signage_categories_admin_write ON signage_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY venue_halls_admin_write ON venue_halls FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY event_series_admin_write ON event_series FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY events_admin_write ON events FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY event_signage_orders_admin_write ON event_signage_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY venue_category_coverage_admin_write ON venue_category_coverage FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 로그 테이블: 본인 추천 로그는 본인 SELECT / admin 전체 SELECT
CREATE POLICY recommendation_logs_self ON ai_recommendation_logs FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY recommendation_logs_insert ON ai_recommendation_logs FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY persona_revision_admin ON ai_persona_revision_queue FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- 12. 트리거 — updated_at 자동 갱신
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_signage_categories_updated_at ON signage_categories;
CREATE TRIGGER update_signage_categories_updated_at
  BEFORE UPDATE ON signage_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_venue_halls_updated_at ON venue_halls;
CREATE TRIGGER update_venue_halls_updated_at
  BEFORE UPDATE ON venue_halls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_venue_category_coverage_updated_at ON venue_category_coverage;
CREATE TRIGGER update_venue_category_coverage_updated_at
  BEFORE UPDATE ON venue_category_coverage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 13. 초기 데이터 (15 확정 카테고리만) — 9 pending은 별도 활성화
-- ============================================================
-- INSERT는 lib/data/v2/signageCategoriesSeed.ts에서 진행 (seed_v2.mjs 스크립트)
-- 또는 Supabase Studio에서 직접 INSERT 가능

-- ============================================================
-- 14. 확인 쿼리 (마이그레이션 후 검증)
-- ============================================================
-- SELECT count(*) AS total, count(*) FILTER (WHERE is_pending) AS pending FROM signage_categories;
-- SELECT v.name, count(vc.*) AS coverage_count
--   FROM venues v LEFT JOIN venue_category_coverage vc ON vc.venue_id = v.id
--   GROUP BY v.name ORDER BY coverage_count DESC;
-- SELECT e.code, e.name, count(o.*) AS order_count
--   FROM events e LEFT JOIN event_signage_orders o ON o.event_id = e.id
--   GROUP BY e.id ORDER BY order_count DESC LIMIT 20;
