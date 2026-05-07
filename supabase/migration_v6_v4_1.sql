-- ============================================================
-- migration_v6_v4_1.sql — v4.1 통합 마이그레이션
-- ============================================================
-- 적용 대상:
--   1. projects.program_parts text[] (갱신-A)
--   2. projects.event_type → program_parts_legacy 백업
--   3. venues 테이블 (단위 5-2 데이터 학습 관리자)
--   4. venue_requests 테이블 (단위 3 신규 장소 등록 요청)
--   5. learning_jobs 테이블 (단위 5-2 도면 학습 큐 스켈레톤)
--   6. usage_logs 테이블 (신규-G 다운로드 트리거 기록)
-- 실행 위치: Supabase Studio > SQL Editor
-- ============================================================

-- ── 1. projects.program_parts (갱신-A) ───────────────────────
-- 기존 event_type 단일 컬럼 → program_parts_legacy로 이름만 백업
-- 새 컬럼 program_parts text[] 추가
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'event_type'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'program_parts_legacy'
  ) then
    alter table public.projects rename column event_type to program_parts_legacy;
  end if;
end $$;

alter table public.projects
  add column if not exists program_parts text[] default '{}';

comment on column public.projects.program_parts is
  'EZ 폴더링 가이드 40.04~40.20 코드 배열. 다중선택. lib/programParts.ts 참조.';
comment on column public.projects.program_parts_legacy is
  'v3 단일 event_type 백업. v4.1 (2026-05-07)에 program_parts로 대체됨. 신규 코드는 사용 금지.';

-- legacy → 신규 best-effort 매핑 (NULL이거나 빈 program_parts만 채움)
update public.projects p
set program_parts = case
  when p.program_parts_legacy ilike '%국제회의%' or p.program_parts_legacy ilike '%컨퍼런스%' or p.program_parts_legacy ilike '%세미나%' then array['40.04','40.19']
  when p.program_parts_legacy ilike '%전시%' or p.program_parts_legacy ilike '%박람회%' or p.program_parts_legacy ilike '%엑스포%' then array['40.05','40.19']
  when p.program_parts_legacy ilike '%시상%' or p.program_parts_legacy ilike '%MOU%' or p.program_parts_legacy ilike '%개막%' then array['40.08']
  when p.program_parts_legacy ilike '%체험%' then array['40.10']
  when p.program_parts_legacy ilike '%공모%' then array['40.09']
  when p.program_parts_legacy ilike '%투어%' then array['40.11']
  when p.program_parts_legacy ilike '%홍보%' then array['40.17']
  when p.program_parts_legacy ilike '%등록%' then array['40.19']
  else '{}'::text[]
end
where (p.program_parts is null or array_length(p.program_parts, 1) is null)
  and p.program_parts_legacy is not null;

-- ── 2. venues 테이블 (단위 5-2 데이터 학습 관리자) ──────────
-- 정적 lib/venueIntel.ts VENUE_LIST를 DB로 이관할 수 있도록 준비.
-- 현재는 DB에 행을 삽입하지 않음 (런타임은 venueIntel.ts + DB 둘 다 read).
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text,
  venue_type text check (venue_type in ('컨벤션센터','호텔','전시장','야외','공공시설','기타')),
  has_hall_split boolean default false,
  main_entrance_note text,
  area_sqm integer,
  floor_plan_url text,
  metadata jsonb default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(name)
);
comment on table public.venues is '관리자가 등록·학습 관리하는 행사장. 사용자 신규 요청 승인 시 자동 생성.';

-- 행사장에 속한 홀(컨벤션센터 1개에 여러 홀)
create table if not exists public.venue_halls (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  hall_name text not null,
  floor text,
  capacity integer,
  floor_plan_url text,
  created_at timestamptz default now(),
  unique(venue_id, hall_name)
);
comment on table public.venue_halls is '행사장 내부 홀 단위 (코엑스 전시장 vs 컨퍼런스홀 분리). venues.has_hall_split=true 일 때만 사용.';

-- ── 3. venue_requests 테이블 (단위 3) ───────────────────────
-- 사용자가 새 프로젝트 폼에서 "신규 장소 등록 요청"을 누르면 INSERT.
-- 관리자가 /admin/learning에서 승인 시 venues로 이관.
create table if not exists public.venue_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text,
  venue_type text,
  floor_plan_url text,
  hall_split_requested boolean default false,
  notes text,
  requested_by uuid references auth.users(id),
  requested_at timestamptz default now(),
  status text default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  reject_reason text,
  approved_venue_id uuid references public.venues(id) on delete set null
);
comment on table public.venue_requests is '사용자의 신규 행사장 등록 요청 큐. 관리자 승인 시 venues 테이블로 이관.';

create index if not exists venue_requests_status_idx on public.venue_requests(status);
create index if not exists venue_requests_requested_by_idx on public.venue_requests(requested_by);

