-- ============================================================
-- 마이그레이션: profiles 테이블 + RLS 보완
-- Supabase Dashboard > SQL Editor 에서 실행하세요
-- ============================================================

-- ── 1. profiles 테이블 (이름으로 사용자 검색용) ─────────────
create table if not exists profiles (
  id           uuid references auth.users(id) on delete cascade primary key,
  email        text not null unique,
  display_name text,
  created_at   timestamptz not null default now()
);

alter table profiles enable row level security;

-- 로그인한 사용자 전체 조회 허용 (초대 검색 기능)
create policy "profiles: authenticated read" on profiles
  for select to authenticated using (true);

-- 본인 프로필 수정
create policy "profiles: self update" on profiles
  for update using (id = auth.uid());

-- ── 2. 가입 시 자동 프로필 생성 트리거 ──────────────────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── 3. 기존 유저 프로필 백필 ───────────────────────────────
insert into public.profiles (id, email, display_name)
select
  id,
  email,
  coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;

-- ── 4. slot_styles 멤버 읽기 정책 ───────────────────────────
-- (초대된 팀원도 프로젝트 기본 서식 조회 가능)
drop policy if exists "slot_styles: member read" on slot_styles;
create policy "slot_styles: member read" on slot_styles
  for select using (
    exists (
      select 1 from project_members pm
      where pm.project_id = slot_styles.project_id
        and pm.user_email = (auth.jwt() ->> 'email')
    )
  );

-- ── 5. project_members INSERT 명시적 허용 ──────────────────
-- FOR ALL USING 만으로 INSERT가 막히는 경우 방지
drop policy if exists "project_members: owner manage" on project_members;
create policy "project_members: owner manage" on project_members
  for all
  using (
    exists (
      select 1 from projects
      where id = project_members.project_id
        and owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from projects
      where id = project_members.project_id
        and owner_id = auth.uid()
    )
  );
