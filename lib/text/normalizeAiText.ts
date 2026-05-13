// 2026-05-13 — AI 생성·시설 가이드 텍스트 가독성 정규화 유틸
//
// 회의 결정사항 (260513 환경장식물 시설 가이드 피드백):
//   "AI가 작성한 거라 점 찍고 그냥 이렇게 쭉 가잖아요. 조금 보기 쉽게만"
//   "문장이 바뀌면은 줄 바꿔진다든지", "슬래시로 좀 소개적 한다든지"
//
// 적용 원칙:
//   - 마침표(. ) 뒤에 줄바꿈 삽입 → 시각적 문장 경계 확보
//   - 약어·소수점·URL의 점(.)은 보존
//   - 행사장 시설 가이드 원문 정보는 가공·의역 금지 (잘림·줄바꿈만 적용)
//
// 사용처:
//   - FacilityGuidePanel (install_allowed.note, warnings.description 등)
//   - 향후 AI 생성 텍스트 컴포넌트 일관 적용
//
// 관련 메모리:
//   - feedback-facility-guide-full-visibility (객관 정보 잘림 금지)
//   - project-environment-decoration-ai-logic (AI 텍스트 가독성)

/**
 * 마침표 뒤에 줄바꿈 삽입. 약어(예: D-1.·02-6000-0114·1.5m·1전시장 등 숫자.숫자)는 건드리지 않음.
 *
 * 규칙:
 *   1. ". " (마침표 + 공백) → ".\n"
 *   2. ".X" 형태 (소수점·번호 등)는 그대로 유지
 *   3. 마지막 마침표는 줄바꿈 추가하지 않음
 */
export function formatNoteText(text: string | null | undefined): string {
  if (!text) return ''

  // 마침표 + 공백 + (다음 문장 첫 글자 = 한글 또는 영문 대문자) 패턴만 줄바꿈
  // → ′1.5m′·′D-1.′·′02-6000-0114′ 같은 케이스는 보존
  let normalized = text.replace(/\.\s+(?=[가-힣A-Z])/g, '.\n')

  // 슬래시(/)로 항목 구분된 경우 — 짧은 토큰끼리 슬래시면 그대로, 긴 문장이 슬래시로 이어지면 줄바꿈
  // 예: "이벤트1 / 이벤트2 / 이벤트3" 같은 짧은 슬래시 구분은 보존
  //     "긴 문장. / 또 다른 긴 문장." 같은 형태도 가독성 위해 분리
  normalized = normalized.replace(/\s+\/\s+(?=[가-힣A-Z][가-힣A-Za-z\s]{15,})/g, '\n/ ')

  return normalized
}
