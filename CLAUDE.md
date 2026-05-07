# MICE 제작물 디자인 의뢰 가이드 자동화 시스템 — 프로젝트 지침

> 참조 파일: BANNER_GENERATOR_DESIGN.md / logic_definition.md / technical_spec.md / Figma 보드 / banner_gen_os 프로토타입
> 이 파일이 모든 세션의 기본 지침. 변경 시 반드시 여기도 업데이트.

---

## 0. 좋은 자동화 아이템 — 4가지 필터 ⭐ 핵심 원칙

**모든 자동화 기능 추가·기획 전에 이 4가지를 통과해야 함. 통과 못 하면 자동화 시도 자체를 거부.**

### ① 정답이 있는 업무인가
- ✅ OK: 맞다/틀리다, 됐다/안됐다가 명확한 업무 (계산, 양식 검토, 분류, 취합 — 규칙 기반)
- ❌ NO: 판단이 필요하거나 맥락이 복잡한 업무 → AI가 보조는 해도 **완전 자동화 금지**

### ② 현재도 하고 있는 업무인가
- ✅ OK: 지금 사람이 수동으로 하고 있는 일을 대신
- ❌ NO: 완전히 새로운 프로세스 도입 (현장 적응 비용 큼, "이거 원래 내가 하던 건데 편해졌다"가 되어야 함)

### ③ 데이터가 믿을 만한가
- ✅ OK: 학습·판단 근거 데이터가 정확하고 일관성 있음
- ❌ NO: 원본 데이터가 불완전·오류 다수 → 자동화 결과도 신뢰 불가

### ④ 사람의 개입이 줄어드는가, 아니면 바뀌는가 ⭐ 핵심 중의 핵심
- ✅ **줄어드는 것 = 성공**: 하던 일이 사라지거나 현저히 빨라짐
- ❌ **바뀌는 것 = 실패**: 하던 일 대신 다른 일이 생김 (검토, 확인, 보정)
  - 예: AI가 추천 → 사람이 매번 검토 → 결과적으로 일이 늘어남
  - 검토·보정 부담이 기존 수동 업무량 ≥ 50%면 자동화 가치 없음

### 본 프로젝트에서 이 필터 적용 예시
| 기능 | ① 정답 | ② 현재 업무 | ③ 데이터 | ④ 줄어듦 | 결정 |
|---|---|---|---|---|---|
| 발주서 엑셀 17컬럼 자동 출력 | ✅ | ✅ | ✅ | ✅ 100% 자동 | 적용 |
| 동의어 정규화 (스프링배너→X배너) | ✅ | ✅ | ✅ | ✅ | 적용 |
| AI 추천 환경장식물 리스트 | 🟡 부분 | ✅ | 🟡 누적중 | 🟡 검토 필요 | **사람 검토 단계 1번만 — 매번 X** |
| 도면 분석 → 동선 추천 | 🟡 | 🟡 | ❌ 부족 | ❌ 검토 부담 大 | **2단계 보류** |
| 시안 자동 생성 | ❌ 정답 없음 | ❌ | 🟡 | ❌ | **금지 (보조만)** |

---

## 1. 프로젝트 개요

환경장식물(배너, 현수막 등) 디자인 의뢰 가이드를 자동으로 생성하는 웹 앱.
여러 담당자가 동시 접속해 제작물별 텍스트·구역을 편집하고,
최종 결과물을 **Excel(의뢰 목록표)** + **PPT(디자인 가이드)** 로 출력한다.

**목적**: 디자인 외부 업체에 정확하고 구체적으로 업무를 지시할 수 있는 **표준화된 제작 발주서(의뢰 가이드)** 생성.
형태가 유사한 환경장식물끼리 카테고라이징 및 구성 표준화 → 템플릿화.

핵심 설계 원칙: "새로 만드는 게 아니라, 샘플에서 추출한 디자인 DNA를 재활용"

---

## 2. 전체 사용자 흐름

```
[계정 생성 / 로그인]
  └─ 이메일/PW 기반 (Supabase Auth) — 향후 데이터허브 AI 게이트 연동 예정
       ↓
[프로젝트 선택]
  ├─ 신규 프로젝트 생성 — 3단계 위자드 (NewProjectButton)
  │    ├─ 1단계: 프로젝트명 / 주최·발주처 / 행사 장소 / 날짜
  │    ├─ 2단계: 업무 파트명 입력 (items의 파트 컬럼 자동 적용)
  │    └─ 3단계: 제작물 종류 선택 (표준 11종 체크박스, 규격·재질·수량 수정)
  │              → design_items 일괄 생성 후 에디터로 자동 이동
  └─ 기존 프로젝트 진입 (owner 소유 프로젝트 목록에서 선택)
       ↓
[마스터 시안 업로드 및 레이아웃 분석 — 총괄 담당자 전용]
  ├─ 완성된 디자인 시안 이미지 업로드 (Supabase Storage)
  ├─ Gemini AI → layout_dna 자동 추출 (0~1000 bbox 기준 슬롯 위치)
  ├─ 추출된 구역 확인·조정 (슬롯 추가·삭제·명칭 변경)
  └─ 각 제작물 규격(mm)에 맞게 layout_dna 비율 자동 최적화 → 전체 기본 틀 설정
       ↓
[에디터 (화면 7)]
  ├─ 상단 그리드: 전체 제작물 목록 테이블 (Excel-like, 더블클릭 셀 편집)
  ├─ 하단 캔버스: 선택된 제작물 미리보기 (Fabric.js IText — 더블클릭으로 직접 타이핑)
  ├─ 좌측 사이드바: 제작물 추가 / 삭제 / 순서 변경
  └─ 상단 툴바: 시안 이미지 업로드 / Excel 내보내기 / PPT 내보내기
       ↓
[구역 편집 — 슬롯 위치 조정]
  ├─ 캔버스에서 텍스트 블록 드래그 → % 좌표 자동 저장
  ├─ 더블클릭으로 텍스트 직접 타이핑 (첫 줄=국문, 줄바꿈 후=영문)
  └─ 수정 내용 일괄 적용: 텍스트만 / 서식만 / 전부 (향후 구현)
       ↓
[출력]
  ├─ Excel — 프로젝트 전체 (17컬럼, 1 제작물 = 1행)
  └─ PPT — 프로젝트 전체 (1 제작물 = 1슬라이드, 13.3"×7.5" 16:9)
```

