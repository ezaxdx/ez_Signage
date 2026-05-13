-- ============================================================
-- ez_Signage v5 — 데이터 관리 테이블
-- 기본 환경장식물 종류 + 동의어 + 디자인업체 + 행사이력
-- ============================================================

-- ── 1. 기본 환경장식물 종류 ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.signage_types (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  category      text NOT NULL CHECK (category IN ('배너','현수막','기타')),
  default_width_mm  int,
  default_height_mm int,
  default_material  text,
  is_standard   boolean NOT NULL DEFAULT true,
  sort_order    int NOT NULL DEFAULT 99,
  notes         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ── 2. 동의어 테이블 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.signage_synonyms (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias         text NOT NULL,
  canonical     text NOT NULL,                  -- signage_types.name 참조 (텍스트로 느슨하게 연결)
  note          text,
  created_at    timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS signage_synonyms_alias_unique ON public.signage_synonyms(lower(alias));

-- ── 3. 디자인 업체 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.designers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  avg_lead_days int,        -- 평균 납기 소요일 (데이터 쌓이면 계산)
  revision_rate numeric,    -- 수정 발생률 0~1 (향후)
  avg_revisions numeric,    -- 평균 수정 횟수 (향후)
  created_at    timestamptz DEFAULT now()
);

-- ── 4. 행사 이력 (환경장식물 행사별 폴더에서 수동 또는 자동 임포트) ──
CREATE TABLE IF NOT EXISTS public.event_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_name   text NOT NULL,
  event_name    text,
  project_code  text,
  year          int,
  event_date    date,
  venue         text,
  hall          text,
  department    text,
  client        text,
  event_type    text,
  status        text NOT NULL DEFAULT '미분류'
                  CHECK (status IN ('미분류','분석완료','검토필요')),
  item_count    int DEFAULT 0,    -- 행사에서 사용한 환경장식물 수
  notes         text,
  created_at    timestamptz DEFAULT now()
);

-- ── 5. 행사장 정보 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.venue_info (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  alias         text[],           -- 별칭 배열 (킨텍스 = KINTEX 등)
  region        text,             -- 광역시·도 정식 명칭 (예: 서울특별시 / 경기도 / 광주광역시)
  venue_type    text CHECK (venue_type IN ('컨벤션','전시장','호텔','야외','기타')),
  typical_signage_types text[],  -- 주로 사용하는 환경장식물 목록
  notes         text,
  created_at    timestamptz DEFAULT now()
);

-- ── RLS: 인증된 사용자만 조회 가능 ──────────────────────────
ALTER TABLE public.signage_types    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signage_synonyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_info       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read" ON public.signage_types    FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read" ON public.signage_synonyms FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read" ON public.designers        FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read" ON public.event_history    FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read" ON public.venue_info       FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth write" ON public.signage_types    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth write" ON public.signage_synonyms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth write" ON public.designers        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth write" ON public.event_history    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth write" ON public.venue_info       FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 기본 환경장식물 시드 데이터 ──────────────────────────────
INSERT INTO public.signage_types (name, category, default_width_mm, default_height_mm, default_material, is_standard, sort_order) VALUES
  ('통천 배너',      '배너',    1000, 2000, '실사 출력 천',      true,  1),
  ('가로 현수막',    '현수막',  6000,  600, '디지털 프린팅',     true,  2),
  ('세로 현수막',    '현수막',   600, 1800, '디지털 프린팅',     true,  3),
  ('가로등 배너',    '배너',     600, 1200, '폴리에스터',        true,  4),
  ('X배너',          '배너',     600, 1600, '폴리에스터 혹은 패브릭', true, 5),
  ('I배너',          '배너',     600, 1800, '폴리에스터',        true,  6),
  ('포디움 타이틀',  '기타',     900,  300, '폼보드 또는 아크릴', true, 7),
  ('A4 가로',        '기타',     297,  210, '아트지 코팅',       true,  8),
  ('A4 세로',        '기타',     210,  297, '아트지 코팅',       true,  9),
  ('A3 가로',        '기타',     420,  297, '아트지 코팅',       true, 10),
  ('A3 세로',        '기타',     297,  420, '아트지 코팅',       true, 11)
ON CONFLICT (name) DO NOTHING;

