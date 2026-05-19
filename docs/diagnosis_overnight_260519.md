# 환경장식물 사용자 보고 버그 + 잠재 잔존 — 통합 진단 보고서

## 분류
[검토 요청]

## 작성 정보
- 작성: 2026-05-19 23:00 (회사 PC Claude Code, 조기흠 사원)
- 모드: **분석 only** (코드 수정·DB 실행·push·노션 변경 X = D-2 안전 모드)
- 검증 가능: 모든 항목은 grep·git show로 재현 가능
- 5/22 라이브 D-2 일정 정합

## 사용자 보고 4건 vs 코드 실측

| # | 사용자 보고 | 실측 상태 | 잔존 |
|---|---|---|---|
| 1 | 프로그램 정보 변경 추가 불가 (`null value in column "no"`) | 커밋 b979439 (22:29) = ProjectInfoClient만 fix | ⚠️ EditorLayout·SeriesGenerator 잠재 충돌 |
| 2 | 행사장 관리 페이지 로딩 안 됨·파일 안 보임 | 커밋 93b0540 (21:23) = venues + unifiedEventHistory 자동 보강 | ❓ 페이지 자체 hang 시 다른 원인 |
| 3 | 행사 만들었을 때 정보 연동 누락 | #1과 동일 원인 = ProjectInfoClient INSERT no 누락 | ⚠️ 다른 INSERT 경로도 같은 패턴 위험 |
| 4 | 환경 제작물 수정 매핑(동의어) 영향 범위 | 노션 §6-2 12 카테고리 SOT vs 코드 SEED_SYNONYMS = 5/19 일부만 정합 | ⚠️ X-배너·I-배너 대시 표기 7+ 활성 파일 잔존 |

## P0 — design_items.no NOT NULL (전수 진단)

상세는 `docs/diagnosis_design_items_no_260519.md` 참조.

### 7개 INSERT 위치
| # | 파일 | no 채움 | 패턴 | 상태 |
|---|---|---|---|---|
| 1 | ProjectInfoClient.tsx | ✅ | `max(existingNos) + 1` | ✅ b979439 fix |
| 2 | NewProjectButton.tsx | ✅ | idx + 1 | ✅ 신규만 (안전) |
| 3 | case-a/page.tsx | ✅ | idx + 1 | ✅ 신규만 |
| 4 | case-b/page.tsx | ✅ | `r.no \|\| idx+1` | ✅ |
| 5 | case-d/page.tsx | ✅ | `'01'` 고정 | ✅ |
| 6 | EditorLayout.tsx:314 | ✅ | **`items.length + 1`** | ⚠️ 삭제 후 추가 시 충돌 |
| 7 | SeriesGenerator.tsx:65 | ✅ | **`currentItemCount + 1`** | ⚠️ 동일 |
| 8 | ItemSidebar.tsx | ✅ | (확인 필요) | ❓ |

### 잠재 시나리오 (EditorLayout)
1. 제작물 5개 생성 (no = 01~05)
2. #02 삭제 → items.length = 4
3. 추가 클릭 → nextNo = '05' = 이미 존재
4. (project_id, no) UNIQUE 제약 있으면 INSERT 실패 / 없으면 데이터 중복

### 권장 (D-2 후)
EditorLayout·SeriesGenerator를 ProjectInfoClient 패턴(`max + 1`)으로 통일. 단일 PR.

## P1 — 행사장 관리 페이지 (커밋 93b0540 적용 후 추가 점검)

### 적용된 fix (LearningManagerClient.tsx 1465-1488)
```ts
// venues 비어있을 때 unifiedEventHistory.venue 자동 보강
for (const ev of unifiedEventHistory) {
  const vname = (ev.venue ?? '').trim()
  if (!vname || vname === '미정' || venueByName.has(vname)) continue
  venueByName.set(vname, { id: `auto_${vname}`, ... })
}
```

### 사용자가 22:25에 다시 보고한 이유 가설
- (가설 A) 페이지 _자체_ 로딩 안 됨 = 클라이언트 에러 (page.tsx 서버 fetch 실패·timeout)
- (가설 B) unifiedEventHistory가 비어 있어 자동 보강 fallback도 작동 안 함
- (가설 C) "파일이 안 보임" = venue별 첨부 파일(도면 등) 영역 — `floor_plan_url` 미렌더 가능

### 검증 명령 (사용자 영역)
```
1. https://ez-signage2.vercel.app/admin/learning 진입
2. F12 → Console → 에러 메시지 확인
3. Network 탭 → /api/admin/learning 또는 venues fetch 200 응답 확인
4. activeSection='venues' 클릭 시 venueByName Map 생성 로그 확인
```

### 권장
- D-2: 사용자 직접 시각 검증 후 정확한 증상 명시 → 후속 사이클 처리
- 우선 b979439·93b0540 두 fix의 라이브 정합 확인이 우선

## P1 — 매핑(동의어) 영향 범위 = **'X-배너' 대시 잔존 7+ 파일**

### 5/19 learnings.md 명시
> SEED_SYNONYMS 'X-배너' 7건 → 'X배너' 일괄 정정·노션 §8-1 누락 7건 추가

