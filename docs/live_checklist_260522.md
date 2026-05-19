# 5/22 라이브 직전 체크리스트 + 회고 템플릿 (환경장식물 v3)

**분류**: [검토 요청]
**작성**: 2026-05-20 야간 자율 (v10.4 사이클 끝·D-1·D-day 준비용)

## 1. D-1 (5/21) 사용자 영역 액션

### 1-1. 시각 검증 (`npm run dev` 후)
- [ ] `/admin/learning` → 환경장식물 관리 → **ProgramPartSignageMatrix 12파트 표 노출 확인**
- [ ] `/admin/learning` 6 섹션 모두 진입·로딩 확인 (개요·행사장 학습 현황·행사장 관리·환경장식물·시설 가이드·수정 요청)
- [ ] 새 프로젝트 만들기 → `/projects/[id]` 진입 → 제작물 추가 → **삭제 후 재추가 시 (project_id, no) 중복 X 확인**
- [ ] SeriesGenerator 시리즈 생성 (방향 4종) → no 채번 정합 확인
- [ ] 프로젝트 정보 변경 → 파트 추가 시 자동 design_items INSERT 확인 (b979439 fix 동작)
- [ ] case-d 빈 X배너 신규 생성 → 'X배너' 표기 (대시 없음) 확인

### 1-2. 운영 데이터 점검
- [ ] 라이브 사이트 https://ez-signage2.vercel.app 접속 확인
- [ ] 어드민 로그인 + /admin·/admin/learning·/admin/ai 진입 확인
- [ ] 기존 프로젝트 1건 열어 design_items 표시 확인 (no=null·'01'·'02' 모두 정상)
- [ ] /data 분석 페이지 13탭 진입 확인

### 1-3. DB 마이그레이션 (사용자 결정)
- [ ] Supabase Studio → SQL Editor에서 `migration_v10_4_fix_design_items_no.sql` 검토
- [ ] (선택) 라이브 직전 RUN 또는 라이브 직후 RUN 결정
- [ ] RUN 후 검증 = `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='design_items' AND column_name='no'` → `is_nullable = NO`
- [ ] 트리거 확인 = `SELECT tgname FROM pg_trigger WHERE tgrelid='public.design_items'::regclass`

### 1-4. 노션·외부 SOT 정합 (사용자 영역)
- [ ] 노션 §6-2 12 카테고리 시각 갱신 (사용자 자료 정합)
- [ ] 노션 §3·§9 venue·hall 시드 47건 정합 확인 (PROGRESS v10.2~3)
- [ ] 14시 예시 이미지 적재 (관리자 페이지 환경 장식물 종류 메뉴)

## 2. D-day (5/22) 라이브 모니터링

### 2-1. 배포 직전
- [ ] `auto/v10.4-design-items-no-fix-260519` 브랜치 main 머지 결정
- [ ] main push (사용자 명시·D-1 안정 후)
- [ ] Vercel 자동 배포 트리거 확인

### 2-2. 라이브 직후 (15분 안)
- [ ] https://ez-signage2.vercel.app 응답 200 확인
- [ ] 새 프로젝트 1건 만들어 전 흐름 시각 확인
- [ ] 콘솔 에러 0건 확인 (F12 → Console)
- [ ] Supabase Studio → design_items 새 INSERT row 정상 확인

### 2-3. 라이브 후 1시간
- [ ] 사용자 1~2명 새 프로젝트 시연 (실제 입력 케이스)
- [ ] 에러 발생 시 즉시 rollback 권장 = `git revert <commit>` + `git push`

## 3. 라이브 후 회고 (5/23~5/24)

### 3-1. 회고 항목 템플릿
```markdown
## 환경장식물 v3 라이브 회고 (5/23)

### 결과 (객관 수치)
- 라이브 시각:
- 첫 24시간 신규 프로젝트 수:
- 발생한 에러 수 (Sentry·콘솔):
- 사용자 보고 이슈:

### 잘 된 점
- (구체 사례)

### 문제 발생 (있었다면)
- 증상:
- 원인:
- 조치:
- 메모리 박제 후보:

### 자율 시스템 동작
- 야간 사이클 도움 됐나? (구체):
- /loop 같은 멈춤 패턴 재발 X?
- Forbidden phrases 출력 0건?

### 다음 사이클 우선순위
- (3-2 표 참조)
```

### 3-2. 다음 사이클 후보 우선순위 (5/23 결정)

