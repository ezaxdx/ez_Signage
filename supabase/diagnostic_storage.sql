-- ============================================================
-- ez_Signage v3 / Phase 1 — Storage 진단 SQL
--   사용법: Supabase Studio → SQL Editor 에서 (a)~(e) 순서대로 실행
--   결과를 docs/phase1-report.md "B. SQL 진단 결과" 섹션에 붙여주세요.
--   ⚠ 이 파일은 read-only 쿼리만 포함. 어떤 데이터/스키마도 변경하지 않습니다.
-- ============================================================

-- (a) storage.objects 정책 목록 — INSERT/SELECT/UPDATE/DELETE 4종이 모두 있어야 함
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by cmd, policyname;

-- (b) storage.objects RLS 활성화 여부 (relrowsecurity = true 여야 함)
select relname, relrowsecurity, relforcerowsecurity
from pg_class
where relname = 'objects' and relnamespace = 'storage'::regnamespace;

-- (c) bucket 설정 — public/file_size_limit/allowed_mime_types 확인
select id, name, public, file_size_limit, allowed_mime_types, owner, created_at
from storage.buckets
order by id;

-- (d) 현재 등록된 객체 일부 — path 패턴이 {auth.uid()}/... 인지 확인
--     (사용자별 폴더 분리 정책을 적용하려면 첫 세그먼트가 uid 여야 함)
select bucket_id, name, owner, created_at, metadata->>'mimetype' as mime, metadata->>'size' as size
from storage.objects
order by created_at desc
limit 20;

-- (e) profiles / project_members 등 v3 마이그레이션 관련 테이블 상태
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'project_members', 'slot_styles', 'projects', 'design_items', 'item_contents')
order by table_name;

-- (f) profiles.role 컬럼 / signage_aliases 테이블 / share_tokens 테이블 — Phase 3·5에서 필요
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'signage_aliases', 'share_tokens')
order by table_name, ordinal_position;
