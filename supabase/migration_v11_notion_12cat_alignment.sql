-- migration_v11_notion_12cat_alignment.sql
-- 작성: 2026-05-18 (사이클 6 — DB 마이그레이션 노션 §6-2 12 카테고리 정합)
-- 출처: 노션 컴펌 본 페이지 36148589-8ea1-81d7-8b55-d1bd771a40a1
-- 변경 사유:
--   - 5/18 PO 명시 = 노션 §6-2 마스터 12 카테고리 SOT
--   - A4·A3 가로/세로 분리 (12 카테고리 = 10종 + A4 가로/세로 + A3 가로/세로 = 12)
--   - 실내 동선 신규 (route_banner) — 5/14 회의 X배너 분리 결정
--   - 노션 §8-1 동의어 매핑 표 정합
--
-- 실행 위치: Supabase Studio → SQL Editor (사용자 직접)
-- 실행 전제: 곽 이사 컴펌 완료 (5/18)
--
-- 안전성:
--   - idempotent (재실행 안전 — IF NOT EXISTS·ON CONFLICT 사용)
--   - design_items.category 기존 데이터 보존 (제거 X·매핑만 추가)
--   - 운영 데이터 영향 0건 (잔존 카테고리는 호환 유지)

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. signage_categories 마스터 테이블 (노션 §6-2 12 카테고리)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS signage_categories (
  category_key text PRIMARY KEY,
  label text NOT NULL,
  default_width_mm integer NOT NULL,
  default_height_mm integer NOT NULL,
  layout text NOT NULL CHECK (layout IN ('vertical', 'horizontal')),
  material text NOT NULL,
  classification text NOT NULL,
  is_standard boolean NOT NULL DEFAULT true,
  notion_source text NOT NULL DEFAULT '36148589-8ea1-81d7-8b55-d1bd771a40a1 §6-2',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 노션 §6-2 표 12 카테고리 시드 (idempotent — ON CONFLICT 처리)
INSERT INTO signage_categories (category_key, label, default_width_mm, default_height_mm, layout, material, classification)
VALUES
  ('x_banner',           'X배너',         600,  1800, 'vertical',   'PET',      '입구·등록'),
  ('i_banner',           'I배너',         600,  1600, 'vertical',   'PET',      '실내 안내'),
  ('streetlight_banner', '가로등 배너',   600,  1800, 'vertical',   '현수막',   '외부 동선'),
  ('horizontal_banner',  '가로 현수막',   5000, 900,  'horizontal', '현수막',   '메인·외벽'),
  ('vertical_banner',    '세로 현수막',   900,  5000, 'vertical',   '현수막',   '로비·천장'),
  ('chunchen_banner',    '통천',          1000, 5000, 'vertical',   '현수막',   '천장 대형'),
  ('podium',             '포디움 타이틀', 600,  200,  'horizontal', '스티커',   '연단'),
  ('a4_portrait',        'A4 세로',       210,  297,  'vertical',   '인쇄',     '소형 안내'),
  ('a4_landscape',       'A4 가로',       297,  210,  'horizontal', '인쇄',     '소형 안내'),
  ('a3_portrait',        'A3 세로',       297,  420,  'vertical',   '인쇄',     '중형 안내'),
  ('a3_landscape',       'A3 가로',       420,  297,  'horizontal', '인쇄',     '중형 안내'),
  ('route_banner',       '동선 배너',     600,  1500, 'vertical',   '현수막',   '실내 동선')
ON CONFLICT (category_key) DO UPDATE SET
  label = EXCLUDED.label,
  default_width_mm = EXCLUDED.default_width_mm,
  default_height_mm = EXCLUDED.default_height_mm,
  layout = EXCLUDED.layout,
  material = EXCLUDED.material,
  classification = EXCLUDED.classification;

-- ────────────────────────────────────────────────────────────
-- 2. signage_aliases (노션 §8-1 동의어 표 정합)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS signage_aliases (
  alias text PRIMARY KEY,
  canonical_key text NOT NULL REFERENCES signage_categories(category_key),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO signage_aliases (alias, canonical_key, note) VALUES
  -- A4 가로 영역 (손피켓 가로 기본·5/7 결정)
  ('피켓(A4)',              'a4_landscape', '5/7 결정 손피켓 가로 기본'),
  ('피켓 A4',               'a4_landscape', '5/7 결정 손피켓 가로 기본'),
  ('피켓A4',                'a4_landscape', '5/7 결정 손피켓 가로 기본'),
  ('영접A4',                'a4_landscape', '영접·영송 손피켓'),
  ('A4안내',                'a4_landscape', '데스크 안내'),
  ('명패',                  'a4_landscape', '소형 명패'),
  ('웰컴 피켓',             'a4_landscape', '소형 손피켓'),
  ('큐방',                  'a4_landscape', '폼보드 재질 발주'),
  ('큐방시트',              'a4_landscape', '폼보드 재질 발주'),
  ('셔틀버스 큐방시트',     'a4_landscape', '폼보드 재질 발주'),
  -- A3 가로 영역
  ('피켓(A3)',              'a3_landscape', '5/7 결정 손피켓 가로 기본'),
  ('피켓 A3',               'a3_landscape', '5/7 결정 손피켓 가로 기본'),
  ('피켓A3',                'a3_landscape', '5/7 결정 손피켓 가로 기본'),
  ('A3안내',                'a3_landscape', '데스크 안내'),
  ('A3안내POP',             'a3_landscape', 'POP 안내'),
  ('명패 (대)',             'a3_landscape', '대형 명패'),
  ('명패(대)',              'a3_landscape', '대형 명패'),
  ('웰컴보드',              'a3_landscape', '대형 안내'),
  ('시상보드',              'a3_landscape', '시상식 안내'),
  ('시상 보드',             'a3_landscape', '시상식 안내'),
  ('컨설팅폼보드',          'a3_landscape', '4단계 안내'),
  ('좌석배치도 안내사인',   'a3_landscape', '배치도 안내판'),
  ('기념촬영보드',          'a3_landscape', '포토존 보드'),
  ('안내폼보드',            'a3_landscape', '크기에 따라 A4 또는 A3'),
  ('L보드',                 'a3_landscape', '로비·동선·라운지 안내'),
  ('안내사인',              'a3_landscape', '크기에 따라 A4 또는 A3'),
  -- I배너 영역
  ('스탠드POP',             'i_banner',     '폼보드형 스탠드 POP'),
  -- X배너 영역
  ('스프링 배너',           'x_banner',     '표기 변형·거치형'),
  ('스프링배너',            'x_banner',     '표기 변형·거치형'),
  ('롤업배너',              'x_banner',     '표기 변형'),
  ('배너스탠드',            'x_banner',     '거치형'),
  ('철재스프링배너',        'x_banner',     '거치형'),
  ('A배너',                 'x_banner',     '표기 변형'),
  ('물통배너',              'x_banner',     '물통 무게추'),
  ('기타 배너',             'x_banner',     '표기 변형'),
  -- 가로 현수막 영역
  ('실사출력',              'horizontal_banner', '재질 표기'),
  ('투어용 현수막',         'horizontal_banner', '이동용'),
  ('상단 배너',             'horizontal_banner', '상단 부착'),
  ('MOU 현수막',            'horizontal_banner', '행사 현수막'),
  -- 가로등 배너 영역
  ('빵빠레배너',            'streetlight_banner', '폴에 거는 세로형·외부 동선'),
  -- 세로 현수막 영역
  ('난간배너',              'vertical_banner', '난간·계단 설치'),
  ('드롭배너',              'vertical_banner', '천장 매다는 형태'),
  -- 통천 영역
  ('천장배너',              'chunchen_banner', '천장 매다는 대형'),
  ('천정배너',              'chunchen_banner', '천정 매다는 형태 (천장 동일)'),
  ('장폭_천정배너_단면',    'chunchen_banner', '장폭 천정 단면 인쇄'),
  ('장폭_천정배너_양면',    'chunchen_banner', '장폭 천정 양면 인쇄'),
  ('행잉 배너',             'chunchen_banner', '천장 매달기 영문 표현'),
  ('출입구 천정 배너',      'chunchen_banner', '출입구 V자형 천장 배너'),
  -- 포디움 영역
  ('포디움 1',              'podium', '복수 표기'),
  ('포디움 2',              'podium', '복수 표기'),
  ('1인용 포디움',          'podium', '단상 표기'),
  ('개막식 포디움',         'podium', '단상 표기'),
  ('연단',                  'podium', '한자어 표기')
ON CONFLICT (alias) DO UPDATE SET
  canonical_key = EXCLUDED.canonical_key,
  note = EXCLUDED.note;

-- ────────────────────────────────────────────────────────────
-- 3. design_items 인덱스 (12 카테고리 조회 성능 보강)
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_design_items_category
  ON design_items (category);

-- ────────────────────────────────────────────────────────────
-- 4. RLS (signage_categories·signage_aliases — 전체 사용자 read)
-- ────────────────────────────────────────────────────────────

ALTER TABLE signage_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE signage_aliases    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS signage_categories_read_all ON signage_categories;
CREATE POLICY signage_categories_read_all ON signage_categories
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS signage_aliases_read_all ON signage_aliases;
CREATE POLICY signage_aliases_read_all ON signage_aliases
  FOR SELECT TO authenticated, anon USING (true);

-- admin 권한 (is_admin() 함수는 migration_v3_all.sql에서 정의됨)
DROP POLICY IF EXISTS signage_categories_admin_write ON signage_categories;
CREATE POLICY signage_categories_admin_write ON signage_categories
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS signage_aliases_admin_write ON signage_aliases;
CREATE POLICY signage_aliases_admin_write ON signage_aliases
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

COMMIT;

-- ────────────────────────────────────────────────────────────
-- 실행 후 확인 쿼리 (Supabase Studio·선택 실행)
-- ────────────────────────────────────────────────────────────
-- SELECT category_key, label, default_width_mm, default_height_mm FROM signage_categories ORDER BY classification;
-- SELECT canonical_key, count(*) AS alias_count FROM signage_aliases GROUP BY canonical_key ORDER BY canonical_key;
-- SELECT category, count(*) FROM design_items GROUP BY category ORDER BY count DESC;