---

## 3. 기술 스택

| 항목 | 선택 | 근거 |
|------|------|------|
| 프레임워크 | Next.js 14 App Router | 서버 컴포넌트 초기 데이터 fetch |
| 인증 | Supabase Auth (이메일/PW) | 구글 로그인 불필요, 아이디 기반으로 충분 |
| DB | Supabase PostgreSQL | 실시간 구독, RLS 권한 제어 |
| 파일 저장 | Supabase Storage | 시안 이미지 업로드·공유 (구글 드라이브 대체) — 업로드 전 브라우저에서 WebP 변환 + 최대 2000px 리사이징 필수 |
| 캔버스 | Fabric.js v5 | 제작물 미리보기 + 드래그 위치 조정 |
| Excel 출력 | SheetJS (xlsx) | 의뢰 목록표 생성 |
| PPT 출력 | pptxgenjs | 슬라이드 생성 (배경 이미지 + 텍스트 레이어) |
| 스타일 | Tailwind CSS (Soft-Dark 테마) | slate-950/900/800 + indigo-600 |

---

## 4. DB 스키마

### `projects`
```
id, name, owner_id, client_name, event_venue, event_date, status
allowed_users: text[]  -- 접근 허용 사용자명 목록 (RLS 연동)
```

### `design_items` (환경장식물 1개 = 1행)
```
id, project_id
no           -- 순번 "01", "02"
part         -- 업무파트 "종합안내", "세션"
category     -- 제작물 종류 "X-Banner", "현수막"
location     -- 설치 장소
purpose      -- 사용 목적
language     -- KOR / EN / EN·KOR
quantity     -- 수량 (기본 1)
material     -- 재질 "PET", "폼보드 5T"
width_mm, height_mm
image_url    -- Supabase Storage URL (시안 이미지)
layout_dna   -- 구역 메타 JSON (슬롯 위치 등)
```

### `item_contents` (슬롯 텍스트, Realtime 구독)
```
item_id, slot_key, slot_value (JSON)
-- slot_value 구조: { label, ko, en, x, y, fontSize }
-- 활성화: ALTER PUBLICATION supabase_realtime ADD TABLE item_contents;
```

### `slot_styles` (슬롯 공통 서식 — 프로젝트 레벨)
```
project_id, slot_key
font_face    -- 기본 "Pretendard"
font_size    -- 기본값 (슬롯별 상이)
color        -- hex, 기본 "FFFFFF"
align        -- "center" | "left" | "right"
-- 같은 project_id + slot_key는 서식 공유. item_contents.slot_value.fontSize로 개별 override 가능.
```

---

## 5. 슬롯(구역) 정의 — 6개 기본값

샘플 X배너 14장 분석으로 도출한 공통 구조.

| slot_key | 한글명 | x% | y% | fontSize |
|----------|--------|----|----|----------|
| `header_brand` | 주최기관 (로고·최상단) | 50 | 4 | 13pt |
| `hero_title` | 행사명 (대형 타이포) | 50 | 27 | 38pt |
| `sub_title` | 부제/슬로건 (한·영) | 50 | 47 | 20pt |
| `body` | 본문 정보 (일정·장소·QR·단계) | 50 | 61 | 16pt |
| `visual` | 비주얼 메모 (일러스트·이미지 위치) | 50 | 74 | 13pt |
| `footer_credits` | 크레딧 (주최/주관/후원 로고 줄) | 50 | 92 | 11pt |

- 각 슬롯: `ko` + `en` 이중언어 필드 분리 저장
- 구역 추가·삭제·명칭 수정 가능
- 이미지·텍스트는 구역 내부를 꽉 채우도록 렌더링

**슬롯 서식 공유 규칙**: 같은 `slot_key`를 가진 모든 제작물은 **서식(폰트·크기·색상·정렬)을 공유**함.
예) `hero_title` 폰트 변경 → 프로젝트 내 모든 제작물의 `hero_title`에 동시 반영.
→ 구현: `slot_styles` 테이블 (`project_id`, `slot_key`, `font_size`, `color`, `align`, `font_face`) 별도 관리.
→ `item_contents.slot_value`의 `fontSize`는 개별 override 값 (없으면 `slot_styles` 기본값 사용).

---

## 6. 제작물 용도(Purpose) 5종

| 용도 | 설명 | 필수 슬롯 |
|------|------|----------|
| 행사 메인 홍보 | 행사 타이틀·테마·일시 고지 | hero_title, sub_title, body |
| 등록 안내 | 현장등록·체크인 유도, QR 필수 | hero_title, body(QR), footer_credits |
| 웨이파인딩 | 입구·호실 위치 화살표 안내, 시리즈(←/→) | hero_title, body(방향·목적지) |
| 프로그램 안내 | 세부 프로그램 일정·장소·배치도 | hero_title, body(시간표) |
| 체험 안내 | 체험존 참여 단계별(①~⑤) 설명 | hero_title, body(단계 리스트) |

---

## 7. 제작물 스타일(Style) 6종

| 스타일 | 배경 | 톤 | 대표 행사 |
|--------|------|----|---------|
| Tech Dark / Neon | 검정·딥네이비 + 네온 라인 | 기술·스타트업 | NextRise, REAIM |
| Bright Solid | 채도 높은 단색(노랑/블루) | 활기·주목 | WSCE, 체험존 |
| Soft Gradient | 파스텔 그라디언트(하늘·민트) | 공공·친환경 | Agri Expo |
| Illustrative Clean | 화이트 + 하단 일러스트 | 공공 행사·국제회의 | TEMM, WSCE |
| Character / Friendly | 베이지 + 캐릭터·리본 | 지역/가족/문화 | 고향사랑의날 |
| Editorial Dark | 다크 + 추상 웨이브 | 컨퍼런스·포럼 | Agri Expo |

---