-- ── 동의어 시드 데이터 ───────────────────────────────────────
INSERT INTO public.signage_synonyms (alias, canonical, note) VALUES
  ('스프링배너',     'X배너',       '스프링 구조의 X형 배너 — 통계 시 X배너로 집계'),
  ('스프링 배너',    'X배너',       '동일'),
  ('스프링베너',     'X배너',       '오타 처리'),
  ('롤업배너',       'X배너',       'X배너 계열'),
  ('팝업배너',       'X배너',       'X배너 계열'),
  ('대형현수막',     '통천 배너',   '천장 걸이형 대형 배너'),
  ('천장배너',       '통천 배너',   '동일'),
  ('천정배너',       '통천 배너',   '오타 처리'),
  ('무빙워크캐노피배너', '통천 배너', '코엑스 특수 위치'),
  ('가로현수막',     '가로 현수막', '공백 없는 표기'),
  ('세로현수막',     '세로 현수막', '공백 없는 표기'),
  ('가로등배너',     '가로등 배너', '공백 없는 표기'),
  ('포디움배너',     '포디움 타이틀', '포디움 전면 부착물'),
  ('렉턴배너',       '포디움 타이틀', '연단 전면'),
  ('A4가로',         'A4 가로',     '공백 없는 표기'),
  ('A4세로',         'A4 세로',     '공백 없는 표기'),
  ('A3가로',         'A3 가로',     '공백 없는 표기'),
  ('A3세로',         'A3 세로',     '공백 없는 표기')
ON CONFLICT DO NOTHING;

-- ── 주요 행사장 시드 ─────────────────────────────────────────
INSERT INTO public.venue_info (name, alias, region, venue_type, typical_signage_types) VALUES
  ('코엑스',       ARRAY['COEX','코엑스홀'], '서울 강남', '컨벤션', ARRAY['통천 배너','가로 현수막','X배너','포디움 타이틀']),
  ('킨텍스',       ARRAY['KINTEX','킨텍스 1전시장','킨텍스 2전시장'], '경기 일산', '전시장', ARRAY['통천 배너','가로 현수막','X배너','가로등 배너']),
  ('aT센터',       ARRAY['AT센터','aT 센터'], '서울 양재', '컨벤션', ARRAY['통천 배너','가로 현수막','X배너']),
  ('더케이호텔 서울', ARRAY['더케이호텔','K-Hotel'], '서울', '호텔', ARRAY['포디움 타이틀','X배너','가로 현수막']),
  ('롯데호텔 서울', ARRAY['롯데호텔','Lotte Hotel Seoul'], '서울', '호텔', ARRAY['포디움 타이틀','X배너','세로 현수막']),
  ('코엑스 마곡',  ARRAY['마곡코엑스','coex magok'], '서울 마곡', '컨벤션', ARRAY['통천 배너','X배너','포디움 타이틀']),
  ('수원컨벤션센터', ARRAY['수원 컨벤션'], '경기 수원', '컨벤션', ARRAY['통천 배너','가로 현수막','X배너'])
ON CONFLICT (name) DO NOTHING;

-- ── 행사 이력 시드 (폴더명 기반) ────────────────────────────
INSERT INTO public.event_history (folder_name, event_name, project_code, year, venue, status) VALUES
  ('2024 순환경제 페스티벌 242013', '2024 순환경제 페스티벌', '242013', 2024, '코엑스 마곡', '미분류'),
  ('제17차 한-중앙아 협력 포럼 241014', '제17차 한-중앙아 협력 포럼', '241014', 2024, '롯데호텔 서울', '미분류'),
  ('2024 콘텐츠 IP 마켓 241009', '2024 콘텐츠 IP 마켓', '241009', 2024, '코엑스', '미분류'),
  ('2019 국제방송영상마켓(BCWW) 193800', '2019 국제방송영상마켓(BCWW)', '193800', 2019, '코엑스', '미분류'),
  ('2019 대한민국 식품대전 191200', '2019 대한민국 식품대전', '191200', 2019, 'aT센터', '미분류'),
  ('2020 국제방송영상마켓(BCWW) 203130', '2020 국제방송영상마켓(BCWW)', '203130', 2020, '코엑스', '미분류'),
  ('2035 국가 온실가스 감축목표 대국민 공개 논의 251015', '2035 국가 온실가스 감축목표 대국민 공개 논의', '251015', 2025, NULL, '미분류')
ON CONFLICT DO NOTHING;
