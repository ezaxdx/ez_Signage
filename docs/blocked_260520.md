# 자율 작업 차단 사항 (2026-05-20)

## A3: LearningManager 수정 요청 = 시설 가이드 아래로 통합

**상태**: BLOCKED — 다음 사이클·사용자 컴펌 필요

**사유**:
- SECTIONS·SectionKey union·fetch effect·activeSection 분기·JSX render block 다수 변경 필요
- correction-requests 별도 섹션 → facility-guides 내부 통합 = 컴포넌트 구조 큰 변경
- 자동 검증 한계 = 시각 변경·라이브 영향 점검 필요

**필요 작업**:
1. SECTIONS 배열에서 'correction-requests' 항목 제거 (사이드바 영역)
2. SectionKey union에서 'correction-requests' 제거
3. fetch effect = activeSection 조건 분기 변경
4. correction-requests render block (1640~) → facility-guides render block (1426~1637) 안으로 이동
5. UI = 시각 통합 후 사용자 컴펌

**자율 진행 권장 시점**: 사용자 직접 검토 후 v10.2 영역

## 본 자율 야간 진행 완료 사항

- A1: OrderingSchedule 추가/삭제 제거 (f560e63)
- A2: 시설 가이드 모달 중앙 정렬 (3aa2ae1)
- A4: 운영 대시보드·AI 라벨 변경 (3491307)