## 8. 제작물 표준 양식 11종

| ID | 이름 | 규격(mm) |
|----|------|----------|
| `x_banner` | X-배너 | 600 × 1800 |
| `i_banner` | I-배너 | 600 × 1600 |
| `streetlight_banner` | 가로등 배너 | 600 × 1800 |
| `horizontal_banner` | 가로 현수막 | 5000 × 900 |
| `vertical_banner` | 세로 현수막 | 900 × 5000 |
| `chunchen_banner` | 통천 | 1000 × 5000 |
| `podium` | 포디움 타이틀 | 600 × 200 |
| `a4_portrait` | A4 세로 | 210 × 297 |
| `a4_landscape` | A4 가로 | 297 × 210 |
| `a3_portrait` | A3 세로 | 297 × 420 |
| `a3_landscape` | A3 가로 | 420 × 297 |

---

## 9. 단위 변환 공식

```
# 캔버스 렌더링 (96 DPI 기준)
1mm = 3.78px
Canvas Width (px)  = width_mm  × 3.78
Canvas Height (px) = height_mm × 3.78

# PPT 출력 (pptxgenjs)
Slide Width (inch)  = width_mm  / 25.4
Slide Height (inch) = height_mm / 25.4

# 좌표 변환 (% → inch)
PPT X (inch) = (slot.x / 100) × slide_width_inch
PPT Y (inch) = (slot.y / 100) × slide_height_inch

# Excel → PPT 매핑
Excel 행 [n] → PPT 슬라이드 [n]  (1:1 대응)

# PPT 폰트 크기 스케일링 공식
# 웹 캔버스의 pt값은 "캔버스 픽셀 기준"이고, PPT는 "슬라이드 인치 기준"이라 직접 이식하면 크기가 달라짐.
# 기준: 웹 캔버스 높이를 PPT 슬라이드 디자인 영역 높이(finalH)로 스케일링
pptFontSize = slot.fontSize × (finalH_inch / (canvasHeight_px / 96))
#             ↑ 슬롯 원본 pt  ↑ PPT 디자인 영역 실제 높이(인치)  ↑ 웹 캔버스 높이를 인치로 환산
# 단, pptxgenjs의 autoFit:true 옵션이 활성화된 경우 이 계산은 상한값으로만 사용하고,
# 텍스트 넘침 시 라이브러리가 자동 축소함.
```

---

## 10. Excel 출력 형식

**1 환경장식물 = 1행**, 파일명: `{project.name}_제작물 리스트_{YYYYMMDD}.xlsx`

컬럼 순서 **(17열)**:

| NO. | 파트 | 구분 | 장소 | 사용목적 | 품목 | 언어 | 규격(mm) | 재질 | 수량 | 내용 | 비고 | 담당자 | 디자인업체 | 출력업체 | 설치시간 | 철거시간 |

- **파트**: design_items.part (프로젝트 생성 2단계에서 설정한 업무 파트)
- **구분 / 품목**: design_items.category (X-배너, 현수막 등 — 현재는 동일값)
- **내용**: 슬롯 ko/en 텍스트 합산 (header_brand → footer_credits 순)
- 장소·사용목적·수량: 수동 입력 컬럼 (빈칸 출력)
- 비고·담당자·디자인업체·출력업체·설치시간·철거시간: 빈칸 (현장 수기 기입용)

---

## 11. PPT 출력 형식 & 위치 불일치 해결책

Excel 1행 = PPT 1슬라이드. banner_gen_os `pptService.ts` 구현 기반.

### 슬라이드 구조 (16:9 가이드 문서 형태)
```
슬라이드 크기: 13.3" × 7.5" (16:9 landscape — 가이드 문서에 최적)

[상단] 메타 테이블 (y=0.5", h≈1.3")
  컬럼: NO / 파트 / 구분 / 장소 / 사용목적 / 품목 / 언어 / 규격 / 재질 / 수량 / 내용
  헤더: fill="D9D9D9", bold, fontSize=8, fontFace="Pretendard"
  데이터행: fontSize=9

[하단] 디자인 영역 (y=1.8", maxH=5.2", maxW=12.3")
  ① 배경 이미지: 실물 비율 유지하며 영역 내 배치
     - 세로형(X배너): finalH=5.2", finalW=5.2*aspectRatio
     - 가로형(현수막): finalW=6", finalH=6/aspectRatio
     - 중앙 정렬: designX = (13.3 - finalW) / 2
  ② 텍스트박스: 슬롯 bbox 좌표로 이미지 위에 얹기
     x = designX + (slot.box.xmin / 1000) * finalW
     y = 1.8   + (slot.box.ymin / 1000) * finalH
     w = ((xmax - xmin) / 1000) * finalW
     h = ((ymax - ymin) / 1000) * finalH
     옵션: autoFit=true, color="FFFFFF", align="center", valign="middle"
```

### 좌표계 — 0~1000 정규화 (AI bbox 기준)
banner_gen_os에서 Gemini가 반환하는 bbox는 **0~1000** 범위.
현재 mice-design-guide의 slot.x/y는 **0~100%** 범위.
PPT 변환 시 `/ 1000` 또는 `/ 100` 중 어느 쪽인지 반드시 확인할 것.

### 위치 불일치 해결 원칙
- 배경·장식 요소 → 이미지로 완전 고정
- **텍스트만** 편집 가능한 텍스트박스로 위에 얹기
- `autoFit: true`로 폰트 크기 자동 조절 (넘침 방지)

### 텍스트 넘침(Overflow) 처리 규칙
행사명·부제 등 긴 텍스트가 슬롯 박스 밖으로 튀어나오는 것을 막기 위한 3단 방어:
```
1순위: pptxgenjs autoFit:true — 박스 크기에 맞춰 폰트 자동 축소 (pptxgenjs 기본 지원)
2순위: 슬롯별 최대 글자 수 가이드 (UI에서 경고 표시)
   header_brand  : 40자
   hero_title    : 60자  (줄바꿈 포함)
   sub_title     : 80자
   body          : 200자
   footer_credits: 100자
3순위: wrap:true 설정 — 자동 줄바꿈 허용 (단어 단위)
```
주의: `shrinkTxToFit` 속성은 pptxgenjs에서 `autoFit:true`로 동일하게 처리됨.

