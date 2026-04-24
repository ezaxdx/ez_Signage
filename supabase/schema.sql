-- ============================================================
-- MICE 제작물 디자인 의뢰 가이드 — Supabase 스키마
-- Supabase Dashboard > SQL Editor 에서 순서대로 실행하세요
-- ============================================================

-- ── 1. projects ─────────────────────────────────────────────
create table if not exists projects (
  id            uuid        default gen_random_uuid() primary key,
  name          text        not null,
  owner_id      uuid        not null references auth.users(id) on delete cascade,
  client_name   text,
  event_date    date,
  event_venue   text,
  status        text        not null default '준비중'
                            check (status in ('준비중', '진행중', '완료')),
  allowed_users text[]      not null default '{}',  -- 접근 허용 사용자 이메일 목록
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── 2. design_items ─────────────────────────────────────────
create table if not exists design_items (
  id           uuid        default gen_random_uuid() primary key,
  project_id   uuid        not null references projects(id) on delete cascade,
  no           text        not null,                  -- "01", "02" …
  part         text,                                  -- "종합안내", "세션" …
  category     text,                                  -- "X-Banner", "현수막" …
  location     text,
  purpose      text,
  language     text        check (language in ('KOR', 'EN', 'EN/KOR')),
  quantity     integer     not null default 1,
  material     text,
  width_mm     integer,
  height_mm    integer,
  image_url    text,
  qr_required  boolean     not null default false,
  layout_dna   jsonb,                                 -- AI 추출 슬롯 좌표
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── 3. item_contents ────────────────────────────────────────
create table if not exists item_contents (
  id           uuid        default gen_random_uuid() primary key,
  item_id      uuid        not null references design_items(id) on delete cascade,
  slot_key     text        not null,   -- "hero_title", "sub_title" …
  slot_value   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(item_id, slot_key)
);

-- ── 4. updated_at 자동 갱신 트리거 ──────────────────────────
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on projects
  for each row execute function handle_updated_at();

create trigger design_items_updated_at
  before update on design_items
  for each row execute function handle_updated_at();

create trigger item_contents_updated_at
  before update on item_contents
  for each row execute function handle_updated_at();

-- ── 5. Row Level Security ────────────────────────────────────
alter table projects     enable row level security;
alter table design_items enable row level security;
alter table item_contents enable row level security;

-- projects: 본인 소유만 CRUD
create policy "projects: owner full access" on projects
  for all using (auth.uid() = owner_id);

-- design_items: 본인 프로젝트 항목만 CRUD
create policy "design_items: owner full access" on design_items
  for all using (
    exists (
      select 1 from projects
      where id = design_items.project_id
        and owner_id = auth.uid()
    )
  );

-- item_contents: 본인 프로젝트 항목 콘텐츠만 CRUD
create policy "item_contents: owner full access" on item_contents
  for all using (
    exists (
      select 1 from design_items di
      join projects p on p.id = di.project_id
      where di.id = item_contents.item_id
        and p.owner_id = auth.uid()
    )
  );

-- ── 6. 인덱스 ────────────────────────────────────────────────
create index on projects     (owner_id);
create index on design_items (project_id);
create index on item_contents (item_id);

-- ── 7. Storage 버킷 & 정책 ────────────────────────────────────
-- 시안 이미지 저장소 (WebP 변환 후 업로드됨)
-- Supabase Dashboard → Storage → New Bucket 으로 직접 만들거나
-- 아래 SQL을 SQL Editor에서 실행하세요.

insert into storage.buckets (id, name, public)
values ('design-images', 'design-images', true)
on conflict (id) do nothing;

-- 로그인한 사용자: 본인 프로젝트 경로 파일 업로드·수정 허용
-- 경로 규칙: {project_id}/{item_id}.webp
create policy "design-images: auth upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'design-images');

create policy "design-images: auth update" on storage.objects
  for update to authenticated
  using (bucket_id = 'design-images');

-- 공개 읽기 (PPT 생성 시 외부에서 이미지 URL 접근 필요)
create policy "design-images: public read" on storage.objects
  for select to public
  using (bucket_id = 'design-images');

-- ── 8. slot_styles (프로젝트 레벨 슬롯 공통 서식) ────────────────
-- 같은 slot_key → 같은 서식(폰트·크기·색상) 공유 (CLAUDE.md Section 5)
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

create trigger slot_styles_updated_at
  before update on slot_styles
  for each row execute function handle_updated_at();

alter table slot_styles enable row level security;

create policy "slot_styles: owner full access" on slot_styles
  for all using (
    exists (
      select 1 from projects
      where id = slot_styles.project_id
        and owner_id = auth.uid()
    )
  );

create index on slot_styles (project_id);

-- ── 9. 기존 DB에 allowed_users 컬럼 추가 (이미 생성된 DB용) ──────
-- 새로 만드는 경우 1번 테이블 정의에 이미 포함됨
-- 기존 Supabase 프로젝트에서는 아래 명령어 실행:
-- alter table projects add column if not exists allowed_users text[] not null default '{}';

-- ── 10. profiles (초대 시 이름 검색용) ───────────────────────
create table if not exists profiles (
  id           uuid references auth.users(id) on delete cascade primary key,
  email        text not null unique,
  display_name text,
  created_at   timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles: authenticated read" on profiles
  for select to authenticated using (true);

create policy "profiles: self update" on profiles
  for update using (id = auth.uid());

-- 가입 시 프로필 자동 생성
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
