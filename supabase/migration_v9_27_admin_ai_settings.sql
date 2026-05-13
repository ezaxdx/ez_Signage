-- v9.27 (2026-05-13): 관리자 AI 환경 설정 영구 저장 테이블
-- 사용자 피드백 ③ — 관리자가 AI 모델·프롬프트·임계값을 직접 설정
--
-- 1차 구현은 localStorage 저장 (AdminAiClient.tsx). 다음 사이클에서
-- 이 테이블을 활성화해 서버에서 로드/저장하도록 전환.
--
-- PM 액션: Supabase Studio → SQL Editor에서 본 파일 전체 실행.

create table if not exists public.admin_ai_settings (
  id integer primary key default 1,
  model text not null default 'gemini-2.5-flash',
  temperature numeric(3,2) not null default 0.40,
  max_output_tokens integer not null default 8000,
  budget_monthly_usd numeric(10,2) not null default 50,
  abnormal_repeat_threshold integer not null default 5,
  system_prompt text not null default '',
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  constraint admin_ai_settings_singleton check (id = 1)
);

comment on table public.admin_ai_settings is 'Gemini API 호출에 사용되는 관리자 환경 설정. 싱글톤 (id=1).';

-- 초기 행 1개 삽입 (있으면 무시)
insert into public.admin_ai_settings (id) values (1)
  on conflict (id) do nothing;

-- RLS — admin만 SELECT/UPDATE
alter table public.admin_ai_settings enable row level security;

drop policy if exists "admin_ai_settings_admin_select" on public.admin_ai_settings;
create policy "admin_ai_settings_admin_select" on public.admin_ai_settings
  for select to authenticated using (public.is_admin());

drop policy if exists "admin_ai_settings_admin_update" on public.admin_ai_settings;
create policy "admin_ai_settings_admin_update" on public.admin_ai_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- usage_logs 보강: metadata.tokens 활용 인덱스 (선택)
-- 향후 토큰 사용량 빠른 집계용
create index if not exists usage_logs_recommend_created_idx
  on public.usage_logs (created_at desc)
  where action = 'recommend';
