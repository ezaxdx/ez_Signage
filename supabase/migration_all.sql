-- ============================================================
-- 통합 마이그레이션 — 기존 Supabase 프로젝트에서 한 번에 실행
-- Supabase Dashboard > SQL Editor 에서 복사/실행
-- ============================================================

-- ── 1. projects.allowed_users + master_image_url + purposes ──
alter table projects add column if not exists allowed_users text[] not null default '{}';
alter table projects add column if not exists master_image_url text;
alter table projects add column if not exists purposes text[] not null default '{}';

-- 클라이언트 공유 링크용 토큰 (로그인 없이 미리보기 전용)
alter table projects add column if not exists share_token text unique;
alter table projects add column if not exists share_enabled boolean not null default false;

-- 클라이언트 코멘트 테이블 (토큰 보유자가 남긴 의견)
create table if not exists client_reviews (
  id          uuid        default gen_random_uuid() primary key,
  project_id  uuid        not null references projects(id) on delete cascade,
  item_id     uuid        references design_items(id) on delete cascade,
  reviewer    text,
  comment     text        not null,
  decision    text        check (decision in ('승인', '수정', '보류')),
  created_at  timestamptz not null default now()
);

alter table client_reviews enable row level security;

drop policy if exists "client_reviews: anyone insert via token" on client_reviews;
create policy "client_reviews: anyone insert via token" on client_reviews
  for insert to anon, authenticated with check (true);

drop policy if exists "client_reviews: project member read" on client_reviews;
create policy "client_reviews: project member read" on client_reviews
  for select using (
    exists (
      select 1 from projects p
      where p.id = client_reviews.project_id
        and (p.owner_id = auth.uid() or exists (
          select 1 from project_members pm
          where pm.project_id = p.id and pm.user_email = (auth.jwt() ->> 'email')
        ))
    )
  );

create index if not exists client_reviews_project_idx on client_reviews (project_id, created_at desc);

-- ── 2. design_items — 편집자 + 진행 상태 + 마스터 지정 ──────
alter table design_items add column if not exists last_edited_by text;
alter table design_items add column if not exists updating_by text;
alter table design_items add column if not exists completed boolean not null default false;
alter table design_items add column if not exists is_master boolean not null default false;
alter table design_items add column if not exists review_status text not null default '작업중'
  check (review_status in ('작업중', '확인필요', '검수완료', '발주완료', '수정요청'));
alter table design_items add column if not exists review_note text;

-- 같은 프로젝트 + 같은 category 내에서 마스터 1개만 허용 (조건부 유니크 인덱스)
create unique index if not exists design_items_master_unique
  on design_items (project_id, category)
  where is_master = true;

-- ── 3. slot_styles 테이블 (행사 마스터 스타일) ─────────────
create table if not exists slot_styles (
  id             uuid        default gen_random_uuid() primary key,
  project_id     uuid        not null references projects(id) on delete cascade,
  slot_key       text        not null,
  font_face      text        not null default 'Malgun Gothic',
  font_size      integer     not null default 16,
  color          text        not null default 'FFFFFF',
  align          text        not null default 'center'
                 check (align in ('center', 'left', 'right')),
  letter_spacing integer     not null default 0,        -- 자간 (-5 ~ 10)
  master_x       numeric,                               -- 마스터 X 좌표 (%)
  master_y       numeric,                               -- 마스터 Y 좌표 (%)
  master_w       numeric,                               -- 마스터 너비 (%)
  padding_x      integer     not null default 0,        -- 좌우 여백
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique(project_id, slot_key)
);

-- 기존 테이블이 있다면 신규 컬럼 추가
alter table slot_styles add column if not exists letter_spacing integer not null default 0;
alter table slot_styles add column if not exists master_x numeric;
alter table slot_styles add column if not exists master_y numeric;
alter table slot_styles add column if not exists master_w numeric;
alter table slot_styles add column if not exists padding_x integer not null default 0;

alter table slot_styles enable row level security;

drop policy if exists "slot_styles: owner full access" on slot_styles;
create policy "slot_styles: owner full access" on slot_styles
  for all using (
    exists (select 1 from projects where id = slot_styles.project_id and owner_id = auth.uid())
  );

create index if not exists slot_styles_project_id_idx on slot_styles (project_id);

-- ── 4. project_members 테이블 (팀원 초대) ──────────────────
create table if not exists project_members (
  id           uuid        default gen_random_uuid() primary key,
  project_id   uuid        not null references projects(id) on delete cascade,
  user_email   text        not null,
  part_name    text,
  invited_at   timestamptz not null default now(),
  unique(project_id, user_email)
);

alter table project_members enable row level security;

drop policy if exists "project_members: owner manage" on project_members;
create policy "project_members: owner manage" on project_members
  for all
  using (
    exists (select 1 from projects where id = project_members.project_id and owner_id = auth.uid())
  )
  with check (
    exists (select 1 from projects where id = project_members.project_id and owner_id = auth.uid())
  );

drop policy if exists "project_members: self read" on project_members;
create policy "project_members: self read" on project_members
  for select using (user_email = (auth.jwt() ->> 'email'));

create index if not exists project_members_project_id_idx on project_members (project_id);
create index if not exists project_members_email_idx      on project_members (user_email);

-- ── 5. projects/design_items/item_contents 멤버 읽기·쓰기 ─────
drop policy if exists "projects: member read" on projects;
create policy "projects: member read" on projects
  for select using (
    exists (
      select 1 from project_members pm
      where pm.project_id = projects.id
        and pm.user_email = (auth.jwt() ->> 'email')
    )
  );

