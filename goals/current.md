# 현재 목표

> 상위 목표는 사람이 정함. 하위 Task/Action은 자율 루프가 채움.

## Goal (분기 1회 갱신)

MICE 제작물 디자인 의뢰 가이드 자동화 앱 — MVP 실무 투입 (2026 Q2)

## Strategy (월 1회 갱신)

- 핵심 워크플로우(프로젝트 생성 → 텍스트 편집 → Excel/PPT 출력) 완성도 우선
- 발주 오류 방지: Preflight 18항목 자동 점검 구현
- 실무자(사원·대리급) 테스트 후 피드백 반영

## Initiative (주 1회 갱신)

이번 주: 미구현 화면 완성
- 화면 5 — 제작물 종류 정의 (프로젝트 설정 페이지)
- 화면 6 — 구역 지정 에디터 (슬롯 추가·삭제·속성 패널)
- 화면 8 — 저장된 제작물 목록 (/archive)

## Task (자율 루프 또는 PO가 채움)

- [ ] /projects/[id]/info 페이지 구현 (팀원 초대 + 마스터 시안)
- [ ] Preflight 모달 18항목 구현
- [ ] /share/[token] 클라이언트 공유 링크 (로그인 없이 승인·코멘트)
- [ ] harness.mjs 72개 항목 0 fail 유지

## 금지 행동 (자율 루프가 절대 자동 실행 안 하는 것)

- Supabase 프로젝트 설정 변경
- `.env.local` 수정 또는 노출
- production DB 직접 마이그레이션 (migration SQL은 사람이 실행)
- GitHub main 브랜치 직접 푸시