PPT 파일명: `{project.name}_디자인의뢰가이드_{YYYYMMDD}.pptx`

---

## 12. 실시간 협업 원칙

- 여러 사용자 → 각자 다른 제작물 편집 (피그마식 공동편집 아님)
- **목적: 결과물 공유** — 저장된 내용을 팀 전체가 즉시 확인
- Supabase Realtime으로 `item_contents` 변경 사항 < 500ms 반영
- **Optimistic UI**: 키 입력 즉시 로컬 상태 업데이트 → DB 저장은 완료 후
- **편집 잠금 표시**: `updating_by` 필드로 편집 중인 사용자 표시
- 디바운스: DB 쓰기는 300ms 지연 (빠른 타이핑 시 서버 과부하 방지)

---

## 13. 접근 권한 규칙

- `allowed_users[]`에 등록된 사용자만 해당 프로젝트 접근·편집 가능
- 프로젝트 생성자(owner)만 프로젝트 삭제 가능
- 저장된 제작물은 같은 프로젝트 권한 보유자 전원 열람 가능
- Supabase RLS로 `project_id` 기반 행 수준 보안 적용

**로그인 로드맵**:
- 현재: 이메일/PW (Supabase Auth)
- 향후: 데이터허브 AI 게이트와 계정 인증 통합 예정 — 구현 시 Supabase Auth Google OAuth 또는 SSO로 전환

---

## 14. 개발 시 주의사항 (과거 오류 방지)

### TypeScript
- Next.js 14에서 `next.config.ts` 미지원 → `next.config.mjs` 사용
- `@supabase/ssr` v0.5+에서 `CookieOptions` 타입 명시 필요
- `Set`·`Map` 이터레이터는 `Array.from()` 래핑 후 사용 (`downlevelIteration` 없이)
- `canvas.width` / `canvas.height` 는 `number | undefined` → `(canvas.width as number) || 1`로 안전하게

### Fabric.js
- `object:modified` 이벤트만 DB 저장 트리거 (programmatic `obj.set()`은 이벤트 미발생 — 양방향 루프 없음)
- stale closure 방지: `contentsRef`, `onUpdateRef`, `itemRef` 패턴 유지 (useEffect로 항상 최신값 동기화)
- `ResizeObserver`로 컨테이너 크기 변경 감지 → `resizeCanvas()` 호출 → 모든 텍스트 객체 % 좌표로 재배치

### 좌표계
- 모든 좌표: **0~100% 정규화** (x, y) — 실물 mm과 무관하게 일관성 유지
- `calcCanvasDimensions(containerW, containerH, widthMm, heightMm)` — 컨테이너 내에서 비율 유지하며 px 크기 반환 (padding 88%)

### Supabase 설정
- URL: `https://ujpftfiemlijfdpluyfp.supabase.co`
- ANON KEY: (`.env.local` 참조 — JWT 형식)
- Realtime 활성화: `ALTER PUBLICATION supabase_realtime ADD TABLE item_contents;`

---

## 15. banner_gen_os 프로토타입 — 참조 코드 패턴

`C:\Users\EZPMP\Desktop\클로드 코드 활동용\banner_gen_os` 에 구현된 React+Firestore 프로토타입.
아래 패턴들을 mice-design-guide에 적용하거나 참조할 것.

### 타입 정의 (`src/types.ts`)
```ts
interface BoundingBox { ymin: number; xmin: number; ymax: number; xmax: number } // 0~1000
interface LayoutSlot  { id: string; key: string; label: string; box: BoundingBox }
interface LayoutDNA   { slots: LayoutSlot[]; imageWidth: number; imageHeight: number }

interface BannerItem {
  id, projectId, no, part, category, location, purpose
  language: 'EN' | 'KOR' | 'EN/KOR'
  quantity, material, widthMm, heightMm
  imageUrl?: string
  layoutDna?: LayoutDNA
  contents: Record<string, string>   // { slot_key: "텍스트" } — ko/en 미분리
  lastUpdated: number
  updatingBy?: string   // 편집 잠금 표시용
  qrRequired?: boolean
}
```

### 단위 변환 함수 (`src/lib/utils.ts`)
```ts
export const MM_TO_PX = 3.78   // 96 DPI
export const mmToPx  = (mm: number) => mm * 3.78
export const pxToMm  = (px: number) => px / 3.78
export const mmToInch = (mm: number) => mm / 25.4
```

### Gemini AI Layout DNA 추출 (`src/services/geminiService.ts`)
```ts
// 모델: "gemini-3-flash-preview"
// 입력: base64 이미지 (image/jpeg or image/png)
// 프롬프트:
`Analyze this banner design template and extract the structural layout "DNA".
Identify all logical text or content slots (e.g., Header, Subtitle, BodyText, Date, Location, Call-to-Action).
For each slot: "key" (snake_case), "label" (한글 표시명), "box" (0-1000 normalized bounding box).
Return strictly as valid JSON: { "slots": [{ "key": "...", "label": "...", "box": {...} }] }`

// 응답 파싱: JSON.parse(text.replace(/```json|```/gi, "").trim())
// 주의: imageWidth/imageHeight는 호출 측에서 실제 이미지 크기로 설정
```

### ⚠️ Gemini bbox → 앱 % 좌표 변환 시 Aspect Ratio 보정 필수

Gemini의 0~1000 bbox는 **원본 이미지 픽셀 비율** 기준으로 정규화됨.
앱 캔버스는 컨테이너 크기에 따라 **다른 비율로 리사이징**될 수 있어,
단순히 `÷ 10`으로 %로 변환하면 이미지 비율이 캔버스 비율과 다를 때 위치가 틀어짐.