| 순위 | 항목 | 작업량 | 라이브 영향 | 종속 |
|---|---|---|---|---|
| P0 | CLAUDE.md 다이어트 (926 → 250~350줄) | 4시간 | 없음 | 5/23 휴식 후 |
| P0 | `/loop` 룰 폐기 + Anthropic 공식 지속성 문구 도입 | 1시간 | 없음 | CLAUDE.md 다이어트 안에 |
| P0 | LearningManagerClient 6 섹션 SectionBoundary wrap | 2시간 | 없음·시각 검증 필요 | v10.4 컴포넌트 활용 |
| P1 | 시드 SOT 통합 옵션 C (PROGRAM_PART_SIGNAGE_DETAILS master + derive) | 3시간 | 있음·테스트 필수 | `docs/seed_sot_unification_260520.md` |
| P1 | harness 신규 4 케이스 (Iteration 4 미진행분) | 2시간 | 없음 | `nextDesignItemNo` 시뮬레이션 |
| P1 | scripts/check_v3 확장 (X-배너 잔존 grep·design_items helper 정합 grep) | 1시간 | 없음 | 자동 점검 강화 |
| P1 | 메모리 archive (43건 중 1개월+ 미수정 → archive/2026-04/) | 1시간 | 없음 | 사용자 직접 검토 |
| P2 | 팀장님 정의 보고서 5건 컴펌 답변 후 적용 | 변동 | 없음 | 컴펌 후만 |
| P2 | ProjectInfoClient·case-b·기타 INSERT 패턴 점검 (잠재 잔존) | 1시간 | 없음 | helper 정합 |
| P2 | 폴더링 가이드 docs/AI_LEARNING_FOLDERING.md 작성 (정의 보고서 8.4·8.5 인용) | 1시간 | 없음 | 정의 컴펌 후 |
| P2 | 재학습 파이프라인 실 호출 검증 (`relearn_from_perflist.mjs` + 발주엑셀 1건) | 2시간 | 없음 | 스켈레톤 작성 완료 |
| P3 | 메모리 자동 박제 cron (월 1회 정합 점검) | 4시간 | 없음 | 시스템 강화 |
| P3 | 폴더링 가이드 + L1_행사장 폴더 재정렬 (시설·행정 분리) | 변동 | 없음 | 정의 보고서 10.2절 |
| P3 | Next.js 14 → 16 업그레이드 검토 | 별도 PR | 큼 | 별도 사이클 |

### 3-3. 측정 가능한 성공 지표

- 라이브 후 48시간 안 사용자 보고 P0 이슈 ≤ 2건
- 새 design_items.no NULL INSERT 0건 (DB trigger 검증)
- /admin/learning 페이지 로딩 안 됨 보고 0건
- 'X-배너' 대시 신규 INSERT 0건
- Forbidden phrases 자체 출력 0건 (자율 사이클 진행 중)

## 4. 비상 시 rollback 절차

### 4-1. 라이브 직후 에러 발생 시
```bash
cd "C:\Users\EZPMP\Desktop\클로드 코드 활동용\업무 자동화\제작물 디자인 의뢰 가이드\프로그렘\mice-design-guide"
git log --oneline -10
# v10.3 시점 (5/19 G드라이브 SOT 정합)으로 rollback
git revert <v10.4 머지 커밋>
git push origin main
# Vercel 자동 재배포
```

### 4-2. DB trigger 문제 시
```sql
-- Supabase Studio에서 즉시 실행
DROP TRIGGER IF EXISTS trg_set_design_items_no ON design_items;
DROP FUNCTION IF EXISTS set_design_items_no();
ALTER TABLE design_items DROP CONSTRAINT IF EXISTS design_items_project_id_no_key;
-- 클라이언트 helper로만 작동 (이중 방어 = 보조 자동 fallback)
```

## 5. 자체 점검 (본 보고서)

- [x] [검토 요청] 분류 첫 줄
- [x] D-1·D-day·라이브 후 3단계 분리
- [x] 시각 검증 = 사용자 영역 명시
- [x] DB 마이그레이션 = 사용자 결정 영역
- [x] 다음 사이클 P0~P3 우선순위·작업량·종속 명시
- [x] 회고 템플릿 = 측정 가능한 지표 포함
- [x] rollback 절차 = 즉시 실행 가능 명령 명시
- [x] "97%·완벽" 표현 0건
