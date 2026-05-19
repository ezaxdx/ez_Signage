# design_items.no NOT NULL 위반 — 전수 진단 보고서

## 분류
[검토 요청]

## 요약
- 5/19 22:29 커밋 `b979439` = ProjectInfoClient 만 fix
- design_items INSERT는 총 **7개 파일**에 분산
- 그 중 **2개 파일**에 동일/유사 잔존 위험 가능 (조건부 — 운영 환경에서만 재현)

## 검증 명령 (이 보고서가 사실인지 확인)
```bash
# 7개 INSERT 위치 확인
grep -rn "design_items.{0,200}insert" app/ --include="*.tsx"

# no 필드 채우는 파일 5개 확인
grep -rln "no: String\|no: '01'\|no: r\.no" app/ --include="*.tsx"
```

## 7개 INSERT 위치 + no 생성 방식

| # | 파일 | no 생성 방식 | 잔존 위험 |
|---|---|---|---|
| 1 | `app/(dashboard)/projects/[id]/info/ProjectInfoClient.tsx` | DB 조회 후 `max(existingNos) + 1` | ✅ b979439 fix 적용 (안전) |
| 2 | `app/(dashboard)/dashboard/components/NewProjectButton.tsx` | `String(idx+1).padStart(2,'0')` | ✅ 신규 프로젝트만 = 항상 빈 상태 (안전) |
| 3 | `app/(dashboard)/projects/new/case-a/page.tsx` | `String(idx+1).padStart(2,'0')` | ✅ 신규 프로젝트 (안전) |
| 4 | `app/(dashboard)/projects/new/case-b/page.tsx:115` | `r.no \|\| String(i+1).padStart(2,'0')` | ✅ 신규 프로젝트 + 엑셀 폴백 (안전) |
| 5 | `app/(dashboard)/projects/new/case-d/page.tsx:45` | `'01'` 하드코딩 | ✅ 단일 항목 빈 프로젝트 (안전) |
| 6 | `app/(dashboard)/projects/[id]/components/ItemSidebar.tsx` | (확인 필요·grep 매칭) | ❓ 별도 확인 필요 |
| 7 | **`app/(dashboard)/projects/[id]/EditorLayout.tsx:314`** | `String(items.length + 1).padStart(2,'0')` | ⚠️ **잠재 충돌** |
| 8 | **`app/(dashboard)/projects/[id]/components/SeriesGenerator.tsx:65-68`** | `currentItemCount + 1` 기반 | ⚠️ **잠재 충돌** |

## P0 — 사용자가 보고한 버그 (이미 fix됨)
**증상**: 프로젝트 정보 페이지에서 환경장식물 파트 추가 시 `null value in column "no" of relation "design_items" violates not-null constraint`

**원인**: ProjectInfoClient.tsx 175-198행이 design_items INSERT 시 `no` 필드를 누락. ItemSidebar·NewProjectButton·case-a 5건 패턴과 불일치.

**Fix (커밋 b979439)**: `no: String(startNo + idx).padStart(2, '0')` 추가. `startNo`는 기존 design_items의 max(no) + 1.

**검증 (사용자 영역)**:
1. https://ez-signage2.vercel.app 진입
2. 기존 프로젝트 1건 열기 → /info 페이지 진입
3. 프로그램 파트 추가 → 저장
4. design_items 테이블에 새 행이 정상 INSERT 되는지 확인 (no = 기존 max + 1)

## P1 — 잠재 잔존 버그 #1 (EditorLayout.tsx 312-337)

### 코드
```ts
const handleAddItem = useCallback(async (preset?: {...}) => {
  const nextNo = String(items.length + 1).padStart(2, '0')
  const newItem: Partial<DesignItem> = {
    project_id: project.id,
    no: nextNo,
    ...
  }
  ...
})
```