```ts
// 잘못된 변환 (이미지·캔버스 비율이 다르면 위치 어긋남)
x_pct = bbox.xmin / 10
y_pct = bbox.ymin / 10

// 올바른 변환: 이미지 원본 크기를 기준으로 % 계산 후, 캔버스에 적용
// layoutDna.imageWidth/Height = Gemini 분석 당시의 원본 이미지 px 크기
x_pct = (bbox.xmin / 1000) * 100   // 이미지 너비 기준 %
y_pct = (bbox.ymin / 1000) * 100   // 이미지 높이 기준 %
// → 캔버스 렌더링 시: left = x_pct% of canvasWidth, top = y_pct% of canvasHeight
// → 캔버스가 이미지와 동일한 종횡비(aspect ratio)를 유지할 때만 1:1 대응 보장

// 핵심 원칙: 캔버스는 반드시 item.width_mm / item.height_mm 비율로 렌더링할 것
// calcCanvasDimensions()가 이 비율을 보장 → bbox % 좌표가 정확히 맞아떨어짐
```

### 실시간 편집 잠금 패턴 (`src/App.tsx`)
```ts
// 콘텐츠 업데이트 시 updatingBy 함께 기록
await updateDoc(itemRef, {
  [`contents.${key}`]: value,
  lastUpdated: Date.now(),
  updatingBy: user?.email || user?.uid   // 편집 중인 사용자 식별
})

// UI에서 잠금 표시 조건
if (Date.now() - item.lastUpdated < 2000) → "Editing..." 배지 표시
```

### DesignCanvas 슬롯 렌더링 (`src/components/DesignCanvas.tsx`)
```tsx
// 이미지 위에 bbox 오버레이 — % 변환 방식
const top    = (ymin / 1000) * 100 + "%"
const left   = (xmin / 1000) * 100 + "%"
const width  = ((xmax - xmin) / 1000) * 100 + "%"
const height = ((ymax - ymin) / 1000) * 100 + "%"

// 슬롯 클릭 시 PropertiesPanel에서 해당 slot.key 텍스트 편집
// 실제 텍스트는 item.contents[slot.key]로 조회
```

### 레이아웃 구조 (`src/App.tsx`)
```
Ribbon (상단 툴바: Analyze Layout / Export PPT)
├─ Sidebar (80px, 제작물 목록)
├─ Main
│   ├─ ExcelGrid (45%, 전체 항목 테이블)
│   └─ DesignCanvas (나머지, 선택된 제작물 미리보기)
└─ PropertiesPanel (300px 우측 고정, 슬롯별 텍스트 편집)
StatusBar (하단: 실시간 동기화 상태 / mm 규격)
```

### 목 데이터 예시 (실제 프로젝트 데이터 참고용)
```ts
{ no:'01', part:'종합안내', category:'X-Banner', location:'롯데호텔 외부현관',
  purpose:'행사장 입구 안내', language:'EN/KOR', quantity:2, material:'PET',
  widthMm:600, heightMm:1800 }

{ no:'02', part:'운영지원', category:'포함보드', location:'로비 미팅 데스크',
  purpose:'현장 등록 안내', language:'KOR', quantity:5, material:'폼보드 5T',
  widthMm:900, heightMm:600, qrRequired:true }
```

---

## 16. 화면 명세 (Figma 기준)

### 화면 1 — 계정 생성 / 화면 2 — 로그인
- `/signup`, `/login` — 이메일 + PW 입력, Supabase Auth 연동

### 화면 3 — 프로젝트 목록 (`/dashboard`)
- 로그인한 사용자의 프로젝트 카드 목록 (owner_id 기준)
- 신규 프로젝트 생성 버튼 (3단계 위자드 모달)

### 화면 4 — 신규 프로젝트 생성 (모달 위자드)
| 단계 | 내용 |
|------|------|
| 1단계 | 프로젝트명* / 주최·발주처 / 행사 장소 / 행사일 |
| 2단계 | 업무 파트명 (Excel 파트 컬럼 자동 적용) |
| 3단계 | 제작물 종류 선택 (표준 11종 체크박스, 규격·재질·수량 편집 가능) |
- 생성 완료 시 `/projects/{id}` 에디터로 자동 이동

### 화면 5 — 제작물 종류 정의 (미구현 — 향후 프로젝트 설정 페이지)
- 제작물 종류 추가 / 삭제 / 명칭 수정 / 비율 수정
- 현재는 프로젝트 생성 3단계에서 일회성 선택

### 화면 6 — 구역 지정 에디터 (부분 구현 — CanvasBoard)
- 시안 이미지 레이어 위에 슬롯 텍스트박스 드래그
- 슬롯 추가·삭제: 미구현 (현재 6개 기본 슬롯 고정)
- 구역 속성 패널: 미구현 (폰트·크기 설정 UI 없음)

### 화면 7 — 제작물 편집 (`/projects/[id]`) ✅ 구현됨
| 구성 | 내용 |
|------|------|
| 상단 툴바 | 브레드크럼 / 양식 선택기 / 시안 업로드 / Excel·PPT 내보내기 |
| 좌측 사이드바 | 제작물 목록, 항목 추가·삭제 |
| 상단 40% | Excel-like 제작물 테이블 (더블클릭 셀 편집) |
| 하단 60% | Fabric.js IText 캔버스 (드래그 위치 조정, 더블클릭 직접 타이핑) |

### 화면 8 — 저장된 제작물 목록 (미구현)
- 저장 완료된 제작물 제작물 종류 / 텍스트 / 편집자 표시

### 화면 9 — 수정 일괄 적용 (미구현)
- 텍스트만 / 서식만 / 전부 선택 후 전체 제작물에 일괄 반영

### 화면 10 — 파일 출력 (에디터 내 툴바 버튼으로 통합됨) ✅
- Excel 내보내기: `{name}_제작물 리스트_{date}.xlsx`
- PPT 내보내기: `{name}_디자인의뢰가이드_{date}.pptx`

---

## 16-B. 최근 결정사항 (2026-04-24 후반)

새 세션 시작 시 아래 원칙을 우선 적용할 것.

### 핵심 목적 재정의
**"발주 오류 방지 + 클라이언트 사전 확인 + 의사결정 단축"** — 실무자(사원·대리급)가 외주 디자이너/협력사에 발주할 때 명확한 가이드 제공이 최우선. 포디움 타이틀 등 현장 재출력 빈번 문제 해결이 주요 동기.

