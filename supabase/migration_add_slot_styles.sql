-- ============================================================
-- 마이그레이션: slot_styles 테이블 + allowed_users 컬럼 추가
-- Supabase Dashboard > SQL Editor 에서 실행하세요
-- ============================================================

-- 1. projects 테이블에 allowed_users 컬럼 추가
alter table projects
  add column if not exists allowed_users text[] not null default '{}';

-- 2. slot_styles 테이블 생성
create table if not exists slot_styles (
  id          uuid        default gen_random_uuid() primary key,
  project_id  uuid        not null references projects(id) on delete cascade,
  slot_key    text        not null,
  font_face   text        not null default 'Malgun Gothic',
  font_size   integer     not null default 16,
  color       text        not null default 'FFFFFF',
  align       text        not null default 'center'
              check (align in ('center', 'left', 'right')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(project_id, slot_key)
);

-- 3. updated_at 트리거
create trigger slot_styles_updated_at
  before update on slot_styles
  for each row execute function handle_updated_at();

-- 4. RLS 활성화
alter table slot_styles enable row level security;

create policy "slot_styles: owner full access" on slot_styles
  for all using (
    exists (
      select 1 from projects
      where id = slot_styles.project_id
        and owner_id = auth.uid()
    )
  );

-- 5. 인덱스
create index if not exists slot_styles_project_id_idx on slot_styles (project_id);

-- 6. Realtime (선택 사항 — 슬롯 스타일 실시간 동기화 필요 시)
-- alter publication supabase_realtime add table slot_styles;