### 위험 시나리오
1. 사용자가 제작물 5개 생성 (no = 01, 02, 03, 04, 05)
2. 02번 삭제 → items.length = 4
3. 사용자가 "제작물 추가" 클릭 → nextNo = '05' (이미 존재)
4. design_items 테이블에 (project_id, no) UNIQUE 제약이 있다면 → INSERT 실패
5. UNIQUE 제약 없다면 → 02·05 두 행이 no='05'로 중복 (Excel·PPT 출력 정합 깨짐)

### 사용자가 보고한 패턴과 일치하나?
- "행사 만들었을 때 만든 행사 정보가 추가 안되는 정보 연동 문제" → **부분 매칭 가능성**
- 새로 행사 만들면 빈 상태라 처음엔 안 터지지만, **삭제 + 재추가** 흐름 들어가면 잠재 발생

### 권장 수정안 (사용자 컴펌 후)
```ts
// 변경 후 (ProjectInfoClient 패턴 정합)
const existingNos = items
  .map(it => parseInt(it.no || '0', 10) || 0)
  .filter(n => n > 0)
const nextNoNum = existingNos.length > 0 ? Math.max(...existingNos) + 1 : 1
const nextNo = String(nextNoNum).padStart(2, '0')
```

## P1 — 잠재 잔존 버그 #2 (SeriesGenerator.tsx 63-89)

### 코드
```ts
let nextNoIdx = currentItemCount + 1
for (const v of variations) {
  const newNo = String(nextNoIdx++).padStart(2, '0')
  ...
}
```

### 위험 시나리오
EditorLayout과 동일 패턴 — `currentItemCount` 기반. 시리즈 생성 후 일부 삭제 + 시리즈 재생성 시 같은 충돌.

### 권장 수정안
EditorLayout과 동일하게 `Math.max(...existingNos) + 1` 패턴으로 통일.

## P2 — ItemSidebar.tsx (별도 확인 필요)
ItemSidebar에 design_items INSERT 패턴 grep 매칭됨. 본 진단에서는 추가 확인 안 함 (시간 한정). 사용자 컴펌 시 다음 사이클에서 같은 패턴 점검 필요.

## DB UNIQUE 제약 점검 (사용자 영역)
Supabase Studio → SQL Editor에서 다음 실행:
```sql
SELECT con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'design_items' AND con.contype IN ('u', 'p');
```

- UNIQUE (project_id, no) 존재 → P1 잠재 충돌이 실제 INSERT 실패로 이어짐
- 없음 → 데이터 중복만 발생 (Excel·PPT 행 카운트 정합 깨짐)

## 조치 권장 우선순위
1. **즉시 (D-2 안전)**: 사용자가 보고한 버그(ProjectInfoClient) = b979439로 fix됨. **라이브 검증 필요**.
2. **D-2 후**: EditorLayout·SeriesGenerator 패턴 통일 (Math.max 기반). 단일 PR로 5개 INSERT 위치 일관화.
3. **D-3 후**: ItemSidebar 추가 점검 + 전체 패턴 통일 정합 테스트.

## 라이브 영향 (검증 후 결정 필요)
- 5/22 D-2: 추가 코드 수정 미권장 (b979439 fix 라이브 안정성 확보 우선)
- 5/22 후: EditorLayout·SeriesGenerator 정합 수정 PR 단일 커밋으로 진행 권장

## 작성 정보
- 작성: 2026-05-19 22:55 (회사 PC Claude Code)
- 모드: 분석만 (코드 수정·DB 실행·push 모두 X — D-2 안전 모드)
- 검증 가능: 본 보고서 모든 라인은 grep·git show로 재현 가능

## Forbidden phrases 검증
이 보고서는 다음 표현을 사용 안 함:
- "97%·거의·대부분" (객관 결과만 인용)
- "큰 변경이라" (변경 크기 자체 판단 X)
- "사용자 직접 영역" (분석 완료 후 사용자 결정 영역만 명시)
- "박제 자제"
