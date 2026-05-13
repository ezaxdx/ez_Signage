-- ============================================================
-- v9.37 — 어드민 마스터 CRUD 통합 마이그레이션
-- 시안 6 평면 메뉴(행사장 학습 현황·행사장·환경장식물 종류·동의어·시설 가이드·수정요청)
-- 기존 테이블(signage_types · signage_aliases · venues · facility_exception_log · venue_correction_requests)
-- 보강 + 표준 RLS + 시드 동기화. 기존 컬럼·데이터 보존.
-- PM 액션: Supabase Studio → SQL Editor 전체 실행
-- ============================================================

-- ── 0. 공통 admin 가드 헬퍼(있으면 통과) ─────────────────────
-- public.is_admin() 함수는 migration_v3_all.sql / migration_v6_v4_1_fixed.sql 에서 정의됨.
-- 본 마이그레이션은 함수 존재 가정. 미존재 시 v3/v6 먼저 실행 필요.

-- ── 1. signage_types(환경장식물 종류) 보강 ───────────────────
ALTER TABLE public.signage_types
  ADD COLUMN IF NOT EXISTS layout text CHECK (layout IN ('세로','가로','정사각')),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 13종 표준 시드 동기화 (is_standard = true, 변경 불가 락)
INSERT INTO public.signage_types
  (name, category, default_width_mm, default_height_mm, default_material, layout, is_standard, sort_order, notes)
VALUES
  ('X배너',         '배너',   600,  1800, 'PET',       '세로',  true,  1,  '입구·등록'),
  ('I배너',         '배너',   600,  1600, 'PET',       '세로',  true,  2,  '실내 안내'),
  ('가로등 배너',   '배너',   600,  1800, '현수막',    '세로',  true,  3,  '외부 동선'),
  ('가로 현수막',   '현수막', 5000,  900, '현수막',    '가로',  true,  4,  '메인·외벽'),
  ('세로 현수막',   '현수막',  900, 5000, '현수막',    '세로',  true,  5,  '로비·천장'),
  ('통천 배너',     '현수막', 1000, 5000, '현수막',    '세로',  true,  6,  '천장 대형'),
  ('포디움 타이틀', '기타',    600,  200, '스티커',    '가로',  true,  7,  '연단'),
  ('A4 세로',       '기타',    210,  297, '인쇄',      '세로',  true,  8,  '소형 안내'),
  ('A4 가로',       '기타',    297,  210, '인쇄',      '가로',  true,  9,  '소형 안내'),
  ('A3 세로',       '기타',    297,  420, '인쇄',      '세로',  true, 10,  '중형 안내'),
  ('A3 가로',       '기타',    420,  297, '인쇄',      '가로',  true, 11,  '중형 안내'),
  ('폼보드',        '기타',    600,  900, '폼보드 5T', '세로',  true, 12,  '스탠드POP·L보드·큐방 포함'),
  ('시트지',        '기타',   1650,  920, '시트지',    '가로',  true, 13,  '출입구 유리창 부착')
ON CONFLICT (name) DO UPDATE
  SET default_width_mm  = EXCLUDED.default_width_mm,
      default_height_mm = EXCLUDED.default_height_mm,
      default_material  = EXCLUDED.default_material,
      layout            = EXCLUDED.layout,
      notes             = EXCLUDED.notes,
      sort_order        = EXCLUDED.sort_order,
      is_standard       = EXCLUDED.is_standard,
      updated_at        = now();

-- RLS 정책(존재 시 교체)
ALTER TABLE public.signage_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "signage_types: read all"   ON public.signage_types;
DROP POLICY IF EXISTS "signage_types: admin write" ON public.signage_types;
DROP POLICY IF EXISTS "auth read"                  ON public.signage_types;
DROP POLICY IF EXISTS "auth write"                 ON public.signage_types;
CREATE POLICY "signage_types: read all"   ON public.signage_types
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "signage_types: admin write" ON public.signage_types
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS signage_types_sort_idx ON public.signage_types(sort_order);

-- ── 2. signage_aliases(동의어 매핑) 보강 ─────────────────────
ALTER TABLE public.signage_aliases
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 47건 시드 보강(이미 있으면 noop). alias_name 기준 유니크.
CREATE UNIQUE INDEX IF NOT EXISTS signage_aliases_alias_unique
  ON public.signage_aliases (lower(alias_name));

