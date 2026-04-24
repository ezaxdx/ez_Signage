-- ============================================================
-- 마이그레이션: project_members + last_edited_by
-- Supabase Dashboard > SQL Editor 에서 실행하세요
-- ============================================================

-- 1. design_items에 편집자 컬럼 추가
alter table design_items
  add column if not exists last_edited_by text;

-- 2. project_members 테이블 생성
create table if not exists project_members (
  id           uuid        default gen_random_uuid() primary key,
  project_id   uuid        not null references projects(id) on delete cascade,
  user_email   text        not null,
  part_name    text,
  invited_at   timestamptz not null default now(),
  unique(project_id, user_email)
);

alter table project_members enable row level security;

-- owner가 멤버 관리
create policy "project_members: owner manage" on project_members
  for all using (
    exists (
      select 1 from projects
      where id = project_members.project_id
        and owner_id = auth.uid()
    )
  );

-- 본인이 초대된 멤버 본인 확인 가능
create policy "project_members: self read" on project_members
  for select using (
    user_email = (auth.jwt() ->> 'email')
  );

create index if not exists project_members_project_id_idx on project_members (project_id);
create index if not exists project_members_email_idx      on project_members (user_email);

-- 3. projects RLS 업데이트: 멤버도 읽기 가능
-- (기존 정책은 그대로 두고 SELECT 정책 추가)
create policy "projects: member read" on projects
  for select using (
    exists (
      select 1 from project_members pm
      where pm.project_id = projects.id
        and pm.user_email = (auth.jwt() ->> 'email')
    )
  );

-- 4. design_items RLS 업데이트: 멤버도 편집 가능
create policy "design_items: member access" on design_items
  for all using (
    exists (
      select 1 from project_members pm
      join projects p on p.id = pm.project_id
      where pm.project_id = design_items.project_id
        and pm.user_email = (auth.jwt() ->> 'email')
    )
  );

-- 5. item_contents RLS 업데이트: 멤버도 편집 가능
create policy "item_contents: member access" on item_contents
  for all using (
    exists (
      select 1 from design_items di
      join project_members pm on pm.project_id = di.project_id
      where di.id = item_contents.item_id
        and pm.user_email = (auth.jwt() ->> 'email')
    )
  );
