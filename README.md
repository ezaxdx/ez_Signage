# 제작물 리스트 가이드 (v4)

환경장식물(배너·현수막 등) 제작물 리스트를 학습된 행사장·과거 데이터 기반으로 자동 추천·발주하는 Next.js 14 + Supabase 웹 앱.

> 명칭 변경 (2026-05-07): "MICE 제작물 디자인 의뢰 가이드" → "**제작물 리스트 가이드**".
> repo명(`mice-design-guide`)과 DB 테이블명은 유지 (히스토리 보호).

## 개요

- **목적**: 외주 디자이너·출력업체에 발주할 때 사용하는 17컬럼 제작물 리스트(엑셀)와 1제작물=1슬라이드 디자인 가이드(PPT)를 표준화·자동화
- **사용자**: MICE 행사 PM (사원·대리급)
- **AI 엔진**: Google Gemini 2.5 Flash (REST 직접 호출)

## 기술 스택

- Next.js 14 App Router · React Server Components
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Fabric.js v5 (캔버스 편집)
- SheetJS / pptxgenjs (출력)
- Tailwind CSS (Soft-Dark)

## 핵심 기능 (1단계 완료)

1. **AI 추천 흐름** — 행사 정보 입력 → Gemini가 환경장식물 11종 중 자동 선정 → 17컬럼 엑셀 즉시 다운로드
2. **데이터 인텔리전스** — `/data` 페이지 13개 탭 (수행실적 17건·행사 폴더 54건·281개 제작물 분석·6종 레이아웃 DNA)
3. **편집창 단순화** — 엑셀 그리드 행/열 직접 편집·드래그 이동·환경장식물 12종 dropdown 행 추가
4. **자동완성·매칭** — 발주처·행사장 datalist + 행사 장소 입력 시 과거 행사 매칭 알림

## 자동화 4가지 필터 (핵심 원칙)

본 프로젝트의 모든 자동화 기능은 다음 4가지를 통과해야 함:

1. **정답이 있는 업무인가** — 규칙 기반인가
2. **현재도 하고 있는 업무인가** — 신규 프로세스 도입 X
3. **데이터가 믿을 만한가** — 학습 근거 신뢰성
4. **사람의 개입이 줄어드는가, 아니면 바뀌는가** — 줄어드는 게 성공

자세한 내용은 `CLAUDE.md` §0 참조.

## 시작하기

### 환경 변수 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GEMINI_API_KEY=AIzaSy...
```

### 개발 서버

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000/login](http://localhost:3000/login) 접속.

### 검증

```bash
npx tsc --noEmit             # 타입 체크 (0 에러 유지)
npm run build                # Next 빌드 (16/16 라우트 성공)
node scripts/harness.mjs     # 72개 자동 점검 (0 fail 유지)
```

## 폴더 구조

```
app/
  (auth)/login,signup       — 로그인·회원가입
  (dashboard)/
    dashboard               — 메인 (D-day 정렬·단계 필터·통계)
    projects/[id]           — 편집창 (그리드 + 캔버스)
    projects/new/case-a~d   — 신규 프로젝트 (AI 추천·엑셀 import·시안·텍스트)
    data                    — 데이터 인텔리전스 13탭
    archive                 — 전체 제작물 아카이브
  api/
    recommend               — Gemini 추천 엔드포인트
    analyze-layout          — Gemini Vision bbox 추출

lib/
  ai/recommendSignage.ts    — Gemini 호출 + 프롬프트 + 컨텍스트 주입
  data/dashboardSeed.ts     — 시드 데이터 단일 소스 (시드·매핑·계산 함수)
  services/
    ExportService.ts        — Excel/PPT 출력 (편집된 컬럼 동기화)
    itemService.ts          — 슬롯 자동 삽입 (SEED_LAYOUT_DNA 우선)

scripts/
  parse_perflist.mjs        — 수행실적 엑셀 파싱
  parse_signage_lists.mjs   — 폴더 엑셀 일괄 분석
  batch_vision_analysis.mjs — Gemini Vision 시안 분석
  test_gemini_*.mjs         — API 통합 테스트
```

## 핵심 문서

- `CLAUDE.md` — 전체 사양·DB 스키마·결정 원칙 (이 프로젝트의 메인 인덱스)
- `decisions.md` — 의사결정 로그
- `learnings.md` — 실패 패턴 학습
- `goals/current.md` — 현재 목표·진행 단계
- `PROGRESS.md` — 작업 이력
- `docs/reports/` — 자율 세션 보고서·HTML 데모
- `docs/OVERNIGHT_SAFE.md` — 야간 무중단 자율 실행 안전 가이드
- `docs/AUTOMATION_PATTERNS.md` — 자동화 패턴 카탈로그 (체크리스트·외부 메모리·verification 루프)
- `prompt.md.example` — 야간 루프용 작업 명세 템플릿

## 자동화 명령

### 일반 슬래시 커맨드
- `/check` — 프로젝트 건강도 즉시 점검
- `/restart` — dev 서버 클린 재시작
- `/pavr` — Plan-Apply-Verify-Repeat 워크플로우 (5파일+ 변경 시 필수)
- `/fix-bug` — 버그 재현·수정·테스트 추가 흐름

### 자율 실행
- `automation/po_loop.sh "<명령>"` — 외부 루프로 Claude Code 반복 호출 (사이클 단위)
- `Dockerfile.claude-overnight` — 야간 무중단 sandbox 이미지

자세한 안전 가이드: [docs/OVERNIGHT_SAFE.md](docs/OVERNIGHT_SAFE.md)

## 라이선스

내부 업무 도구. 외부 배포 금지.