-- ── 4. learning_jobs 테이블 (단위 5-2, 스켈레톤) ────────────
-- 도면 학습 트리거 시 INSERT만 (실제 Vision API 호출은 다음 사이클).
create table if not exists public.learning_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null check (job_type in ('floor_plan_analyze','signage_pattern','venue_meta')),
  venue_id uuid references public.venues(id) on delete cascade,
  hall_id uuid references public.venue_halls(id) on delete cascade,
  source_url text,
  status text default 'queued' check (status in ('queued','processing','done','failed','skipped')),
  result jsonb default '{}',
  error_message text,
  triggered_by uuid references auth.users(id),
  triggered_at timestamptz default now(),
  started_at timestamptz,
  completed_at timestamptz
);
comment on table public.learning_jobs is '도면 학습 큐. v4.1에서는 INSERT만 (Vision API 호출은 다음 사이클).';

create index if not exists learning_jobs_status_idx on public.learning_jobs(status);
create index if not exists learning_jobs_venue_idx on public.learning_jobs(venue_id);

-- ── 5. usage_logs 테이블 (신규-G) ────────────────────────────
-- 다운로드(엑셀/PPT) 트리거 기록.
create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  project_id uuid references public.projects(id) on delete cascade,
  action text not null check (action in ('export_excel','export_pptx','recommend','venue_request')),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
comment on table public.usage_logs is '제작물 리스트 가이드 사용량 추적 (다운로드·추천·요청).';
create index if not exists usage_logs_user_idx on public.usage_logs(user_id, created_at desc);
create index if not exists usage_logs_action_idx on public.usage_logs(action, created_at desc);

-- ── RLS ──────────────────────────────────────────────────────
alter table public.venues enable row level security;
alter table public.venue_halls enable row level security;
alter table public.venue_requests enable row level security;
alter table public.learning_jobs enable row level security;
alter table public.usage_logs enable row level security;

-- venues: authenticated 모두 SELECT, admin만 INSERT/UPDATE/DELETE
drop policy if exists "venues_select_all" on public.venues;
create policy "venues_select_all" on public.venues
  for select to authenticated using (true);

drop policy if exists "venues_admin_write" on public.venues;
create policy "venues_admin_write" on public.venues
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "venue_halls_select_all" on public.venue_halls;
create policy "venue_halls_select_all" on public.venue_halls
  for select to authenticated using (true);

drop policy if exists "venue_halls_admin_write" on public.venue_halls;
create policy "venue_halls_admin_write" on public.venue_halls
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- venue_requests: 본인 요청만 SELECT/INSERT, admin은 ALL
drop policy if exists "venue_requests_self_select" on public.venue_requests;
create policy "venue_requests_self_select" on public.venue_requests
  for select to authenticated
  using (requested_by = auth.uid() or public.is_admin());

drop policy if exists "venue_requests_self_insert" on public.venue_requests;
create policy "venue_requests_self_insert" on public.venue_requests
  for insert to authenticated
  with check (requested_by = auth.uid());

drop policy if exists "venue_requests_admin_update" on public.venue_requests;
create policy "venue_requests_admin_update" on public.venue_requests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- learning_jobs: admin only ALL
drop policy if exists "learning_jobs_admin_all" on public.learning_jobs;
create policy "learning_jobs_admin_all" on public.learning_jobs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- usage_logs: 본인 SELECT, INSERT는 본인만
drop policy if exists "usage_logs_self_select" on public.usage_logs;
create policy "usage_logs_self_select" on public.usage_logs
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "usage_logs_self_insert" on public.usage_logs;
create policy "usage_logs_self_insert" on public.usage_logs
  for insert to authenticated
  with check (user_id = auth.uid() or user_id is null);

-- ── 6. 자동 누적 학습 사이클 보강 (사용자 핵심 지시) ────────
-- liveStats가 이미 자동 누적함. 추가 인덱스만 보강.
create index if not exists projects_event_venue_idx on public.projects(event_venue) where event_venue is not null;
create index if not exists projects_program_parts_idx on public.projects using gin(program_parts);

-- ── 7. design_items.program_part (사용자 답변 — 질문 4) ──────
-- 엑셀 "파트" 컬럼 = design_items.program_part(코드) → PROGRAM_PARTS 한글
-- 단일값 (text). 다중일 경우 쉼표 구분 ("40.04,40.19")
alter table public.design_items
  add column if not exists program_part text;

comment on column public.design_items.program_part is
  'EZ 폴더링 40.xx 코드 (단일 또는 쉼표 구분 다중). 엑셀 "파트" 컬럼 출력 시 한글 자동 매핑. lib/programParts.ts 참조.';

create index if not exists design_items_program_part_idx on public.design_items(program_part) where program_part is not null;

-- ── 8. setup_date / teardown_date 컬럼 보존 (사용자 답변 — 질문 5) ──
-- UI에서는 제거하지만 DB 컬럼은 nullable 유지 (기존 데이터 보호).
-- v5에서 운영 캘린더 기능 추가 시 다시 입력 받을 수 있도록.
-- (별도 마이그레이션 액션 없음 — 컬럼 그대로 유지)

-- 완료. 다음 단계: PM이 Supabase Studio에서 실행.
