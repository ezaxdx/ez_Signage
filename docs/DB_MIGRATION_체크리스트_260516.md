# DB 마이그레이션 사전 점검 체크리스트 (5/16 야간 작성)

> **사용자 5분 안 실행 가능** — Supabase Studio 단계별 가이드
> 컴펌 후 즉시 실행. 라이브 DB 변경 영역.

## 🎯 1줄 요약

`supabase/migration_v10_new_structure.sql` 실행 → 9 테이블 + RLS + 트리거 신설. 기존 데이터 보존.

---

## ⚠️ 사전 확인 (실행 전 필수)

### 1. Postgres 버전 확인 (Postgres 14 deprecation 2026-07-01)
```
Supabase Dashboard → Settings → Infrastructure → Database
→ "PostgreSQL Version" 확인
```
- ✅ **17 또는 16**: 안전
- 🟡 **15**: 진행 가능, 7월 전 16+ 업그레이드 권장
- 🔴 **14**: ⚠️ **7/1 자동 업그레이드 예정** — 이전에 미리 업그레이드 권장

### 2. 백업 확인
```
Supabase Dashboard → Settings → Database → Backups
→ 자동 백업 (PITR 또는 daily)
→ 마이그레이션 직전 시각 확인 (롤백 기준점)
```

### 3. 기존 테이블 영향 점검
- `venues` 테이블 = ALTER (4 컬럼 추가) — 기존 데이터 보존
- `design_items` 테이블 = ALTER (5 컬럼 추가) — 기존 데이터 보존
- 신규 9 테이블 = 충돌 없음 (CREATE IF NOT EXISTS)

---

## 🚀 실행 단계 (Supabase Studio)

### Step 1: SQL Editor 열기
```
Supabase Dashboard → SQL Editor → New query
```

### Step 2: migration_v10 본문 붙여넣기
```
파일: supabase/migration_v10_new_structure.sql (338줄)
전체 복사 → SQL Editor 붙여넣기
```

### Step 3: RUN 버튼 클릭
- 예상 소요: 5~10초
- 결과: "Success. No rows returned"

### Step 4: 검증 쿼리 (마이그레이션 끝 line 332~338)
```sql
SELECT count(*) AS total, count(*) FILTER (WHERE is_pending) AS pending FROM signage_categories;
-- 결과: total=0·pending=0 (시드 INSERT 전이라 정상)
```

### Step 5: 시드 INSERT (선택 — 자동 도구)
```bash
# 로컬에서 실행
cd "C:/Users/EZPMP/Desktop/클로드 코드 활동용/업무 자동화/제작물 디자인 의뢰 가이드/프로그렘/mice-design-guide"

# TypeScript 컴파일
npx tsc lib/data/v2/*.ts lib/ai/v2/*.ts --outDir scripts/dist --module ESNext --target ES2022 --moduleResolution node

# 시드 INSERT
node scripts/seed_v2.mjs
```
예상 결과:
- 카테고리: 24/24
- 시리즈: 24/24
- venues 보강: 35/43 (8 미존재는 venues 테이블 INSERT 후)
- events: 7/7
- 발주 row: ~50

### Step 6: 정합 검증
```bash
node scripts/test_v2_seeds.mjs
```
- 24 카테고리 unique·43 venue·매칭 무결성 자동 검증

---

## 🛡️ 롤백 (이상 시)

### 신규 테이블 모두 삭제
```sql
DROP TABLE IF EXISTS ai_persona_revision_queue CASCADE;
DROP TABLE IF EXISTS ai_recommendation_logs CASCADE;
DROP TABLE IF EXISTS venue_category_coverage CASCADE;
DROP TABLE IF EXISTS event_signage_orders CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS event_series CASCADE;
DROP TABLE IF EXISTS venue_halls CASCADE;
DROP TABLE IF EXISTS signage_categories CASCADE;
```

### venues·design_items 컬럼 제거
```sql
ALTER TABLE venues DROP COLUMN IF EXISTS venue_specs;
ALTER TABLE venues DROP COLUMN IF EXISTS specs_updated_at;
ALTER TABLE venues DROP COLUMN IF EXISTS has_full_specs;
ALTER TABLE venues DROP COLUMN IF EXISTS facility_guide_url;

ALTER TABLE design_items DROP COLUMN IF EXISTS category_v2;
ALTER TABLE design_items DROP COLUMN IF EXISTS no_data_flag;
ALTER TABLE design_items DROP COLUMN IF EXISTS facility_violation_flag;
ALTER TABLE design_items DROP COLUMN IF EXISTS data_stage;
ALTER TABLE design_items DROP COLUMN IF EXISTS weight;
```

---

## 📋 사후 점검

### 1. 어드민 페이지 확인
```
https://ez-signage2.vercel.app/admin/learning
→ 행사장 학습 현황 표 정상 표시
```

### 2. 새 프로젝트 만들기 동작
```
/projects/new/case-a 진입 → 행사장 드롭다운 정상 표시 (43개)
→ AI 추천 호출 (기존 v1 유지, v2 활성화 X)
```

### 3. usage_logs 정상 작동 확인
```sql
SELECT count(*) FROM usage_logs WHERE created_at > now() - interval '1 hour';
```

---

## ⚠️ 주의 사항

- **v2 시드 활성화 ≠ 마이그레이션 실행**: 마이그레이션 = 스키마만. 시드 INSERT는 별도 (Step 5)
- **v1 → v2 코드 교체 = 별도 PR**: 마이그레이션 후에도 `recommendSignage.ts`(v1) 그대로 동작. v2 활성화는 컴펌 후 단일 PR
- **라이브 사이트 영향 없음**: 신규 테이블만 추가. 기존 호출 모두 정상

---

작성: 2026-05-16 야간 자율 진행 #56 (사용자 명시 "전부 진행")
실행 권장 시점: 9 pending 카테고리 옵션 A 결정 후 즉시
