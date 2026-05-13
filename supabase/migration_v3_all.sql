-- ============================================================
-- ez_Signage v3 통합 마이그레이션 (Phase 2 + Phase 3 + Phase 5)
--
-- 실행 방법:
--   1) Supabase Studio → SQL Editor 에서 이 파일 전체 복사·붙여넣기 후 RUN
--   2) Storage 버킷 설정은 SQL로 직접 변경하지 말고 (admin 권한 필요)
--      Supabase Dashboard → Storage → design-images → Settings 에서:
--        - Public bucket: ON 유지 (1차안. 추후 OFF + signed URL 전환 예정)
--        - File size limit: 10485760 (10MB)
--        - Allowed MIME types: image/webp, image/jpeg, image/png
--
-- 안전성: 기존 정책을 DROP하고 새로 만들기 때문에, 실행 중 짧은 시간(<1초)
-- 동안 업로드가 막힐 수 있음. 사용자가 없을 때 실행 권장.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- Phase 2 — Storage RLS 4정책 (path 첫 폴더 = auth.uid())
-- ════════════════════════════════════════════════════════════

-- 기존 design-images 관련 정책 모두 제거 (이름 충돌 방지)
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname='storage' and tablename='objects'
      and (policyname ilike '%design-images%' or policyname ilike '%design_images%')
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

-- INSERT: 본인 폴더에만 업로드
create policy "design-images: insert own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'design-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- SELECT: 누구나 읽기 (PPT 출력 시 외부 fetch 호환). 1차안 후 private 전환 예정.
create policy "design-images: public read" on storage.objects
  for select to public
  using (bucket_id = 'design-images');

-- UPDATE: 본인 폴더 내 객체만 갱신 (upsert: true 동작에 필요)
create policy "design-images: update own folder" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'design-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'design-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- DELETE: 본인 폴더 내 객체만 삭제 (현재 누락된 정책)
create policy "design-images: delete own folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'design-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );


-- ════════════════════════════════════════════════════════════
-- Phase 3 — 역할 2분할 (admin / user) + share_tokens
-- ════════════════════════════════════════════════════════════

-- profiles.role enum (기존 owner/팀원/클라이언트 → admin/user)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='role'
  ) then
    alter table public.profiles
      add column role text not null default 'user'
      check (role in ('admin', 'user'));
  end if;
end $$;

-- 첫 사용자는 자동 admin (DB가 비어있던 경우 대비)
update public.profiles set role = 'admin'
where id = (select id from public.profiles order by created_at asc limit 1)
  and role = 'user';

-- 기존 모든 프로젝트 owner를 admin으로 승격
update public.profiles
set role = 'admin'
where id in (select distinct owner_id from public.projects)
  and role = 'user';

-- public.is_admin() — RLS·UI에서 모두 사용
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_admin() to authenticated, anon;

-- share_tokens 테이블 (Phase 4의 C/외부 공유용. 1차안에서는 활성화 보류)
create table if not exists public.share_tokens (
  id          uuid        default gen_random_uuid() primary key,
  project_id  uuid        not null references public.projects(id) on delete cascade,
  token       text        not null unique,
  created_by  uuid        not null references auth.users(id) on delete cascade,
  expires_at  timestamptz,
  enabled     boolean     not null default false,   -- 기본 OFF — admin이 명시적으로 ON
  created_at  timestamptz not null default now()
);

alter table public.share_tokens enable row level security;

drop policy if exists "share_tokens: admin manage" on public.share_tokens;
create policy "share_tokens: admin manage" on public.share_tokens
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 토큰 보유자(미인증 anon)는 토큰 자체로만 조회. JWT로 차단 불가하므로 RPC 함수로 처리.
drop policy if exists "share_tokens: holder read" on public.share_tokens;
create policy "share_tokens: holder read" on public.share_tokens
  for select to anon
  using (enabled = true and (expires_at is null or expires_at > now()));

create index if not exists share_tokens_project_idx on public.share_tokens (project_id);
create index if not exists share_tokens_token_idx on public.share_tokens (token);


-- ════════════════════════════════════════════════════════════
-- Phase 5 — signage_aliases (환경장식물 동의어 사전)
-- ════════════════════════════════════════════════════════════

create table if not exists public.signage_aliases (
  id            uuid        default gen_random_uuid() primary key,
  alias_name    text        not null unique,           -- 사용자 입력 표기
  canonical_name text       not null,                  -- 표준명
  kind          text        not null,                  -- category 키 (x_banner, vertical_banner …)
  default_size  text,                                  -- "600*1800" 등 참고용 표기
  note          text,                                  -- 인식 근거
  created_at    timestamptz not null default now()
);

alter table public.signage_aliases enable row level security;

drop policy if exists "signage_aliases: read all" on public.signage_aliases;
create policy "signage_aliases: read all" on public.signage_aliases
  for select to authenticated, anon
  using (true);

drop policy if exists "signage_aliases: admin write" on public.signage_aliases;
create policy "signage_aliases: admin write" on public.signage_aliases
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 7개 표준 동의어 시드 (plan-v3.md 표 준수)
insert into public.signage_aliases (alias_name, canonical_name, kind, default_size, note) values
  ('스프링 배너',  'X배너',         'x_banner',          '600*1800', '표기 변형 — 동일 제작물'),
  ('드롭배너',     '세로 현수막',   'vertical_banner',   '900*5000', '세로 형태·규격 동일'),
  ('난간배너',     '세로 현수막',   'vertical_banner',   '900*5000', '설치 위치만 다름 (난간)'),
  ('천장배너',     '통천 배너',     'chunchen_banner',   '1000*5000','천장 매다는 형태 동일'),
  ('빵빠레배너',   '가로등 배너',   'streetlight_banner','600*1800', '폴에 거는 세로형'),
  ('피켓(A4)',     'A4',            'a4_portrait',       '210*297',  '출력물·규격 동일'),
  ('피켓(A3)',     'A3',            'a3_portrait',       '297*420',  '출력물·규격 동일')
on conflict (alias_name) do update set
  canonical_name = excluded.canonical_name,
  kind = excluded.kind,
  default_size = excluded.default_size,
  note = excluded.note;

create index if not exists signage_aliases_kind_idx on public.signage_aliases (kind);


-- ════════════════════════════════════════════════════════════
-- 종료. 다음 SQL 들로 결과 검증:
--   select count(*) from pg_policies where schemaname='storage' and tablename='objects';
--     -- 4개 이상이어야 함 (design-images 4정책 + 다른 버킷 정책)
--   select role, count(*) from public.profiles group by role;
--   select count(*) from public.signage_aliases;  -- 7
-- ════════════════════════════════════════════════════════════
