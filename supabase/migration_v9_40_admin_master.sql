-- ============================================================
-- v9.40 — 어드민 마스터 CRUD + AI 추천 자동 주입 보강 마이그레이션
-- v9.37(테이블 보강 + 시드 동기화) 이후 추가 사이클로,
-- recommendSignage가 어드민 DB 데이터를 직접 조회해 AI 프롬프트에 합치도록 인덱스 보강.
--
-- 전제: v9.15 (facility_guide_json) + v9.37 (signage_types/aliases 보강·시드)
--       이미 실행됨. 본 SQL은 idempotent — 재실행 안전.
-- PM 액션: Supabase Studio → SQL Editor 전체 실행 (v9.37 위에 누적)
-- ============================================================

-- ── 1. signage_types — 어드민 추가 종류 자동 조회용 인덱스 ────
-- adminMasterContext.ts의 .eq('is_standard', false).order('sort_order')
-- 패턴을 위한 부분 인덱스 (시드 13종 제외, 추가 종류만 빠르게 조회).
CREATE INDEX IF NOT EXISTS signage_types_extra_idx
  ON public.signage_types(sort_order)
  WHERE is_standard = false;

-- ── 2. signage_aliases — 어드민 추가 동의어 자동 조회용 인덱스 ──
-- adminMasterContext.ts의 .eq('source', 'manual').order('canonical_name')
-- 패턴을 위한 부분 인덱스 (seed 47건 제외, 추가 동의어만).
CREATE INDEX IF NOT EXISTS signage_aliases_manual_idx
  ON public.signage_aliases(canonical_name, alias_name)
  WHERE source = 'manual';

-- ── 3. venues.facility_guide_json — 행사장 매칭용 인덱스 ──────
-- adminMasterContext.ts의 .ilike('name', '%X%').not('facility_guide_json', 'is', null)
-- 패턴을 위한 부분 인덱스.
CREATE INDEX IF NOT EXISTS venues_facility_guide_loaded_idx
  ON public.venues(name)
  WHERE facility_guide_json IS NOT NULL;

-- ── 4. signage_types — admin 가드 정책 재확인 (v9.37 동일 패턴) ──
-- 어드민이 새 종류를 추가/수정/삭제할 때 isAdmin() 통과 필요.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'signage_types'
      AND policyname = 'signage_types: admin write'
  ) THEN
    EXECUTE 'CREATE POLICY "signage_types: admin write" ON public.signage_types
      FOR ALL TO authenticated
      USING (public.is_admin()) WITH CHECK (public.is_admin())';
  END IF;
END $$;

-- ── 5. signage_aliases — admin 가드 정책 재확인 ──────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'signage_aliases'
      AND policyname = 'signage_aliases: admin write'
  ) THEN
    EXECUTE 'CREATE POLICY "signage_aliases: admin write" ON public.signage_aliases
      FOR ALL TO authenticated
      USING (public.is_admin()) WITH CHECK (public.is_admin())';
  END IF;
END $$;

-- ── 6. venue_correction_requests — admin 가드 정책 재확인 ────
-- status 변경(승인·반려·해결)은 어드민만.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'venue_correction_requests'
      AND policyname = 'venue_correction_requests: admin write'
  ) THEN
    EXECUTE 'CREATE POLICY "venue_correction_requests: admin write" ON public.venue_correction_requests
      FOR UPDATE TO authenticated
      USING (public.is_admin()) WITH CHECK (public.is_admin())';
  END IF;
END $$;

-- ── 검증 쿼리 (참고) ───────────────────────────────────────
-- SELECT count(*) FROM public.signage_types WHERE is_standard = false;   -- 어드민 추가 종류 수
-- SELECT count(*) FROM public.signage_aliases WHERE source = 'manual';   -- 어드민 추가 동의어 수
-- SELECT count(*) FROM public.venues WHERE facility_guide_json IS NOT NULL; -- 시설 가이드 등록 행사장 수
-- SELECT count(*) FROM public.venue_correction_requests WHERE status = 'pending'; -- 처리 대기 수정요청