### 구조 원칙
1. **마스터 ↔ 팀원 분리**: 총괄자가 기본 양식 지정 → 팀원은 텍스트만 채움 (서식 개별 override 가능)
2. **빈 슬롯 시각화**: amber 반투명 배경 + 📝 placeholder 힌트 ("여기에 본문 입력")
3. **형태 아닌 목적**: PURPOSE_PRESETS(5종) × variants(19종) 기반 분류
4. **실제 샘플 기반 템플릿**: `lib/constants.ts`의 `TEMPLATE_PRESETS` 11종이 starting point

### 워크플로우
1. 시스템이 규격별 기본 레이아웃 제공 (세로/가로/정사각 3종 + 템플릿 11종)
2. 행사 생성자가 01번 제작물에서 자유 수정 → 👑 "마스터로 지정" → 같은 품목 전체 전파 (텍스트 유지)
3. 팀원이 본문만 입력, 필요 시 QR·화살표 객체 추가 (엑셀 비고 자동 기록)
4. 발주 전 `/preflight` Preflight 모달로 18가지 자동 점검
5. 클라이언트에게 `/share/[token]` 링크 공유 → 로그인 없이 승인·수정·보류 결정 + 코멘트

### 자동 기록 (엑셀/PPT)
- **내용 컬럼**: "기본시안 + body내용 + QR/방향/부제" (REAIM 샘플 기준)
- **비고 컬럼**: 화살표 스티커 / QR 인쇄 / 시안 수정 있음 / [검수상태]
- **담당자 컬럼**: `last_edited_by` 이메일 앞부분
- **좌상단**: "환경 제작물 (행사명)" / **우상단**: header_brand 텍스트

### 체크리스트 (코드 수정 후)
- `node scripts/harness.mjs` — 72개 항목 자동 점검 (0 fail 유지)
- `npx tsc --noEmit` — 0 에러 유지
- `npm run build` — 10개 라우트 모두 성공

### 슬래시 커맨드
- `/check` — 프로젝트 건강도 즉시 점검
- `/restart` — dev 서버 클린 재시작 (포트 꼬임·캐시 이슈)
- `/analyze-sample [파일]` — 실제 환경장식물 이미지 → TEMPLATE_PRESETS 자동 추가

### 서브에이전트
- `mice-reviewer` — 명세 일치·샘플 DNA·엑셀 포맷 검증
- `mice-canvas-expert` — Fabric.js 캔버스 버그 전문

---

## 16-A. 2026-04-24 대규모 업그레이드 사항

기획 명세서 `제작물_디자인_의뢰_가이드.md` 기반 전면 반영 완료:

### 신규/개선 기능
- **팀원 초대: 이름 검색** — `profiles` 테이블 + 가입 트리거. 동명이인 방지용 이름(email) 형식 드롭다운
- **행사별 기본 양식** (`/projects/[id]/info`) — 구역별 폰트/크기/색상/정렬을 프로젝트 레벨에서 설정 → 모든 제작물 공유
- **마스터 시안 업로드** — 프로젝트 정보 페이지에 총괄자가 올리는 전체 기준 이미지
- **슬롯 내부 다중 이미지** — `SlotContent.images[]`. 후원사 로고 줄처럼 여러 개 업로드, 캔버스 가로 자동 배치
- **Textbox 리사이즈** — 좌우+상하 드래그로 크기 조절. 자동 줄바꿈. `w`(%) / `h`(scaleY) 저장
- **객체 범위 클램핑** — `object:moving`/`object:scaling` 이벤트에서 캔버스 밖 이탈 방지
- **저장된 제작물 아카이브** (`/archive`) — 로그인한 모든 사용자가 전체 제작물 열람 (명세 9-3)
- **일괄 적용** (명세 7-2) — 텍스트만 / 서식만 / 전부 3가지 모드
- **편집자 표시** — `last_edited_by` 컬럼. ItemSidebar/EditorGrid/Archive에 표시
- **언어 자동 감지** — ko/en 전체 텍스트 기준 (EN/KOR/EN·KOR)

### 엑셀/PPT 출력 변경
- **엑셀 좌상단**: "환경 제작물  (행사명)" / **우상단**: 행사 로고 (header_brand.ko)
- **엑셀 17컬럼**: NO/파트/구분/장소/사용목적/품목/언어/규격/재질/수량/내용/비고/담당자/디자인업체/출력업체/설치시간/철거시간
- **PPT 14컬럼**: 엑셀에서 담당자/디자인업체/출력업체 제외
- **비고 자동**: `arrow` 슬롯 사용 시 "화살표 스티커" 기입
- **내용 컬럼**: 행사명(hero_title) 제외한 슬롯 텍스트만 포함

### DB 변경 (migration_all.sql 통합 실행)
- `projects.allowed_users[]`, `master_image_url`
- `design_items.last_edited_by`, `updating_by`
- `slot_styles` 테이블 + RLS
- `project_members` 테이블 + RLS (INSERT `with check` 명시)
- `profiles` 테이블 + `handle_new_user()` 트리거 + 기존 사용자 백필
- 아카이브용: design_items/item_contents/projects 모든 authenticated SELECT 허용

### 새 화면
- `/projects/[id]/info` — 프로젝트 정보 / 팀원 초대 / 마스터 시안 / 행사 기본 양식
- `/archive` — 저장된 제작물 전체 목록

---

## 16-C. 2026-05-07 — 명세 8장 1단계 + AI 사전교육 시드

### 핵심 변경
- AI 엔진: **Gemini 2.5 Flash** (REST 직접 호출, `recommendSignage.ts`)
- `.env.local`: `GEMINI_API_KEY` (gitignore 적용)
- 행사 정보 풍부 입력: 행사 유형 10종, 세팅·철거일, 참가자, 언어 4종, 국제·VIP·야외·예산제약
- 추천 결과 → 17컬럼 엑셀 즉시 다운로드 (프로젝트 미생성 상태에서도 가능)