drop policy if exists "design_items: member access" on design_items;
create policy "design_items: member access" on design_items
  for all using (
    exists (
      select 1 from project_members pm
      where pm.project_id = design_items.project_id
        and pm.user_email = (auth.jwt() ->> 'email')
    )
  );

drop policy if exists "item_contents: member access" on item_contents;
create policy "item_contents: member access" on item_contents
  for all using (
    exists (
      select 1 from design_items di
      join project_members pm on pm.project_id = di.project_id
      where di.id = item_contents.item_id
        and pm.user_email = (auth.jwt() ->> 'email')
    )
  );

drop policy if exists "slot_styles: member read" on slot_styles;
create policy "slot_styles: member read" on slot_styles
  for select using (
    exists (
      select 1 from project_members pm
      where pm.project_id = slot_styles.project_id
        and pm.user_email = (auth.jwt() ->> 'email')
    )
  );

-- ── 6. profiles 테이블 (초대 이름 검색) ───────────────────
create table if not exists profiles (
  id           uuid references auth.users(id) on delete cascade primary key,
  email        text not null unique,
  display_name text,
  created_at   timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles: authenticated read" on profiles;
create policy "profiles: authenticated read" on profiles
  for select to authenticated using (true);

drop policy if exists "profiles: self update" on profiles;
create policy "profiles: self update" on profiles
  for update using (id = auth.uid());

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

-- 기존 사용자 프로필 백필
insert into public.profiles (id, email, display_name)
select id, email, coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;

-- ── 7-Z. Storage 버킷 + 정책 ───────────────────────────────
insert into storage.buckets (id, name, public)
values ('design-images', 'design-images', true)
on conflict (id) do nothing;

drop policy if exists "design-images: auth upload" on storage.objects;
create policy "design-images: auth upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'design-images');

drop policy if exists "design-images: auth update" on storage.objects;
create policy "design-images: auth update" on storage.objects
  for update to authenticated using (bucket_id = 'design-images');

drop policy if exists "design-images: auth delete" on storage.objects;
create policy "design-images: auth delete" on storage.objects
  for delete to authenticated using (bucket_id = 'design-images');

drop policy if exists "design-images: public read" on storage.objects;
create policy "design-images: public read" on storage.objects
  for select to public using (bucket_id = 'design-images');

-- ── 7-A. Realtime 구독 테이블 활성화 ────────────────────────
-- 실시간 동시 편집 (명세 이슈 2)
alter publication supabase_realtime add table item_contents;
alter publication supabase_realtime add table design_items;
alter publication supabase_realtime add table slot_styles;

-- ── 8. org_logo_asset (로고 자산 카탈로그) ────────────────
-- CLAUDE.md 17항: 주최/주관/후원 로고 재사용 DB
create table if not exists org_logo_asset (
  id          uuid        default gen_random_uuid() primary key,
  project_id  uuid        not null references projects(id) on delete cascade,
  name        text        not null,           -- "외교부", "한국관광공사"
  category    text        not null default '후원'
              check (category in ('주최', '주관', '후원', '협찬', '기타')),
  image_url   text        not null,
  created_at  timestamptz not null default now()
);

alter table org_logo_asset enable row level security;

drop policy if exists "org_logo_asset: member access" on org_logo_asset;
create policy "org_logo_asset: member access" on org_logo_asset
  for all using (
    exists (
      select 1 from projects p
      where p.id = org_logo_asset.project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from project_members pm
            where pm.project_id = p.id and pm.user_email = (auth.jwt() ->> 'email')
          )
        )
    )
  );

create index if not exists org_logo_asset_project_id_idx on org_logo_asset (project_id);

-- ── 9. slot_history (변경 이력 / 감사 로그) ────────────────
-- BANNER_GENERATOR_DESIGN.md 5.3 — 콘텐츠/스타일 수정 이력
create table if not exists slot_history (
  id           uuid        default gen_random_uuid() primary key,
  item_id      uuid        not null references design_items(id) on delete cascade,
  slot_key     text        not null,
  prev_value   text,
  new_value    text,
  edited_by    text,
  edited_at    timestamptz not null default now()
);

alter table slot_history enable row level security;

drop policy if exists "slot_history: project member read" on slot_history;
create policy "slot_history: project member read" on slot_history
  for select using (
    exists (
      select 1 from design_items di
      join projects p on p.id = di.project_id
      where di.id = slot_history.item_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from project_members pm
            where pm.project_id = p.id and pm.user_email = (auth.jwt() ->> 'email')
          )
        )
    )
  );

drop policy if exists "slot_history: authenticated insert" on slot_history;
create policy "slot_history: authenticated insert" on slot_history
  for insert to authenticated with check (true);

create index if not exists slot_history_item_id_idx on slot_history (item_id, edited_at desc);

-- ── 7. 저장된 제작물 아카이브 — 모든 로그인 사용자 읽기 ─────
-- 명세 9-3: "계정에 로그인한 모든 사용자가 저장된 제작물 전체를 확인 가능"
drop policy if exists "design_items: authenticated archive read" on design_items;
create policy "design_items: authenticated archive read" on design_items
  for select to authenticated using (true);

drop policy if exists "item_contents: authenticated archive read" on item_contents;
create policy "item_contents: authenticated archive read" on item_contents
  for select to authenticated using (true);

drop policy if exists "projects: authenticated archive read" on projects;
create policy "projects: authenticated archive read" on projects
  for select to authenticated using (true);