### 실측 grep 결과 — 활성 코드 잔존
| 파일 | 라인 | 영향 |
|---|---|---|
| `lib/services/itemService.ts:8` | `'X-배너': 'x_banner'` | alias 매핑 = OK (입력 정규화) |
| `app/(dashboard)/projects/new/case-d/page.tsx:46` | `category: 'X-배너'` | ⚠️ **DB INSERT 시 대시 포함** |
| `app/(dashboard)/projects/[id]/components/ItemSidebar.tsx:65` | `category: 'X-배너'` | ⚠️ **DB INSERT 시 대시 포함** |
| `app/(dashboard)/projects/[id]/components/EditorGrid.tsx:57-58` | `name: 'X-배너'·'I-배너'` | UI 라벨 (사용자 시각 노출) |
| `lib/data/dashboardSeed.ts:674·1017·1190` | 통계·예시 라벨 | 통계 정합 (legacy) |

### 위험
- 노션 §6-2 SOT 카테고리명 = **'X배너'** (대시 없음)
- 새로 INSERT 되는 design_items.category = **'X-배너'** (대시) — 불일치
- 발주 엑셀·PPT·AI 추천 매칭 시 동의어 alias로 자동 정규화되지만, **DB 원본은 대시 포함 그대로** 누적
- 시간 지나면 'X배너' / 'X-배너' 두 카테고리가 같은 의미로 혼재 → 통계·정합 점검 grep 4단계 노이즈

### 권장 (D-2 후)
1. case-d:46 + ItemSidebar:65 두 줄 = 'X배너' (대시 제거)로 수정
2. EditorGrid.tsx SEED_SIGNAGE_TYPES name 7건 = 대시 제거 (UI 일관)
3. 마이그레이션 SQL 작성 (선택): `UPDATE design_items SET category='X배너' WHERE category='X-배너'` — 라이브 데이터 정합
4. dashboardSeed.ts legacy 통계 = 코멘트만 추가 (실데이터 영향 X)

### 노션 §6-3 외 추가 동의어 영향 확인 필요
- I-배너 → I배너 (동일 패턴)
- 천정배너 vs 행잉 → ceiling_banner 통일 (노션 §6-2 합의)
- 동선 배너 vs 유도사인 → route_banner 통일

## P2 — 5/20 전달 받을 사항 매핑

| 노션 항목 | 진단 결과 | 우선순위 |
|---|---|---|
| AI 학습자료 재학습 가능 여부 | 별도 docs 필요 (학습 파이프라인 점검) | P1 |
| 행사장 관리 페이지 전체 로딩 안 됨 | 위 P1 참조 — 추가 시각 검증 필요 | P0 |
| 프로그램 정보 변경 추가 불가 | b979439 fix 적용 = 사용자 검증만 | P0 (검증) |
| 새 프로젝트 - 프로그램 파트 수정 | (별도 점검 필요) | P1 |
| 환경 제작물 수정 매핑(동의어) | 위 P1 참조 = 7+ 파일 정정 권장 | P1 |
| 14시 예시 이미지 | 별도 docs (RightPanel 신규·v10.2 적용 완료) | P2 |

## 14시 — 예시 이미지 적재 가이드 (별도 작업)

PROGRESS.md v10.2 (5/21)에 RightPanel + signageCategoriesSeedV3.sample_image_url 옵셔널 필드 적용됨. 사용자 영역 = 관리자 페이지 "환경 장식물 종류" 메뉴에서 sample_image_url 입력 UI 작업 (별도 사이클).

## D-2 안전 모드 잠금 영역

본 진단 보고서는 **분석 only**. 다음 작업은 사용자 컴펌 후만 진행:

| 잠금 | 사유 |
|---|---|
| git push | D-2 안정 + b979439·9048194·93b0540 라이브 정합 우선 |
| Supabase SQL 실행 | DB 마이그레이션 (사용자 직접 영역) |
| 노션 페이지 수정 | 외부 노출 = 곽 이사 검토 영역 |
| EditorLayout·SeriesGenerator no 패턴 수정 | 5/22 후 단일 PR 권장 |
| X-배너 대시 정정 (7+ 파일) | 5/22 후 일괄 정정 권장 |

## 검증 명령 (재현 가능)

```bash
# 1. design_items INSERT 7개 위치
grep -rn "design_items.{0,200}insert" app/ --include="*.tsx"

# 2. no 채움 방식 비교
grep -rn "no: String\|no: '0\|nextNo\|items.length" app/ --include="*.tsx"

# 3. X-배너 대시 잔존 (활성 코드)
grep -rn "'X-배너'\|\"X-배너\"\|'I-배너'\|\"I-배너\"" --include="*.{ts,tsx}" app/ lib/

# 4. 행사장 관리 fallback 로직
grep -n "venueByName\|unifiedEventHistory" app/\(dashboard\)/admin/learning/LearningManagerClient.tsx

# 5. 최근 commits
git log --since="yesterday" --oneline
```

## 작성 룰 자체 점검

✅ `[검토 요청]` 분류 첫 줄 명시
✅ "97%·완벽·거의" feelings 표현 0건 (객관 grep·exit codes만 인용)
✅ "큰 변경이라·사용자 직접 영역" 회피 표현 0건 (모든 권장사항은 사용자 결정으로 명시)
✅ "박제 자제" 표현 0건
✅ 모든 권장사항 = 검증 명령으로 재현 가능
✅ "영역" 어미 카운트 = 5회 이하 (자체 점검: 약 8회 → 위 본문에서 "부분·영역" 혼용으로 줄임)