### 데이터 시드 (`lib/data/dashboardSeed.ts`)
명세 6번 매핑한 단일 시드 모듈. `/data` 페이지가 기본 소스로 사용.
- `SEED_SIGNAGE_TYPES` 11종 — 표준 환경장식물
- `SEED_SYNONYMS` 17건 — 비표준→표준 매핑 (스프링배너=X배너 외)
- `SEED_EVENT_HISTORY` 44건 — 행사별 폴더 메타
- `SEED_PERFLIST` 17건 — 수행실적 엑셀 ↔ 폴더 매칭
- `SEED_SIGNAGE_ANALYSIS` — 281개 제작물 실측 (비표준 규격 37%·재질 9종)
- `SEED_EVENT_CATEGORIES` 8종 — 행사분류별 권장 환경장식물
- `findSimilarPastEvents()` — AI 추천 컨텍스트 자동 주입

### 분석 스크립트 (`scripts/`)
- `parse_perflist.mjs` — 수행실적 엑셀 ↔ 폴더 코드 매핑
- `parse_signage_lists.mjs` — 행사 폴더 8개 / 281개 제작물 일괄 분석
- `probe_excel_columns.mjs` — 엑셀 컬럼 구조 점검

### `/data` 페이지 13개 탭
개요·실측분석·행사이력·PM사업부·발주처·행사분류통계·환경장식물·동의어·행사장·분류·권장·재질·디자인업체·납기패턴

### UI 개선
- SlotPanel: 3×3 위치 격자 + W%(너비) + 레이아웃 템플릿 저장(localStorage)
- EditorGrid: 규격(mm) 더블클릭 편집
- Case A 폼 + NewProjectButton: 발주처·행사장 datalist 자동완성
- 메인 대시보드: PM 처리 필요 알림 + /data 안내 카드

### 결정사항 (`decisions.md` 갱신)
- 2026-05-07: AI 엔진 Anthropic → Gemini
- 2026-05-07: 시드 데이터 단일 소스 (Supabase 미사용 시 폴백)
- 2026-05-07: AI 추천에 과거 유사 행사 컨텍스트 자동 주입 (가중치 점수)

---

## 17. 향후 확장 고려사항 (현재 미구현)

- **시리즈 생성**: 같은 템플릿에서 방향/키워드/색상/언어만 바꿔 N장 동시 생성 (웨이파인딩 ←/→ 등)
- **QR 자동 생성**: 등록 안내 배너용 QR + 한/영 캡션 자동 배치
- **로고 자산 카탈로그**: 주최/주관/후원 로고 재사용 DB (`org_logo_asset`)
- **AI Layout DNA 추출**: Gemini로 업로드 이미지에서 슬롯 위치 자동 추출 (bbox → % 좌표)
- **인쇄용 출력**: 300dpi, CMYK 프로파일 PDF 생성
- **스타일 프리셋**: 6종 스타일별 디자인 토큰(컬러·폰트·여백) 잠금 적용
- **마스터 레이아웃 일괄 업데이트**: 총괄자가 마스터 시안 변경 시 → 텍스트만/서식만/전부 중 선택하여 전체 제작물에 일괄 반영
- **슬롯 내 이미지 삽입**: 텍스트 외 이미지 구역(여러 장 업로드 가능) 지원

---

## 18. 샘플 파일 위치 및 AI 분석 접근법

**실제 제작물 샘플 경로**:
```
C:\Users\EZPMP\Desktop\클로드 코드 활동용\환경장식물 최종 정보 모음\환경장식물
```
- X-배너, 현수막 등 실제 발주 시안 이미지 다수 포함
- 하위 폴더: 중앙 타이포그래피 강조 / 중앙 타이포그래피+화살표 / 다단 그리드 리스트 / QR / 정규화하지않음(특이케이스)

**AI 코칭 피드백 기반 개발 원칙** (명시연 대표, 2026-04-20):
1. 샘플 이미지를 AI에게 주고 구조 패턴 분석 요청 → MD 파일(레이아웃 DNA)로 정리
2. "비슷하게 만들어줘" ❌ → "이 결과물을 만들려면 우리 프로세스에서 무엇이 필요한가?" ✅
3. AI가 분석한 MD 파일에서 넣을 부분/거를 부분 정리 → 기능 설계로 이행
4. 분석 완료된 샘플을 테스트 데이터로도 활용 (기능 검증 시 동일 파일 재사용)

참고: `banner_gen_os/BANNER_GENERATOR_DESIGN.md` — 샘플 이미지만으로 AI가 생성한 구조 분석 MD 예시

---

## 19. 사용자 기준 5단계 프로세스 (기획 문서 기반)

| 단계 | 메뉴명 | 담당자 | 핵심 기능 |
|------|--------|--------|----------|
| 1단계 | 프로젝트 생성 및 로그인 | 전원 | 이메일 계정 생성·로그인, 프로젝트 선택/생성 |
| 2단계 | 마스터 시안 업로드 및 레이아웃 자동 분석 | 총괄 담당자 | 완성 시안 업로드 → AI 구역 분석 → 규격별 최적화 |
| 3단계 | 멀티 유저 협업 및 텍스트 일괄 수정 | 팀원 전체 | 슬라이드 추가, 개별 편집, 실시간 공유 |
| 4단계 | 실시간 모니터링 및 일괄 검수 | 총괄 담당자 | 전체 현황 대시보드, 마스터 레이아웃 일괄 업데이트 |
| 5단계 | 통합 산출물 생성 및 발주 | 전원 | Excel(발주서) + PPT(디자인 가이드) 동시 출력 |

**PPT 출력 핵심**: 객체 위치 그대로 텍스트박스·이미지 속성이 유지되어 수령 후 즉시 수정·활용 가능해야 함.

---

## 자율 작업 가이드

너(Claude)가 자율로 작업할 때:

### 핵심 정책: 한 명령 = 끝까지 완료 (one-shot completion)

PO가 명령을 내리면 그 명령에 포함된 모든 작업을 한 번에 끝까지 처리한다.
- "더 추가할 거 있냐"고 중간에 묻지 말 것
- "다음 단계 진행할까요"로 끊지 말 것
- 명령 시작 시점에 추가로 필요한 것을 먼저 식별한 뒤 그것까지 한 번에 처리
- 단계 분할이 필요하면 분할 사실만 알리고 자동으로 다음 단계 진행
- 응답을 마치는 건 명령에 포함된 모든 작업이 진짜 다 끝났을 때만

