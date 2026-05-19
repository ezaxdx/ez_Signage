-- 5/22 사용자 명시 = 평균 정확도 = 실제 사용 기반 (DB 마이그레이션)
-- AI 추천값(ai_suggested_value)·사용자 수정 이력(item_edit_log) → 정확도 = 1 - (수정 / 전체)

ALTER TABLE public.design_items
  ADD COLUMN IF NOT EXISTS ai_suggested_value jsonb,
  ADD COLUMN IF NOT EXISTS user_edited_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_accuracy_score numeric(5,2);

CREATE TABLE IF NOT EXISTS public.item_edit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.design_items(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  field_name text NOT NULL,
  before_value text,
  after_value text,
  edited_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_item_edit_log_item ON public.item_edit_log(item_id);
CREATE INDEX IF NOT EXISTS idx_item_edit_log_project ON public.item_edit_log(project_id);

ALTER TABLE public.item_edit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS item_edit_log_select_all ON public.item_edit_log;
CREATE POLICY item_edit_log_select_all ON public.item_edit_log
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS item_edit_log_insert_authenticated ON public.item_edit_log;
CREATE POLICY item_edit_log_insert_authenticated ON public.item_edit_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = edited_by);

COMMENT ON TABLE public.item_edit_log IS '환경장식물 항목 편집 이력 = AI 추천값 vs 사용자 최종값 비교 = 평균 정확도 계산 SOT';
COMMENT ON COLUMN public.design_items.ai_suggested_value IS 'recommendSignage 응답 영역 저장 = 정확도 비교 baseline';
COMMENT ON COLUMN public.design_items.user_edited_count IS '사용자 수정 횟수 = item_edit_log 합산 영역';
COMMENT ON COLUMN public.design_items.ai_accuracy_score IS '정확도 = 1 - (편집 필드 / 전체 필드)·집계 결과';

-- 검증
-- SELECT COUNT(*) FROM item_edit_log;
-- SELECT AVG(ai_accuracy_score) FROM design_items WHERE ai_accuracy_score IS NOT NULL;
