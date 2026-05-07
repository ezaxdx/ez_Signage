# 향후 복귀 예정 기능 목록 (Backlog)

> 1차 출시에서 제거되었으나 사용자 요청에 의해 향후 다시 추가될 기능들. 코드는 git history와 주석에 보존됨.

## 2026-05-07 — 구버전 계획안에서 빠진 3가지

사용자 결정으로 명세에서 제외된 항목들.

### A. PM 사업부 / 부서별 납기 패턴 / 팀 단위 필터
- 위치: /data 페이지 PM 탭 / 납기 패턴 탭 (제거됨)
- 상태: TabKey enum에서 제외 (DataDashboard.tsx)
- 시드: SEED_PERFLIST의 pm_* 필드는 매칭 호환성 위해 남김
- 복귀: TabKey에 'pm', 'leadtime' 재추가

### B. 사외 사람과 편집 / 공유 링크 (`/share/[token]`)
- 위치: `app/share/[token]/page.tsx`, `ClientReviewView.tsx`
- 상태: 라우트 잔존 / 토큰 생성 UI 없음 → 사실상 사용 불가
- 시드: lib/types.ts의 share_token, ShareToken 잔존
- 복귀: 프로젝트 info 페이지에 "공유 링크 생성" 버튼 추가

### C. "7페이지 2번" (확인 필요)
- 사용자 메모: 정확한 항목은 구버전 계획안 PDF 참조 필요

---

## 1. 좌측 제작물 사이드바 (`ItemSidebar`)

**제거 시점**: 2026-05-07 사용자 명시 요청
**제거 위치**: `app/(dashboard)/projects/[id]/EditorLayout.tsx`
**보존 위치**: `app/(dashboard)/projects/[id]/components/ItemSidebar.tsx` (파일 자체는 그대로 유지)

**복귀 시 작업:**
- `EditorLayout.tsx`의 `import { ItemSidebar }` 주석 해제
- `<div className="flex flex-1 min-h-0">` 안에 `<ItemSidebar ... />` 다시 삽입
- `selectedItemId` 상태는 이미 유지되고 있어 다른 변경 불필요

**복귀 트리거**: 사용자가 명시적으로 "사이드바 다시 켜줘" 요청 시

---

## 2. 구역 확인·삭제 + 구역 설정 (`SlotPanel`)

**제거 시점**: 2026-05-07 사용자 명시 요청 ("향후 추가 진행 예정")
**제거 위치**: `app/(dashboard)/projects/[id]/EditorLayout.tsx`
**보존 위치**: `app/(dashboard)/projects/[id]/components/SlotPanel.tsx` (파일 자체는 그대로 유지)

**관련 핸들러 (현재 비활성, EditorLayout에 그대로 있음):**
- `handleSlotAdd` — 슬롯 추가
- `handleSlotDelete` — 슬롯 삭제
- `handleSlotRename` — 슬롯 이름 변경
- `handleSlotStyleUpdate` — 슬롯 서식 업데이트
- `handleApplyStyleToAll` — 전체 제작물에 서식 적용
- `handleInitDefaultSlots` — 기본 구역 초기화
- `slotPanelOpen` / `setSlotPanelOpen` 상태

이미 작성된 코드 자산 — 복귀 시 즉시 재사용 가능.

**복귀 시 작업:**
- `EditorLayout.tsx`의 `import { SlotPanel }` 주석 해제
- `<div className="flex flex-1 min-h-0">` 안에 `{slotPanelOpen && <SlotPanel ... />}` 다시 삽입
- EditorToolbar의 `onToggleSlotPanel`·`slotPanelOpen` props도 실제 값 다시 연결

**복귀 트리거**: 사용자가 "구역 설정 다시 켜줘" 또는 단계별 슬롯 편집 필요 시점 도달

---

## 3. 양식 선택기·규격 입력창 (`FormatSelector`)

**제거 시점**: 2026-05-07 사용자 요청 ("환경장식물 위 글자 입력창 없애줘", "향후 돌아올 예정")
**제거 위치**: `app/(dashboard)/projects/[id]/components/EditorToolbar.tsx`
**보존 위치**: `app/(dashboard)/projects/[id]/components/FormatSelector.tsx` (파일 자체는 그대로 유지)

**제거된 기능:**
- 캔버스 위 toolbar 중앙의 W × H mm 직접 입력
- 표준 양식 11종 드롭다운 선택
- 양식 변경 시 슬롯 비율 자동 재배치

**대체 동작 (1차):**
- 규격(mm) 편집은 상단 엑셀 그리드에서 더블클릭으로 가능 (예: "600×1800")
- 양식 변경은 새 제작물 생성 시 NewProjectButton 또는 case-a/c에서 지정

**복귀 시 작업:**
- `EditorToolbar.tsx`의 `import { FormatSelector }` 주석 해제
- 중앙 placeholder `{/* <FormatSelector ... /> */}` 주석 해제

**복귀 트리거**: 캔버스에서 즉석으로 규격 변경할 필요 발생 시

---

## 4. 슬롯 텍스트 직접 편집 (Fabric.js IText 더블클릭)

**상태**: CanvasBoard 자체는 유지되지만 SlotPanel 부재로 슬롯 추가/삭제는 현재 불가
**복귀 조건**: 위 #2 구역 설정 패널 복귀와 동시에

---

## 우선순위 매트릭스

| # | 기능 | 자동화 4필터 통과 여부 | 복귀 우선순위 |
|---|---|---|---|
| 1 | 제작물 사이드바 | ② 기존 업무 ✅ / ④ 사람 개입 줄어듦 ✅ | 중 — 다중 항목 빠른 전환 시 필요 |
| 2 | 구역 설정 패널 | ② 기존 업무 ✅ / ④ 부분 — 검토 필요성 ↑ | 중 — 마스터 시안 후 본격 활용 |
| 3 | 양식 선택기 | ② 기존 업무 ✅ / ④ 줄어듦 ✅ | 낮음 — 그리드 편집으로 대체 |

---

## 향후 복귀 시 체크리스트

복귀 작업 진행 전:
1. 사용자가 명시적 요청했는지 확인
2. 자동화 4필터 (CLAUDE.md §0) 통과 여부 재평가
3. 단순히 "있던 게 좋았다"가 아니라 **현재 기능으로 해결 안 되는 구체 문제** 확인
4. git history에서 제거 시점의 commit 찾아 변경분 reference

복귀 후:
1. 빌드·TSC·harness 검증
2. 본 backlog 파일에서 해당 항목 제거 (또는 "복귀 완료" 표기)
3. PROGRESS.md에 복귀 사실 기록