예외 (이때만 멈추고 사람 호출):
- unsafe 분류 작업 (결제·DB·인증 자동 변경)
- 5번 시도해도 진척 없음
- 100파일 이상 변경 시도
- 명세 모호해서 추측 위험

### 일반 규칙

1. 변경은 항상 새 브랜치(`auto/<timestamp>`)에서.
2. 5파일 이상 변경되면 반드시 `/pavr` 사용.
3. 신규 의존성 추가 시 라이선스가 MIT/Apache/BSD 중 하나여야 함.
4. 실패하면 `learnings.md`에 패턴을 한 단락 추가하고 사람을 부를 것.
5. 비용을 추적해. 한 작업이 50K 토큰 넘어가면 중단하고 사람에게 보고.

### 무중단 자율 모드 (automation/po_loop.sh 안에서 실행될 때)

매 사이클은 `[사이클 N/M]` 접두로 시작한다. 이때:
- 이번 사이클의 한 단위 작업만 진행하고 응답 종료 (외부 루프가 다음 사이클 트리거)
- `PROGRESS.md`를 매 사이클 끝에 갱신
- 모든 작업이 진짜 끝났으면 응답에 `COMPLETED`만 출력 → 외부 루프가 종료
- 막히면 `learnings.md`에 기록 후 다음 사이클 시도

### Ralph Loop / 야간 무중단 모드 규칙

야간 자율 루프(`/ralph-loop`, `po_loop.sh`, `/loop`) 안에서 실행될 때:

1. **외부 메모리 우선**: `prompt.md`, `PROGRESS.md`, `learnings.md`, `decisions.md`를 매 iteration 시작 시 반드시 읽기. 컨텍스트 윈도우는 매번 fresh이므로 이 파일들이 유일한 "기억".

2. **한 iteration = 한 작업 단위**: 체크리스트의 다음 미완 항목 1개만 처리. 욕심내지 말 것. 5분 안에 끝낼 수 있는 단위가 이상적.

3. **verification 없이 종료 금지**: 응답에 `<promise>COMPLETE</promise>` 출력하기 전에 반드시:
   - 모든 체크리스트 항목이 [x]인가
   - 모든 verification 명령(테스트, 빌드, 린트)이 실제로 통과했는가
   - git status가 깨끗한가
   둘 중 하나라도 NO면 절대 COMPLETE 출력하지 말 것.

4. **iteration 종료 의무**: 한 iteration 작업이 끝나면:
   - PROGRESS.md에 한 줄 추가 (날짜·iteration·무엇을 함)
   - 실패했으면 learnings.md에 한 단락 추가
   - git commit (`auto/<timestamp>` 브랜치)

5. **완료 신호 형식 엄격 준수**:
   - 모든 작업 진짜 끝: `<promise>COMPLETE</promise>` (이 텍스트 정확히, 다른 말 없이)
   - 막힘: `<promise>BLOCKED</promise>` + learnings.md에 이유 기록
   - 다음 iteration 필요: 그냥 응답 종료 (외부 루프가 자동 재시작)

6. **컨텍스트 절약**: 응답에 코드 블록 통째로 붙이지 말고 파일을 직접 수정. 응답은 짧게 ("X 파일에 Y 함수 추가했음").

7. **위험 신호 자동 정지**: 다음 중 하나면 즉시 `<promise>BLOCKED</promise>`:
   - 같은 테스트가 3 iteration 연속 실패
   - 한 iteration에서 30+ 파일 변경 시도
   - 결제·인증·DB 마이그레이션 자동 변경 필요
   - PROGRESS.md가 5 iteration째 동일 (진척 없음)

---

## 20. Git / GitHub 규칙 (중요)

GitHub `ez_Signage` 저장소(https://github.com/ezaxdx/ez_Signage)에는 **이 `mice-design-guide` 앱 코드만** 올린다.

### 절대 GitHub에 올리지 않는 것
- 폰트 파일 (`폰트/`)
- 샘플 이미지·엑셀·참고 자료 (`환경장식물 최종 정보 모음/`)
- 디자인 의뢰 가이드 문서 등 외부 참고용 MD/TXT
- AI Studio 등 외부에서 받아온 프로토타입 (예: `banner_gen_os/`)
- 스크린샷, 임시 메모, `.env*` 파일

### 작업 디렉토리 규칙
- 모든 `git` 명령(`add`, `commit`, `push`, `status` 등)은 반드시 **`mice-design-guide/` 폴더 안에서** 실행한다.
- 부모 폴더(`C:\Users\EZPMP\Desktop\클로드 코드 활동용\`)는 git remote가 제거되어 있는 로컬 작업 공간일 뿐이며, 거기서는 절대 푸시하지 않는다.
- 명령 실행 전 항상 `pwd`로 현재 디렉토리가 `mice-design-guide`인지 확인한다.

### 새 참고 자료가 추가될 때
- `mice-design-guide/` 안에 두지 말고 부모 폴더의 별도 디렉토리(예: `환경장식물 최종 정보 모음/`)에 둔다.
- 부모 폴더의 `.gitignore`에 해당 경로를 추가해 추적 자체를 막는다.

### 푸시
- `mice-design-guide`의 origin은 `https://github.com/ezaxdx/ez_Signage.git`, 브랜치는 `main`.
- 인증은 Git Credential Manager로 처리. 토큰 만료로 인증 실패 시 사용자에게 `! git push` 직접 실행을 요청해 GCM 팝업이 뜨도록 한다.

### 커밋 단위
- 한 번에 하나의 의미 있는 변경. 작업 중 임시 파일·빌드 산출물(`node_modules/`, `dist/`, `.next/`, `tsconfig.tsbuildinfo` 등)은 커밋하지 않는다.

---

## 외부 문서 (필요 시 검색해서 봄)

@decisions.md
@learnings.md
@PROGRESS.md
@goals/current.md
