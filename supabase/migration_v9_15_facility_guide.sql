-- v9.15 facility guide migration
-- 1. venues 테이블에 facility_guide_json 컬럼 추가
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS facility_guide_json JSONB,
  ADD COLUMN IF NOT EXISTS facility_guide_updated_at TIMESTAMPTZ;

-- 2. 수정 요청 테이블 (localStorage → Supabase)
CREATE TABLE IF NOT EXISTS venue_correction_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_key TEXT NOT NULL,
  venue_name TEXT,
  correction_text TEXT NOT NULL,
  submitted_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE venue_correction_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth users can insert" ON venue_correction_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "admin can select all" ON venue_correction_requests
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin can update" ON venue_correction_requests
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