INSERT INTO public.signage_aliases (alias_name, canonical_name, kind, source, note) VALUES
  ('스프링배너',         'X배너',         'banner',  'seed', '스프링 구조 X형'),
  ('스프링 배너',        'X배너',         'banner',  'seed', '동일'),
  ('스프링베너',         'X배너',         'banner',  'seed', '오타'),
  ('롤업배너',           'X배너',         'banner',  'seed', 'X배너 계열'),
  ('롤업 배너',          'X배너',         'banner',  'seed', '공백 변형'),
  ('팝업배너',           'X배너',         'banner',  'seed', 'X배너 계열'),
  ('A배너',              'X배너',         'banner',  'seed', 'A형 스탠드'),
  ('I배너',              'I배너',         'banner',  'seed', '표준명'),
  ('드롭배너',           '세로 현수막',   'banner',  'seed', '천장 드롭'),
  ('난간배너',           '세로 현수막',   'banner',  'seed', '난간 부착'),
  ('드롭 배너',          '세로 현수막',   'banner',  'seed', '공백 변형'),
  ('대형현수막',         '통천 배너',     'banner',  'seed', '천장 걸이형'),
  ('천장배너',           '통천 배너',     'banner',  'seed', '동일'),
  ('천정배너',           '통천 배너',     'banner',  'seed', '오타'),
  ('천정 배너',          '통천 배너',     'banner',  'seed', '공백 변형'),
  ('무빙워크캐노피배너', '통천 배너',     'banner',  'seed', '코엑스 특수'),
  ('가로현수막',         '가로 현수막',   'banner',  'seed', '공백 없는 표기'),
  ('가로 현수막',        '가로 현수막',   'banner',  'seed', '표준명'),
  ('세로현수막',         '세로 현수막',   'banner',  'seed', '공백 없는 표기'),
  ('가로등배너',         '가로등 배너',   'banner',  'seed', '공백 없는 표기'),
  ('빵빠레배너',         '가로등 배너',   'banner',  'seed', '구어'),
  ('폴대배너',           '가로등 배너',   'banner',  'seed', '폴대 부착'),
  ('물통배너',           '가로등 배너',   'banner',  'seed', '바닥 물통'),
  ('포디움배너',         '포디움 타이틀', 'podium',  'seed', '포디움 전면'),
  ('포디움 타이틀',      '포디움 타이틀', 'podium',  'seed', '표준명'),
  ('렉턴배너',           '포디움 타이틀', 'podium',  'seed', '연단 전면'),
  ('연단배너',           '포디움 타이틀', 'podium',  'seed', '동일'),
  ('피켓A4',             'A4 세로',       'sign',    'seed', 'A4 피켓'),
  ('피켓A3',             'A3 세로',       'sign',    'seed', 'A3 피켓'),
  ('A4가로',             'A4 가로',       'sign',    'seed', '공백 없는 표기'),
  ('A4세로',             'A4 세로',       'sign',    'seed', '공백 없는 표기'),
  ('A3가로',             'A3 가로',       'sign',    'seed', '공백 없는 표기'),
  ('A3세로',             'A3 세로',       'sign',    'seed', '공백 없는 표기'),
  ('거리두기 스티커',    '시트지',        'sign',    'seed', '바닥 스티커'),
  ('발자국 스티커',      '시트지',        'sign',    'seed', '바닥 스티커'),
  ('유도사인',           '시트지',        'sign',    'seed', '바닥 유도'),
  ('포토월',             '폼보드',        'sign',    'seed', '기념촬영 보드'),
  ('기념촬영보드',       '폼보드',        'sign',    'seed', '동일'),
  ('현황판',             '폼보드',        'sign',    'seed', '안내판'),
  ('영접피켓',           '폼보드',        'sign',    'seed', '의전'),
  ('시상보드',           '폼보드',        'sign',    'seed', '시상식'),
  ('L보드',              '폼보드',        'sign',    'seed', 'L자 스탠드'),
  ('스탠드POP',          '폼보드',        'sign',    'seed', '입식 안내'),
  ('큐방',               '폼보드',        'sign',    'seed', 'Q방·대기 안내'),
  ('Q방',                '폼보드',        'sign',    'seed', '동일'),
  ('행사 룸사인',        '폼보드',        'sign',    'seed', '회의실 안내'),
  ('진입 아치',          '가로 현수막',   'banner',  'seed', '게이트 상단')
ON CONFLICT (alias_name) DO NOTHING;

-- RLS 정책
ALTER TABLE public.signage_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "signage_aliases: read all"    ON public.signage_aliases;
DROP POLICY IF EXISTS "signage_aliases: admin write" ON public.signage_aliases;
CREATE POLICY "signage_aliases: read all"    ON public.signage_aliases
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "signage_aliases: admin write" ON public.signage_aliases
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS signage_aliases_canonical_idx ON public.signage_aliases(canonical_name);
CREATE INDEX IF NOT EXISTS signage_aliases_source_idx    ON public.signage_aliases(source);

-- ── 3. venues(행사장 마스터) 보강 ────────────────────────────
ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS short_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS manual_url text,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS venues_region_idx     ON public.venues(region);
CREATE INDEX IF NOT EXISTS venues_venue_type_idx ON public.venues(venue_type);

-- ── 4. venue_correction_requests(수정요청) 보강 ──────────────
-- migration_v9_15_facility_guide.sql에서 생성됨. status 워크플로 인덱스 추가.
CREATE INDEX IF NOT EXISTS venue_correction_requests_status_idx
  ON public.venue_correction_requests(status, created_at DESC);

-- 추가 status 값 허용 (pending/approved/rejected/resolved)
-- 기존 컬럼은 TEXT NOT NULL DEFAULT 'pending' — CHECK 없음. 새 CHECK 추가.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'venue_correction_requests_status_chk'
  ) THEN
    ALTER TABLE public.venue_correction_requests
      ADD CONSTRAINT venue_correction_requests_status_chk
      CHECK (status IN ('pending','approved','rejected','resolved'));
  END IF;
END $$;

-- ── 5. facility_exception_log RLS 보강(필요시) ──────────────
-- migration_v9_16_exception_learning.sql에서 정의됨. admin SELECT 정책만 재확인.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'facility_exception_log'
  ) THEN
    EXECUTE 'ALTER TABLE public.facility_exception_log ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "facility_exception_log: admin select" ON public.facility_exception_log';
    EXECUTE 'CREATE POLICY "facility_exception_log: admin select" ON public.facility_exception_log
      FOR SELECT TO authenticated USING (public.is_admin())';
  END IF;
END $$;

-- ── 검증 쿼리(참고) ──────────────────────────────────────────
-- SELECT count(*) FROM public.signage_types WHERE is_standard = true;   -- 13
-- SELECT count(*) FROM public.signage_aliases WHERE source = 'seed';   -- 47
-- SELECT count(*) FROM public.venues;                                  -- 등록 행사장 수
-- SELECT count(*) FROM public.venue_correction_requests
--   WHERE status = 'pending';                                          -- 처리 대기
