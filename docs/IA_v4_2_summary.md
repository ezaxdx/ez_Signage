# IA v4.2 — 한 장 요약 (회의·인쇄용)

> 2026-05-08 · 상세본은 `IA_v4_2_detailed.md`

## 시스템 한 줄 정의
**행사 정보 → 환경장식물 추천 리스트 → 발주용 엑셀(17컬럼) + PPT(빈 슬라이드)** 자동 생성.

## 페이지 16개 + API 2개

```
Public      /login  /signup  /share/[token]
사용자      /dashboard
            /projects/new  →  case-a (AI추천) / case-b (엑셀) / case-c (이미지) / case-d (텍스트)
            /projects/[id]  →  /info
admin only  /archive  /data (13탭)  /admin/learning
API         /api/recommend (Gemini)   /api/analyze-layout (Vision)
```

## 권한 3계층
- **owner**: 본인 프로젝트 ALL
- **멤버**(allowed_users): 읽기·편집
- **admin**(profiles.role): 전체 + /data·/archive·/admin/learning

## DB 테이블 11개

| 그룹 | 테이블 |
|---|---|
| 도메인 | projects, design_items, item_contents, slot_styles, share_tokens |
| 학습·운영 (v4.1 신설) | venues, venue_halls, venue_requests, learning_jobs, usage_logs |
| 인증·매핑 | profiles, signage_aliases |

## 자동 누적 학습 사이클 ⭐
```
projects INSERT → liveStats 5분 캐시 만료 → 자동 재집계
→ 추천 정확도 자동 개선 → 별도 트리거 불필요
```

## v4.1 보류 (코드 보존)
캔버스 편집기 / AI 시안 추천 / 시안 일괄 업로드 / 사외 공유 — **진입점만 차단**, 향후 복귀 가능.

## 출력 17컬럼 엑셀
NO / 파트 / 구분 / 장소 / 사용목적 / 품목 / 언어 / 규격 / 재질 / 수량 / 내용 / 비고 / 담당자 / 디자인업체 / 출력업체 / 설치시간 / 철거시간

## EZ 폴더링 매핑
- **40.15 제작물** → 메인 출력
- **40.04~40.20 프로그램 파트** → 다중선택
- **40.12 행사장 조성** → 도면 학습 데이터

## PM 즉시 처리 필요
1. 🔴 `migration_v6_v4_1.sql` Supabase 실행
2. 🔴 본인 `profiles.role = 'admin'` 설정
3. 🟡 컨벤션센터·호텔 도면 5~10건 `/admin/learning` 등록
4. 🟡 `git push v2 auto/v4-stage-20260507:main`
