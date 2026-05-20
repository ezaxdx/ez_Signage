-- ============================================
-- migration_v10_4_fix_design_items_no.sql
-- design_items.no NOT NULL 위반 정정 (5/22 라이브 D-2 핫픽스)
-- 작성: 2026-05-19 (v10.4)
-- 실행: Supabase Studio → SQL Editor 직접 RUN (PM 수동)
-- ============================================
-- 컨텍스트:
--   5/19 b979439 ProjectInfoClient.tsx fix 후에도 EditorLayout (items.length+1)
--   SeriesGenerator (currentItemCount+1) 등 다른 INSERT 경로에서 잠재 충돌.
--   DB 트리거 + 클라이언트 헬퍼 이중 방어로 항구 해결.
--
-- 의도 (Step 0):
--   표면 = "null value in column no" 에러 해결
--   진짜 = INSERT 책임 분산 7곳 → DB trigger 단일 책임 통합
--   설계 = SOT는 DB·클라이언트 헬퍼는 보조 (max+1 동일 로직)
-- ============================================

-- 1) 트리거 미설치 환경에서 INSERT 차단 회피 = 임시 NOT NULL 해제
ALTER TABLE design_items ALTER COLUMN no DROP NOT NULL;

-- 2) project_id 단위 순번 자동 채번 트리거
CREATE OR REPLACE FUNCTION set_design_items_no()
RETURNS trigger AS $$
DECLARE
  next_no integer;
BEGIN
  -- no가 NULL 또는 빈 문자열일 때만 자동 채움
  IF NEW.no IS NULL OR NEW.no = '' THEN
    -- 기존 no 중 숫자만 추출하여 max + 1 산출
    -- "01"·"02"·"03" → 1·2·3 → max(3) + 1 = 4 → LPAD = "04"
    SELECT COALESCE(
             MAX(NULLIF(regexp_replace(no, '\D', '', 'g'), '')::int),
             0
           ) + 1
      INTO next_no
      FROM design_items
      WHERE project_id = NEW.project_id;
    NEW.no := LPAD(next_no::text, 2, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_design_items_no ON design_items;
CREATE TRIGGER trg_set_design_items_no
  BEFORE INSERT ON design_items
  FOR EACH ROW EXECUTE FUNCTION set_design_items_no();

-- 3) NOT NULL 재설정 (트리거가 항상 채우므로 안전)
-- 단, 기존 NULL 행이 있으면 먼저 정정
UPDATE design_items
   SET no = '00'  -- 미정 행은 '00'으로 마킹 (사용자 검토 영역)
 WHERE no IS NULL OR no = '';

ALTER TABLE design_items ALTER COLUMN no SET NOT NULL;

-- 4) (선택) 동시성 보강 = (project_id, no) UNIQUE 제약
--    동일 project_id에서 같은 no 중복 INSERT 방지
--    주의: 기존 데이터에 중복 있으면 ERROR. 먼저 SELECT로 확인 권장.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'design_items' AND indexname = 'design_items_project_id_no_key'
  ) THEN
    -- 중복 점검
    IF NOT EXISTS (
      SELECT project_id, no FROM design_items
      WHERE no IS NOT NULL
      GROUP BY project_id, no
      HAVING COUNT(*) > 1
    ) THEN
      ALTER TABLE design_items ADD CONSTRAINT design_items_project_id_no_key UNIQUE (project_id, no);
    ELSE
      RAISE NOTICE '중복 (project_id, no) 존재. UNIQUE 제약 스킵. 수동 정합 필요.';
    END IF;
  END IF;
END $$;

-- ============================================
-- 검증 (실행 후 다음 SQL로 확인)
-- ============================================
-- SELECT column_name, is_nullable FROM information_schema.columns
-- WHERE table_name='design_items' AND column_name='no';
--   결과: is_nullable = NO

-- SELECT tgname FROM pg_trigger
-- WHERE tgrelid='public.design_items'::regclass AND tgname='trg_set_design_items_no';
--   결과: 1행

-- 테스트 INSERT (no 미지정)
-- INSERT INTO design_items (project_id, category) VALUES ('<test_pid>', 'test') RETURNING no;
--   결과: no = 자동 채워짐 (예: '01' 또는 max+1)
-- ============================================
