// 행사장별 시설 가이드 시드 데이터 (§11-6-2 6종 정보)
// v9.15 (2026-05-12): 환경장식물 발주에 필요한 정보 전체를 이 파일만으로 파악 가능하도록 전면 보강
// 출처: docs/VENUE_LEARNING_INSIGHTS_260511.md, 킨텍스 전시주최자매뉴얼(부분파싱), 과거 발주 사례
//
// ★ 작성 원칙: "이 가이드만 보고 환경장식물 발주서를 작성할 수 있어야 한다"
//   - 확정된 수치는 직접 기입 (출처 명시)
//   - 미확인 항목은 "확인 필요"가 아닌 "○○팀에 ○○를 물어볼 것" 형태로 기재
//   - special_notes: 사원이 반드시 알아야 할 현장 고유 주의사항
//
// 이 시드 데이터는 Supabase venue_facility_guide 테이블이 비어있을 때 폴백.

import type { VenueFacilityGuide } from '@/lib/types'

export const VENUE_FACILITY_GUIDE_SEED: VenueFacilityGuide[] = [

  // ══════════════════════════════════════════════════════════════
  // 킨텍스 제1전시장 5홀 (A+B 합산 5A·5B, 171m×63m)
  // 출처: 킨텍스 전시주최자매뉴얼 §3 외부광고 파싱 + WSCE 2021·2022 발주 사례
  // ══════════════════════════════════════════════════════════════
  {
    venue_key: 'kintex_1_hall_5',
    venue_name: '킨텍스 제1전시장 5홀',
    install_allowed: [
      {
        category: 'X배너',
        status: 'allowed',
        note: '1F 로비·복도·전시장 내 자유 배치. 고정 방법: 자체 스탠드(물통형 권장). 규격 제한 없음.',
      },
      {
        category: '가로현수막 (외벽)',
        status: 'allowed',
        note: '5홀 외벽 표준 규격: 7,600×2,000mm (출처: 매뉴얼 §3). 고정: 와이어 로프 4점. 난연 PVC 원단.',
        standard_width_mm: 7600, standard_height_mm: 2000,
      },
      {
        category: '가로현수막 (내부 기둥)',
        status: 'conditional',
        note: '기둥 부착 가능. 최대 폭 1,200mm × 높이 600mm 이내. 타카 불가 — 벨크로 또는 행거 사용.',
        max_width_mm: 1200, max_height_mm: 600,
      },
      {
        category: '세로현수막 (가로등배너)',
        status: 'allowed',
        note: '킨텍스 외부 가로등 폴 단위 부착. 규격: 600×1,800mm. 조(양측) 단위 발주. 고정: 전용 클램프.',
        standard_width_mm: 600, standard_height_mm: 1800,
      },
      {
        category: '통천 배너 (외벽 대형)',
        status: 'allowed',
        note: '외벽 최대 24m×17m / 무대 내부 최대 10m×5m. 고정: 와이어 로프 + 전용 브래킷. 난연 원단 필수.',
      },
      {
        category: '통천 배너 (내부 구름다리)',
        status: 'allowed',
        note: '5홀–4홀 연결 구름다리 양측. 규격: 약 3,000×1,500mm (현장 실측 후 제작). 로프 고정.',
      },
      {
        category: '천정배너 (행잉)',
        status: 'conditional',
        note: '행잉 그리드 포인트 위치만 가능. 하중 한계 및 그리드 위치 좌표: 킨텍스 운영팀에 직접 확인 필수 (매뉴얼 해당 섹션 OCR 미완료). 1점당 최대 하중 예상 50kg (미확인 — 반드시 재확인).',
      },
      {
        category: '포디움 타이틀',
        status: 'allowed',
        note: '무대 포디움에 직접 부착. 규격: 600×200mm 표준. 벨크로 또는 양면테이프(비접착 표면은 행거). 잦은 재출력 주의 — 텍스트 최종 확인 후 발주.',
        standard_width_mm: 600, standard_height_mm: 200,
      },
      {
        category: 'A4·A3 POP',
        status: 'allowed',
        note: '아크릴 스탠드 또는 롤업형. 접착식 부착 불가. 규격: A4(210×297) / A3(297×420). 전시 부스 안내·프로그램 안내 용도.',
      },
      {
        category: '등록배너 (등록데스크)',
        status: 'allowed',
        note: 'X배너·폼보드 스탠드 병용. 등록데스크 배치: 로비 진입부. QR코드 포함 시 해상도 300dpi 이상.',
      },
      {
        category: '비표 (Name Badge)',
        status: 'allowed',
        note: '목걸이형 A5 비표 + 비표걸이 세트. 입장관리 시스템 연동 여부 사전 확인.',
      },
      {
        category: '물통배너 (외부)',
        status: 'allowed',
        note: '셔틀 정류장·주차장 입구에 배치. 규격: 600×1,800mm 표준. 물통(10L) 포함 발주.',
        standard_width_mm: 600, standard_height_mm: 1800,
      },
      {
        category: '유리 스티커·필름',
        status: 'denied',
        note: '전시장 유리면 직접 부착 불가. 필요 시 탈부착 가능 스티커 재질만 허용 — 사전 운영팀 승인 필요.',
      },
    ],
    mount_methods: {
      taka: 'denied',
      magnet: 'denied',
      adhesive: 'denied',
      hanger: 'conditional',
      rope: 'allowed',
      note: '전시장 내벽·기둥 모두 타카·자석·접착제 금지. 행거: 전용 레일 또는 클램프에만 허용. 로프: 외벽 와이어 및 천장 리깅 포인트에 허용.',
    },
    rigging: {
      available: true,
      grid_lines: ['[운영팀 도면 요청 필요 — 전화 031-995-8300]'],
      max_load_kg: undefined,
      note: '매뉴얼 천장 행잉 섹션(하중·그리드 위치)은 한국어 폰트 깨짐으로 미파싱. 킨텍스 운영팀(031-995-8300)에 ① 그리드 포인트 좌표 도면 ② 1포인트당 허용 하중(kg) ③ 리거(rigger) 자체 보유 가능 여부를 사전 확인할 것.',
    },
    safety: {
      fire: '난연 2급 이상 원단 필수 (한국소방산업기술원 인증서 또는 KS 시험성적서 지참). 외부 원단은 방수·방화 겸용 권장.',
      fall: '천장 행잉은 최소 2점 고정. 대형 구조물(3m 이상)은 4점 고정 권장. 고정 후 흔들림 테스트 필수.',
      electric: '220V 단상 표준. 추가 전기(LED·조명 등) 사용 시 전시장 운영실에 사전 신청. 연장선 노출 금지 — 케이블 트레이 사용.',
      weather: '외부 현수막·가로등배너는 우천·강풍(10m/s 이상) 시 즉시 철거 또는 고정 보강. 철거 책임은 주최사.',
      note: '전시장 내 화기 취급 금지. 드릴·절단 등 공구 작업은 운영팀 사전 신고 필요.',
    },
    warnings: [
      { type: '비상구·소화전 가림 금지', description: '비상구 표시등·소화전·소화기·스프링클러 헤드 1m 이내 설치물 금지. 위반 시 즉시 철거 명령.' },
      { type: '외벽 부착 위치 준수', description: '외벽 통천 부착 위치는 매뉴얼 §3 외부광고 지정 구역 내에서만 가능. 창문·환기구 가림 금지.' },
      { type: '주차장 미운영 (공사 중)', description: '1전시장 주차장 미운영 — 셔틀버스 의존도 높음. 설치·철거 차량(1톤 이상) 진입 동선은 운영팀과 별도 협의 필수.' },
      { type: '포디움 재출력 빈발', description: '포디움 타이틀은 현장 텍스트 오류로 재출력이 빈번. 발주 전 행사명·연도·기관명 최종 확인 필수.' },
      { type: '가로등배너 발주 리드타임', description: '킨텍스 가로등 폴 클램프 예약은 행사 D-30 이전 운영팀 신청. 늦으면 불가. 발주 전 폴 가용 여부 확인.' },
    ],
    digital_signage: {
      allowed_locations: ['5홀 내부 LED 사이니지 보드 (운영팀 협의 필수)', '로비 안내 모니터 (주최사 콘텐츠 삽입 가능 여부 확인 필요)'],
      led_size_limit: '운영팀 협의 후 결정',
      content_review: true,
      note: '콘텐츠 사전 검토 기간: 행사 D-5 이전 제출 권장. 파일 포맷: MP4(H.264) 또는 PNG. 해상도: 1920×1080 표준.',
    },
    last_updated: '2026-05-12',
    notes: '매뉴얼 §3 외부광고(7600×2000mm) 및 게이트 규격(Gate1: 38×1.5m, Gate2: 36×1.5m, Gate4: 30×1.5m) 파싱 성공. 천정·행잉·하중 섹션은 OCR 미완료.',
    special_notes: [
      '【외벽 표준 규격 확정】 5홀 외벽 가로현수막: 7,600×2,000mm. 이 규격 외 주문 시 별도 승인 필요.',
      '【외부 게이트 규격】 Gate1(서문) 38×1.5m / Gate2(남문) 36×1.5m / Gate4 30×1.5m. 게이트당 광고면 6~10개. 단위 발주.',
      '【천정배너 발주 전 필수 확인 사항】 ① 리깅 그리드 도면 수령 ② 포인트당 하중(kg) 확인 ③ 리거 자체 투입 가능 여부 → 운영팀: 031-995-8300',
      '【가로등배너 발주 체크】 전용 클램프 포함 발주. 폴 예약은 D-30 이전. 600×1,800mm 표준.',
      '【난연 인증서 반드시 지참】 운영팀이 설치 당일 현장 검토. 인증서 없으면 설치 불허.',
      '【설치 가능 시간】 전시장 설치: 행사 D-1일 오전 08:00부터. 철거: 행사 종료 다음날 18:00까지. 초과 시 추가 요금 발생.',
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // 킨텍스 제1전시장 1~4홀
  // ══════════════════════════════════════════════════════════════
  {
    venue_key: 'kintex_1_hall_1_to_4',
    venue_name: '킨텍스 제1전시장 1~4홀',
    install_allowed: [
      { category: 'X배너', status: 'allowed', note: '자체 스탠드 사용. 규격 제한 없음.' },
      {
        category: '가로현수막 (외벽)',
        status: 'allowed',
        note: '홀별 표준 규격 — 1홀: 7,700×2,000mm / 2~4홀: 8,000×2,000mm (출처: 매뉴얼 §3). 와이어 로프 4점 고정. 난연 원단.',
        max_width_mm: 8000, max_height_mm: 2000,
      },
      { category: '세로현수막 (가로등배너)', status: 'allowed', note: '600×1,800mm. 전용 클램프 포함 발주. D-30 이전 폴 예약 필수.', standard_width_mm: 600, standard_height_mm: 1800 },
      { category: '통천 배너', status: 'allowed', note: '5홀 대비 규격 상이 — 해당 홀 외벽 실측 후 제작. 와이어 로프 고정.' },
      { category: '천정배너', status: 'conditional', note: '리깅 가능하나 그리드 위치·하중 한계는 킨텍스 운영팀(031-995-8300) 확인 필수.' },
      { category: '포디움 타이틀', status: 'allowed', note: '600×200mm 표준. 벨크로 부착.', standard_width_mm: 600, standard_height_mm: 200 },
      { category: 'A4·A3 POP', status: 'allowed', note: '아크릴 스탠드. 접착 금지.' },
    ],
    mount_methods: {
      taka: 'denied', magnet: 'denied', adhesive: 'denied', hanger: 'conditional', rope: 'allowed',
      note: '5홀 동일 규정. 타카·자석·접착제 전면 금지.',
    },
    rigging: {
      available: true,
      note: '5홀과 동일 운영팀. 리깅 계획 있으면 D-30 이전 그리드 도면 요청.',
    },
    safety: {
      fire: '난연 2급 이상 인증서 지참 필수.',
      fall: '천장 행잉 2점 이상 고정.',
      electric: '220V 단상. 추가 전기는 운영실 사전 신청.',
      weather: '외부 사인 우천·강풍 시 즉시 철거.',
    },
    warnings: [
      { type: '홀별 외벽 규격 차이', description: '1홀 7,700×2,000 vs 2~4홀 8,000×2,000. 같은 현수막으로 제작 불가 — 홀 확정 후 발주.' },
      { type: '비상구·소화전 가림 금지', description: '설치물이 비상구·소화전 1m 이내 진입 금지.' },
    ],
    digital_signage: { content_review: true, note: '콘텐츠 D-5 이전 제출. MP4 또는 PNG.' },
    last_updated: '2026-05-12',
    special_notes: [
      '【홀별 외벽 규격 확정】 1홀: 7,700×2,000mm / 2홀·3홀·4홀: 8,000×2,000mm. 반드시 해당 홀 번호 확인 후 제작.',
      '【설치 시간】 D-1일 08:00 시작. 철거 행사 다음날 18:00.',
      '【난연 인증서 현장 지참 필수】 없으면 설치 불허.',
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // 킨텍스 제2전시장 6~10홀
  // ══════════════════════════════════════════════════════════════
  {
    venue_key: 'kintex_2_hall_6_to_10',
    venue_name: '킨텍스 제2전시장 6~10홀',
    install_allowed: [
      { category: 'X배너', status: 'allowed', note: '자체 스탠드. 규격 제한 없음.' },
      {
        category: '가로현수막 (외벽)',
        status: 'allowed',
        note: '7~10홀 표준 규격: 8,000×5,000mm (출처: 매뉴얼 §3 — 1전시장 대비 높이 2배 이상). 와이어 로프 고정.',
        standard_width_mm: 8000, standard_height_mm: 5000,
      },
      { category: '세로현수막 (가로등배너)', status: 'allowed', note: '600×1,800mm. D-30 폴 예약.' },
      { category: '통천 배너', status: 'allowed', note: '외벽 규격 실측 후 제작. 2전시장 운영실 별도 협의.' },
      {
        category: '천정배너',
        status: 'conditional',
        note: '2전시장 리깅 그리드 위치·하중은 1전시장과 다름 — 2전시장 운영팀에 별도 도면 요청 필수.',
      },
      { category: '포디움 타이틀', status: 'allowed', note: '600×200mm. 벨크로.' },
    ],
    mount_methods: {
      taka: 'denied', magnet: 'denied', adhesive: 'denied', hanger: 'allowed', rope: 'allowed',
      note: '2전시장은 행거 사용 가능 구간 1전시장 대비 넓음. 사전 확인 후 활용.',
    },
    rigging: {
      available: true,
      note: '2전시장 운영팀 별도 협의. D-30 이전 그리드 도면 요청. 연락처: 1전시장 동일(031-995-8300) 또는 2전시장 현장 운영실.',
    },
    safety: {
      fire: '난연 2급 이상 인증서 필수.',
      fall: '대형 행잉(3m 이상) 4점 고정.',
      electric: '220V. 추가 전기 운영실 신청.',
      weather: '외부 우천·강풍 즉시 철거.',
    },
    warnings: [
      { type: '외벽 규격 1전시장과 상이', description: '2전시장 7~10홀 외벽: 8,000×5,000mm — 1전시장 대비 높이 2배. 착오 발주 주의.' },
      { type: '운영팀 별도', description: '1전시장·2전시장 운영팀 분리 운영. 2전시장 협의는 별도로 진행.' },
    ],
    digital_signage: { content_review: true },
    last_updated: '2026-05-12',
    special_notes: [
      '【2전시장 외벽 규격】 7~10홀: 8,000×5,000mm. 1전시장(2,000mm 높이)와 혼동 주의 — 높이가 2.5배.',
      '【2전시장 운영팀 별도 협의 필수】 리깅·외벽 광고 모두 2전시장 현장 운영실에 별도 신청.',
      '【설치 시간】 D-1일 08:00. 철거 다음날 18:00.',
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // 5/22 P3-8 사용자 명시 = 코엑스 4건 분리 (그랜드볼룸·아셈볼룸·D홀·컨퍼런스홀)
  // ══════════════════════════════════════════════════════════════
  {
    venue_key: 'coex_grandballroom',
    venue_name: '코엑스 그랜드볼룸',
    install_allowed: [
      { category: 'X배너', status: 'allowed', note: '물통형 권장 (카펫 위 안정성).' },
      { category: '가로현수막', status: 'conditional', note: '입구 아치 구조물 내. 최대 4,000×1,200mm. 와이어 행거. 코엑스 운영팀(02-6000-0114) 사전 승인.', max_width_mm: 4000, max_height_mm: 1200 },
      { category: '세로현수막', status: 'allowed', note: '롤업 배너 형태 (자립형).' },
      { category: '통천 배너', status: 'conditional', note: '측면·후면 코엑스 지정 외벽 구역. 행사 2개월 전 마케팅팀(02-6000-0152) 신청.' },
      { category: '천정배너', status: 'conditional', note: '천장 리깅 포인트. 포인트당 최대 50kg. 코엑스 지정 리거 의무.' },
      { category: '포디움 타이틀', status: 'allowed', note: '600×200mm. 벨크로 부착.', standard_width_mm: 600, standard_height_mm: 200 },
      { category: 'A4·A3 POP', status: 'allowed', note: '아크릴 스탠드. 접착 금지.' },
    ],
    mount_methods: { taka: 'denied', magnet: 'denied', adhesive: 'denied', hanger: 'conditional', rope: 'conditional', note: '타카·자석·접착제 금지. 행거·로프는 지정 리깅 포인트만.' },
    rigging: { available: true, grid_lines: ['그랜드볼룸 리깅 포인트 도면 — 운영팀(02-6000-0114) 요청'], max_load_kg: 50, note: '코엑스 지정 리거 의무. D-45 이전 협의.' },
    safety: { fire: '난연 2급 이상 KS 인증. 방염 확인서.', fall: '리깅 2점 이상. 흔들림 테스트.', electric: '220V. LED 추가 전기 별도 신청.', weather: '외부 우천 시 즉시 철거.', note: '비상구·소화전 1m 이내 설치 금지.' },
    warnings: [
      { type: '코엑스 지정 시공업체', description: '리깅·시공은 코엑스 지정 업체만. 외부 단독 불가.' },
      { type: '난연 인증서 지참', description: '인증서 + 시험성적서 + 구매 영수증 3종 세트.' },
    ],
    digital_signage: { allowed_locations: ['그랜드볼룸 내부 스크린 (영상 삽입 가능)'], content_review: true, note: 'D-7 이전 MP4 1920×1080 제출.' },
    last_updated: '2026-05-22',
    special_notes: ['【리깅·시공 = 코엑스 지정 업체】 D-45 이전 견적 요청.', '【난연 인증서 의무】 서류 심사 강도 높음.'],
  },
  {
    venue_key: 'coex_asembballroom',
    venue_name: '코엑스 아셈볼룸',
    install_allowed: [
      { category: 'X배너', status: 'allowed', note: '물통형 권장.' },
      { category: '가로현수막', status: 'conditional', note: '입구 부착 구역 별도 지정. 최대 3,000×1,000mm. 운영팀 현장 확인 후 결정.', max_width_mm: 3000, max_height_mm: 1000 },
      { category: '세로현수막', status: 'allowed', note: '자립형 스탠드.' },
      { category: '포디움 타이틀', status: 'allowed', note: '600×200mm. 벨크로 부착.', standard_width_mm: 600, standard_height_mm: 200 },
      { category: 'A4·A3 POP', status: 'allowed', note: '아크릴 스탠드.' },
    ],
    mount_methods: { taka: 'denied', magnet: 'denied', adhesive: 'denied', hanger: 'conditional', rope: 'denied', note: '타카·자석·접착제 금지. 천장 리깅 영역 제한.' },
    rigging: { available: false, note: '아셈볼룸 천장 리깅 미지원. 바닥 스탠드 방식만.' },
    safety: { fire: '난연 2급 이상 KS 인증.', fall: '바닥 스탠드 안정성 확인.', electric: '220V.', weather: '실내 한정.', note: '비상구 1m 이내 설치 금지.' },
    warnings: [
      { type: '리깅 불가', description: '아셈볼룸 천장 행잉 불가. 바닥 스탠드 필수.' },
    ],
    digital_signage: { allowed_locations: ['아셈볼룸 입구 LED 사이니지 (협의)'], content_review: true, note: 'D-7 이전 제출.' },
    last_updated: '2026-05-22',
    special_notes: ['【천장 리깅 불가】 바닥 스탠드·물통배너 위주 발주.'],
  },
  {
    venue_key: 'coex_d_hall',
    venue_name: '코엑스 D홀 (D전시관)',
    install_allowed: [
      { category: 'X배너', status: 'allowed', note: '전시 부스 내·통로 모두 가능.' },
      { category: '가로현수막', status: 'conditional', note: 'D전시관 외벽 지정 위치. 코엑스 지정 배너 프레임 사이즈 (운영팀 확인). 자체 부착 불가 — 코엑스 작업팀 시공만.' },
      { category: '통천 배너', status: 'conditional', note: 'D홀 외벽 코엑스 지정 구역. 행사 2개월 전 마케팅팀(02-6000-0152) 신청.' },
      { category: '천정배너', status: 'conditional', note: 'D홀 리깅 가능 구역 지정. D홀 운영팀 별도 도면 확인.' },
      { category: '포디움 타이틀', status: 'allowed', note: '600×200mm.', standard_width_mm: 600, standard_height_mm: 200 },
      { category: 'A4·A3 POP', status: 'allowed', note: '아크릴 스탠드.' },
    ],
    mount_methods: { taka: 'denied', magnet: 'denied', adhesive: 'denied', hanger: 'conditional', rope: 'conditional', note: '타카·자석·접착제 금지.' },
    rigging: { available: true, grid_lines: ['D홀 리깅 구역 도면 — D홀 운영팀 요청'], max_load_kg: 50, note: 'D홀 코엑스 지정 리거 의무.' },
    safety: { fire: '난연 2급 이상.', fall: '리깅 2점 이상.', electric: '220V.', weather: '외벽 시공 시 우천 강풍 즉시 철거.', note: '비상구·소화전 가림 금지.' },
    warnings: [
      { type: '외벽 광고 2개월 전 신청', description: 'D홀 외벽 통천·배너는 D-60 이전 마케팅팀(02-6000-0152) 신청.' },
      { type: '코엑스 작업팀 시공', description: 'D전시관 외벽 부착 자체 시공 불가. 코엑스 지정 업체만.' },
    ],
    digital_signage: { allowed_locations: ['D2 로비 LED 사이니지 (협의 필수)', '코엑스 외부 전광판 (광고 신청 별도)'], content_review: true, note: 'D-7 이전 제출.' },
    last_updated: '2026-05-22',
    special_notes: ['【외벽 광고 D-60 이전 신청】 늦으면 외벽 사용 불가.', '【D홀 자체 시공 불가】 코엑스 작업팀 시공만.'],
  },
  {
    venue_key: 'coex_conference_hall',
    venue_name: '코엑스 컨퍼런스홀',
    install_allowed: [
      { category: 'X배너', status: 'allowed', note: '복도·입구 모두 가능. 자립형 스탠드.' },
      { category: '세로현수막', status: 'allowed', note: '롤업 배너 형태.' },
      { category: '천정배너', status: 'denied', note: '컨퍼런스홀 천장 행잉 불가. 바닥 스탠드 방식만 사용.' },
      { category: '포디움 타이틀', status: 'allowed', note: '600×200mm.', standard_width_mm: 600, standard_height_mm: 200 },
      { category: 'A4·A3 POP', status: 'allowed', note: '아크릴 스탠드.' },
    ],
    mount_methods: { taka: 'denied', magnet: 'denied', adhesive: 'denied', hanger: 'denied', rope: 'denied', note: '컨퍼런스홀 모든 부착 영역 금지. 바닥 스탠드만.' },
    rigging: { available: false, note: '컨퍼런스홀 천장 행잉 불가.' },
    safety: { fire: '난연 2급 이상.', fall: '바닥 스탠드 안정성.', electric: '220V.', weather: '실내 한정.', note: '비상구 가림 금지.' },
    warnings: [
      { type: '천장 행잉 전면 불가', description: '컨퍼런스홀 모든 천장 영역 행잉 X. 바닥 스탠드 방식 필수.' },
    ],
    digital_signage: { allowed_locations: ['컨퍼런스홀 내부 스크린 (영상 삽입)'], content_review: true, note: 'D-7 이전 제출.' },
    last_updated: '2026-05-22',
    special_notes: ['【천장 행잉 불가】 바닥 스탠드·물통배너만 발주.'],
  },

  // 코엑스 통합본 (legacy·기존 매칭 영역 보존)
  {
    venue_key: 'coex',
    venue_name: '코엑스 (그랜드볼룸·아셈볼룸·D홀 외)',
    install_allowed: [
      { category: 'X배너', status: 'allowed', note: '모든 구역 자체 스탠드 허용. 물통형 권장 (카펫 위 안정성).' },
      {
        category: '가로현수막 (그랜드볼룸 입구)',
        status: 'conditional',
        note: '입구 아치 구조물 내 부착 가능. 최대 폭 4,000mm × 높이 1,200mm. 와이어 행거 사용. 코엑스 운영팀(02-6000-0114) 사전 승인 필수.',
        max_width_mm: 4000, max_height_mm: 1200,
      },
      {
        category: '가로현수막 (아셈볼룸)',
        status: 'conditional',
        note: '아셈볼룸 입구 현수막 부착 구역 별도 지정. 폭 최대 3,000mm × 높이 1,000mm. 부착 위치·방법은 운영팀 현장 확인 후 결정.',
        max_width_mm: 3000, max_height_mm: 1000,
      },
      {
        category: '가로현수막 (D전시관 외벽)',
        status: 'conditional',
        note: 'D전시관 외벽 지정 위치에 부착 가능. 규격: 코엑스 지정 배너 프레임에 맞는 사이즈(프레임 크기 운영팀 확인). 자체 부착 불가 — 코엑스 작업팀 시공만 허용.',
      },
      {
        category: '세로현수막 (내부 롤업)',
        status: 'allowed',
        note: '롤업 배너 형태(자립형 스탠드). 지면 접착·고정 불가.',
      },
      {
        category: '통천 배너',
        status: 'conditional',
        note: '코엑스 지정 외벽 구역만 가능. 그랜드볼룸 측면·후면·D홀 외벽 각각 가능 구역 상이. 행사 2개월 전 코엑스 마케팅팀(02-6000-0152)에 외벽 광고 신청 필수.',
      },
      {
        category: '천정배너 (그랜드볼룸)',
        status: 'conditional',
        note: '그랜드볼룸 천장 리깅 포인트 사용 가능. 포인트당 하중 최대 50kg(운영팀 재확인 필요). 코엑스 지정 리거 사용 의무. 사전 도면 요청: 운영팀(02-6000-0114).',
      },
      {
        category: '천정배너 (컨퍼런스홀)',
        status: 'denied',
        note: '컨퍼런스홀 천장 행잉 불가. 바닥 스탠드 방식(물통배너·롤업) 사용.',
      },
      {
        category: '천정배너 (D전시관)',
        status: 'conditional',
        note: 'D홀 전시관 내 리깅 가능 구역 지정. D홀 운영팀 별도 도면 확인 필요.',
      },
      { category: '포디움 타이틀', status: 'allowed', note: '600×200mm. 벨크로 부착. 무대 포디움 확인 후 사이즈 조정.', standard_width_mm: 600, standard_height_mm: 200 },
      { category: 'A4·A3 POP', status: 'allowed', note: '아크릴 스탠드. 접착 금지.' },
      { category: '유리 스티커', status: 'denied', note: '코엑스 내 유리면 스티커 직접 부착 금지. 탈부착 필름도 사전 승인 필요.' },
    ],
    mount_methods: {
      taka: 'denied',
      magnet: 'denied',
      adhesive: 'denied',
      hanger: 'conditional',
      rope: 'conditional',
      note: '코엑스 전체 건물 내 타카·자석·접착제 전면 금지. 행거·로프는 지정 구역·리깅 포인트에서만 허용. 현장 시공은 코엑스 지정 업체만 가능한 구역 존재.',
    },
    rigging: {
      available: true,
      grid_lines: ['그랜드볼룸 리깅 포인트 도면 — 운영팀(02-6000-0114) 요청', 'D홀 리깅 구역 도면 — D홀 운영팀 요청'],
      max_load_kg: 50,
      note: '리거: 코엑스 지정 업체 사용 의무 (외부 리거 불가). 리깅 견적 및 일정: D-45 이전 협의. 그랜드볼룸 포인트당 최대 50kg(재확인 권장).',
    },
    safety: {
      fire: '난연 2급 이상 KS 인증 필수. 코엑스 자체 방염 확인서 제출 요구 가능. 원단 구매 영수증 + 시험성적서 함께 지참.',
      fall: '리깅 2점 이상. 코엑스 지정 리거가 안전 확인 후 승인. 흔들림 테스트 필수.',
      electric: '220V. LED·조명 추가 전기는 부스 전기 신청서 별도 제출. 소형 UPS 사용 금지.',
      weather: '외부 현수막 우천·강풍 즉시 철거. 코엑스 측에서 기상 상황에 따라 강제 철거 가능.',
      note: '화기 취급 금지. 음식물 반입 지정 구역 외 금지.',
    },
    warnings: [
      { type: '구역별 규정 전부 다름', description: '그랜드볼룸·아셈볼룸·D홀·컨퍼런스홀·로비 각각 설치 규정이 다름 — 사용 구역 확정 즉시 해당 구역 담당자에게 개별 확인.' },
      { type: '외벽 광고 2개월 전 신청', description: '코엑스 외벽 통천·배너는 행사 2개월 전 마케팅팀(02-6000-0152) 신청. 늦으면 불가.' },
      { type: '코엑스 지정 시공업체', description: '일부 구역은 코엑스 지정 업체만 시공 허용 — 외부 업체 단독 시공 불가. 공식 입점 업체 목록 사전 확인.' },
      { type: '비상구·소화전 가림 금지', description: '비상구·소화전 1m 이내 설치물 즉시 철거 명령.' },
    ],
    digital_signage: {
      allowed_locations: ['D2 로비 LED 사이니지 (협의 필수)', '그랜드볼룸 내부 스크린 (영상 삽입 가능)', '코엑스 외부 전광판 (광고 신청 별도)'],
      led_size_limit: '코엑스 자체 LED 사양에 맞는 파일 포맷 제출 (담당자 확인)',
      content_review: true,
      note: '콘텐츠 파일 D-7 이전 제출. MP4 1920×1080 H.264. 코엑스 광고 승인 필요.',
    },
    last_updated: '2026-05-12',
    special_notes: [
      '【구역 사전 확정 필수】 그랜드볼룸·아셈볼룸·D홀·컨퍼런스홀 각각 담당팀 다름. 사용 구역 확정 전에 발주하면 규격이 틀릴 수 있음.',
      '【외벽 광고 조기 신청】 통천·대형 현수막은 행사 D-60 이전 마케팅팀(02-6000-0152) 신청. 늦으면 외벽 사용 불가.',
      '【코엑스 지정 리거·시공 업체 사용 의무】 천장 리깅 및 일부 설치는 코엑스 지정 업체만 허용. 시공 견적은 D-45 이전 코엑스 측에 요청.',
      '【난연 인증서 및 방염 확인서 지참】 코엑스는 킨텍스 대비 서류 심사 강도 높음. 인증서 + 시험성적서 + 구매 영수증 3종 세트.',
      '【설치 시간】 각 홀별로 다름 — 운영팀 확인 필수. 일반적으로 D-1일 08:00 시작, 철거 다음날 18:00.',
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // 송도컨벤시아
  // ══════════════════════════════════════════════════════════════
  {
    venue_key: 'songdo_convensia',
    venue_name: '송도컨벤시아',
    install_allowed: [
      { category: 'X배너', status: 'allowed', note: '모든 구역 자체 스탠드. 물통형 권장.' },
      {
        category: '가로현수막 (로비)',
        status: 'conditional',
        note: '전시관·컨퍼런스 로비 지정 위치에 부착 가능. 최대 폭 3,000mm×높이 1,200mm (미확인 — 운영팀 02-830-6300 확인). 와이어 행거.',
        max_width_mm: 3000, max_height_mm: 1200,
      },
      {
        category: '가로현수막 (외벽)',
        status: 'conditional',
        note: '외부 지정 배너 부착 구조물 사용. 규격은 구조물 사이즈에 종속 — 운영팀에 구조물 사이즈 문의 후 제작.',
      },
      { category: '세로현수막 (폴대배너)', status: 'allowed', note: '컨퍼런스 홀 복도 양측 폴대 설치 가능. 규격: 600×1,800mm. 전용 클램프 또는 물통 스탠드.', standard_width_mm: 600, standard_height_mm: 1800 },
      {
        category: '통천 배너',
        status: 'conditional',
        note: '외부 구조물·외벽 부착. 사전 운영팀 협의 필수. 행사 D-45 이전 신청 권장.',
      },
      {
        category: '천정배너',
        status: 'conditional',
        note: '전시관 A(4,700m²) 내 리깅 포인트 사용 가능. 컨퍼런스홀은 천장 높이 낮아 리깅 제한적. 포인트 도면·하중 한계: 운영팀(02-830-6300) 요청.',
      },
      { category: '포디움 타이틀', status: 'allowed', note: '600×200mm. 벨크로.', standard_width_mm: 600, standard_height_mm: 200 },
      { category: '룸사인', status: 'allowed', note: '회의실 입구 룸사인. 센터 측 안내 룸사인과 구분 배치. 아크릴 스탠드형 권장.' },
      { category: '유도사인 (포디움·화살표)', status: 'allowed', note: 'A3 이하 크기. 아크릴 스탠드. 지면 접착 금지.' },
      { category: 'A4·A3 POP', status: 'allowed', note: '아크릴 스탠드. 접착 금지.' },
    ],
    mount_methods: {
      taka: 'denied',
      magnet: 'conditional',
      adhesive: 'denied',
      hanger: 'conditional',
      rope: 'allowed',
      note: '타카·접착제 금지. 자석: 철제 구조물에 한해 조건부 허용. 행거: 지정 레일·리깅 포인트만. 로프: 외벽 와이어에 허용.',
    },
    rigging: {
      available: true,
      note: '전시관 A 리깅 가능. 컨퍼런스홀은 천장 높이 낮아 제한적. 도면·하중 문의: 02-830-6300. 리거 자체 투입 가능 여부 사전 확인 필수.',
    },
    safety: {
      fire: '난연 2급 이상 인증서 필수.',
      fall: '천장 행잉 2점 이상 고정.',
      electric: '220V. 추가 전기 운영실 신청.',
      weather: '외부 현수막 우천·강풍 즉시 철거.',
    },
    warnings: [
      { type: '룸사인 분리 운영', description: '센터 안내 룸사인(센터 자체 제작)과 행사 룸사인(주최사 제작)이 같은 위치 사용 불가 — 설치 전 센터 안내 룸사인 위치 확인 필수.' },
      { type: '외벽 광고 D-45 이전 신청', description: '통천·외벽 배너는 D-45 이전 운영팀 신청. 늦으면 외벽 사용 불가.' },
      { type: '비상구·소화전 가림 금지', description: '비상구 1m 이내 설치 금지.' },
    ],
    digital_signage: {
      allowed_locations: ['로비 인포 사이니지 (주최사 콘텐츠 협의 필요)', '전시관 내 LED (규모에 따라 협의)'],
      content_review: true,
      note: '콘텐츠 D-5 이전 제출. 1920×1080 MP4.',
    },
    last_updated: '2026-05-12',
    special_notes: [
      '【룸사인 반드시 현장 확인 후 배치】 센터 고정 안내 룸사인 위치와 행사 룸사인이 겹치지 않도록 D-1일 오전 현장 확인 후 배치.',
      '【외벽 광고 조기 신청 D-45】 통천·외벽 배너는 늦으면 위치 선점 불가.',
      '【전시관A vs 컨퍼런스홀 리깅 차이】 전시관A는 리깅 가능, 컨퍼런스홀은 천장 낮아 제한적 — 천정배너 계획 시 사용 공간 반드시 구분.',
      '【설치 시간】 일반적으로 D-1일 08:00. 철거 다음날 18:00 — 운영팀 최종 확인 필수.',
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // ICC 제주 (한라홀·아라홀 외)
  // ══════════════════════════════════════════════════════════════
  {
    venue_key: 'icc_jeju',
    venue_name: 'ICC 제주 (탐라홀 외)',
    install_allowed: [
      { category: 'X배너', status: 'allowed', note: '자체 스탠드. 규격 제한 없음.' },
      {
        category: '가로현수막 (외벽)',
        status: 'conditional',
        note: '지정 외부 배너 프레임 사용. 규격: 프레임 사이즈(운영팀 064-735-1000 확인). 자체 부착 불가.',
      },
      {
        category: '세로현수막 (로비)',
        status: 'conditional',
        note: '로비 지정 폴대 사용. 폴대 예약 필요 (D-30 이전). 규격: 600×1,800mm.',
        standard_width_mm: 600, standard_height_mm: 1800,
      },
      {
        category: '통천 배너',
        status: 'conditional',
        note: '외부 지정 구역만 가능. D-45 이전 신청. 규격·부착 방법 운영팀 확인 필수.',
      },
      {
        category: '천정배너',
        status: 'conditional',
        note: '한라홀(대형) 리깅 가능. 소회의실·아라홀은 천장 낮아 제한적. 도면·하중: 운영팀(064-735-1000) 요청.',
      },
      { category: '포디움 타이틀', status: 'allowed', note: '600×200mm. 벨크로.', standard_width_mm: 600, standard_height_mm: 200 },
      { category: '룸사인', status: 'allowed', note: '회의실 입구 아크릴 스탠드. 센터 안내판 위치 사전 확인.' },
    ],
    mount_methods: {
      taka: 'denied', magnet: 'denied', adhesive: 'denied', hanger: 'conditional', rope: 'allowed',
      note: '타카·자석·접착제 금지. 행거: 지정 레일 사용. 로프: 리깅 포인트 허용.',
    },
    rigging: {
      available: true,
      note: '한라홀 리깅 가능. 소회의실 제한적. D-30 이전 도면 요청 및 리거 투입 협의 (064-735-1000).',
    },
    safety: {
      fire: '난연 2급 이상 인증서 필수.',
      fall: '천장 행잉 2점 고정.',
      electric: '220V. 추가 전기 사전 신청.',
      weather: '제주 특성상 강풍 잦음 — 외부 현수막 강풍(10m/s) 시 즉시 철거 또는 강화 고정.',
    },
    warnings: [
      { type: '제주 강풍 주의', description: 'ICC 제주는 외부 풍속이 강함. 외부 사인 고정 로프·와이어 추가 보강 필수.' },
      { type: '외부 광고 D-45 이전 신청', description: '통천·외벽 배너 늦으면 사용 불가.' },
    ],
    digital_signage: { content_review: true, note: 'D-5 이전 제출. 1920×1080 MP4.' },
    last_updated: '2026-05-12',
    special_notes: [
      '【제주 강풍 외부 사인 주의】 외부 가로등배너·통천은 고정 포인트를 2배로 늘리고 로프 장력 점검 필수.',
      '【설치 시간】 D-1일 08:00. 철거 다음날 18:00 — 운영팀 최종 확인.',
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // DDP 아트홀 1관 (동대문디자인플라자)
  // ══════════════════════════════════════════════════════════════
  {
    venue_key: 'ddp_arthall_1',
    venue_name: 'DDP 알림1·2관',
    install_allowed: [
      { category: 'X배너', status: 'allowed', note: '자체 스탠드(물통형). DDP 곡면 공간에 맞게 배치 — 벽면 기대기 불가.' },
      {
        category: '가로현수막',
        status: 'denied',
        note: 'DDP 건축 특성상 일반 현수막 벽면 부착 전면 불가. 별도 사인 구조물(프레임) 제작 시 사전 DDP 승인 필요.',
      },
      {
        category: '통천 배너',
        status: 'conditional',
        note: 'DDP 지정 외부 구역에만 허용. 외벽 곡면 부착 불가 — DDP 지정 구조물 사용 의무. D-60 이전 DDP 마케팅팀(02-2153-0000) 신청.',
      },
      {
        category: '천정배너',
        status: 'denied',
        note: 'DDP 건축 특성상 천장 행잉 거의 불가. 천정배너 계획 시 반드시 바닥 스탠드(물통형·롤업)로 대체.',
      },
      { category: '포디움 타이틀', status: 'allowed', note: '600×200mm. 벨크로.', standard_width_mm: 600, standard_height_mm: 200 },
      { category: 'A4·A3 POP', status: 'allowed', note: '아크릴 스탠드. 접착 금지.' },
      {
        category: '사인 구조물 (별도 제작)',
        status: 'conditional',
        note: '곡면 벽면에 맞는 독립형 사인 구조물 제작 가능. 규격·디자인 DDP 사전 승인 필수 (D-60 이전). DDP 브랜드 가이드라인 준수.',
      },
    ],
    mount_methods: {
      taka: 'denied',
      magnet: 'denied',
      adhesive: 'denied',
      hanger: 'denied',
      rope: 'denied',
      note: '타카·자석·접착제·행거·로프 모두 불가. 설치 가능한 유일한 방법: 자립형 구조물 또는 DDP 지정 시공팀 협의.',
    },
    rigging: {
      available: false,
      note: 'DDP 건축 구조상 천장 행잉 거의 불가. 계획 있으면 D-60 이전 DDP 운영팀에 사전 타당성 문의.',
    },
    safety: {
      fire: '난연 2급 이상 필수. DDP 자체 방염 심사 있음.',
      fall: '천장 행잉 불가 — 해당 없음. 자립형 구조물 전도 방지 대책 필요.',
      electric: '220V. 사전 신청 필수. 케이블 노출 금지.',
      weather: '외부 사인 기상 조건에 따라 즉시 철거.',
      note: 'DDP 내부는 화기 취급·드릴·절단 금지. 모든 설치물 DDP 브랜드 가이드라인 준수.',
    },
    warnings: [
      { type: 'DDP 건물 특수성', description: '곡면 외벽·복잡한 내부 구조로 일반 설치 방법 대부분 불가. 타 행사장 경험 그대로 적용 금지.' },
      { type: '미디어 파사드', description: 'DDP 미디어 파사드 활용 시 DDP 미디어팀 별도 협의. 광고비 발생 가능.' },
      { type: 'D-60 이전 신청 필수', description: '외부 통천·사인 구조물 모두 D-60 이전 DDP 마케팅팀(02-2153-0000) 서면 승인 필요.' },
    ],
    digital_signage: {
      allowed_locations: ['DDP 미디어 파사드 (별도 협의, 광고비 발생 가능)', 'DDP 내부 안내 모니터 (콘텐츠 삽입 협의)'],
      content_review: true,
      note: '미디어 파사드 활용 시 D-30 이전 DDP 미디어팀 제출. 파일 스펙 별도 확인.',
    },
    last_updated: '2026-05-12',
    special_notes: [
      '【DDP에서는 일반 설치 방법 전부 불가】 타카·자석·접착제·행거·로프 모두 금지. 처음 DDP 행사라면 전체 환경장식물 계획을 DDP 운영팀과 사전 협의 후 수립.',
      '【천정배너 계획 시 자동으로 바닥 스탠드로 대체】 물통배너·롤업 스탠드로 대체 계획 수립.',
      '【외부 통천·구조물 D-60 이전 신청】 DDP는 승인 기간이 길어 늦으면 사용 불가.',
      '【DDP 브랜드 가이드라인 준수】 간판·사인물 디자인이 DDP 가이드라인과 충돌하면 승인 불허.',
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // 5/22 사용자 명시 = 호텔류 4건 시설 가이드 신규 (단순 영역·호텔 공통 패턴)
  // ══════════════════════════════════════════════════════════════
  {
    venue_key: 'lotte_hotel_seoul',
    venue_name: '롯데호텔 서울',
    install_allowed: [
      { category: 'X배너', status: 'allowed', note: '연회장·로비 자립형 스탠드 가능. 물통형 권장.' },
      { category: '세로현수막', status: 'allowed', note: '롤업 배너 형태 (자립형).' },
      { category: '가로현수막', status: 'conditional', note: '연회장 내부 무대 영역만 가능. 자체 부착 X·호텔 영업팀(02-771-1000) 사전 협의 의무.' },
      { category: '통천 배너', status: 'denied', note: '호텔 외벽 부착 전면 불가.' },
      { category: '천정배너', status: 'denied', note: '호텔 천장 행잉 영역 불가.' },
      { category: '포디움 타이틀', status: 'allowed', note: '600×200mm. 호텔 포디움 표준 영역.', standard_width_mm: 600, standard_height_mm: 200 },
      { category: 'A4·A3 POP', status: 'allowed', note: '아크릴 스탠드. 접착 X.' },
    ],
    mount_methods: { taka: 'denied', magnet: 'denied', adhesive: 'denied', hanger: 'denied', rope: 'denied', note: '호텔 자체 벽·천장 부착 전면 금지. 자립형 스탠드만 허용.' },
    rigging: { available: false, note: '호텔 천장 행잉 불가.' },
    safety: { fire: '난연 2급 이상.', fall: '자립형 스탠드 전도 방지.', electric: '220V·호텔 영업팀 협의.', weather: '실내 영역만.', note: '호텔 내부 화기 금지.' },
    warnings: [
      { type: '호텔 영업팀 사전 협의 의무', description: '연회장·로비 영역 설치 시 영업팀(02-771-1000) 사전 협의 의무. 늦으면 설치 불가.' },
    ],
    digital_signage: { allowed_locations: ['연회장 LED 스크린 (영상 삽입 협의)'], content_review: true, note: 'D-7 이전 제출.' },
    last_updated: '2026-05-22',
    special_notes: ['【호텔 영역 = 자립형 스탠드만】 벽·천장 부착 전면 X.', '【영업팀 사전 협의 D-30 이전】 늦으면 설치 영역 영향.'],
  },
  {
    venue_key: 'grand_hyatt_seoul',
    venue_name: '그랜드하얏트 서울',
    install_allowed: [
      { category: 'X배너', status: 'allowed', note: '자립형 스탠드. 물통형 권장.' },
      { category: '세로현수막', status: 'allowed', note: '롤업 자립형.' },
      { category: '가로현수막', status: 'conditional', note: '연회장 무대 영역만. 호텔 컨벤션팀(02-797-1234) 사전 협의.' },
      { category: '통천 배너', status: 'denied', note: '호텔 외벽 부착 불가.' },
      { category: '천정배너', status: 'denied', note: '천장 행잉 영역 불가.' },
      { category: '포디움 타이틀', status: 'allowed', note: '600×200mm.', standard_width_mm: 600, standard_height_mm: 200 },
      { category: 'A4·A3 POP', status: 'allowed', note: '아크릴 스탠드.' },
    ],
    mount_methods: { taka: 'denied', magnet: 'denied', adhesive: 'denied', hanger: 'denied', rope: 'denied', note: '벽·천장 부착 전면 금지.' },
    rigging: { available: false, note: '호텔 천장 행잉 불가.' },
    safety: { fire: '난연 2급 이상.', fall: '자립형 스탠드 전도 방지.', electric: '220V.', weather: '실내 영역만.', note: '호텔 내부 화기 금지.' },
    warnings: [
      { type: '컨벤션팀 사전 협의', description: '02-797-1234 사전 협의 의무.' },
    ],
    digital_signage: { allowed_locations: ['연회장 LED 영역 (협의)'], content_review: true },
    last_updated: '2026-05-22',
    special_notes: ['【호텔 영역 = 자립형 스탠드만】', '【컨벤션팀 사전 협의 의무】'],
  },
  {
    venue_key: 'westin_chosun_seoul',
    venue_name: '웨스틴 조선 서울',
    install_allowed: [
      { category: 'X배너', status: 'allowed', note: '자립형 스탠드.' },
      { category: '세로현수막', status: 'allowed', note: '롤업.' },
      { category: '가로현수막', status: 'conditional', note: '연회장 무대 영역. 영업팀(02-771-0500) 사전 협의.' },
      { category: '통천 배너', status: 'denied', note: '외벽 불가.' },
      { category: '천정배너', status: 'denied', note: '천장 행잉 불가.' },
      { category: '포디움 타이틀', status: 'allowed', note: '600×200mm.', standard_width_mm: 600, standard_height_mm: 200 },
      { category: 'A4·A3 POP', status: 'allowed', note: '아크릴 스탠드.' },
    ],
    mount_methods: { taka: 'denied', magnet: 'denied', adhesive: 'denied', hanger: 'denied', rope: 'denied', note: '부착 전면 금지.' },
    rigging: { available: false, note: '천장 행잉 X.' },
    safety: { fire: '난연 2급 이상.', fall: '자립형 전도 방지.', electric: '220V.', weather: '실내.', note: '화기 금지.' },
    warnings: [{ type: '영업팀 사전 협의', description: '02-771-0500.' }],
    digital_signage: { allowed_locations: ['연회장 LED 영역'], content_review: true },
    last_updated: '2026-05-22',
    special_notes: ['【호텔 영역 = 자립형만】'],
  },
  {
    venue_key: 'plaza_hotel_seoul',
    venue_name: '더플라자 호텔 서울',
    install_allowed: [
      { category: 'X배너', status: 'allowed', note: '자립형.' },
      { category: '세로현수막', status: 'allowed', note: '롤업.' },
      { category: '가로현수막', status: 'conditional', note: '그랜드볼룸 무대. 영업팀(02-771-2200) 사전 협의.' },
      { category: '통천 배너', status: 'denied', note: '외벽 불가.' },
      { category: '천정배너', status: 'denied', note: '천장 행잉 불가.' },
      { category: '포디움 타이틀', status: 'allowed', note: '600×200mm.', standard_width_mm: 600, standard_height_mm: 200 },
      { category: 'A4·A3 POP', status: 'allowed', note: '아크릴 스탠드.' },
    ],
    mount_methods: { taka: 'denied', magnet: 'denied', adhesive: 'denied', hanger: 'denied', rope: 'denied', note: '부착 영역 X.' },
    rigging: { available: false, note: '천장 행잉 X.' },
    safety: { fire: '난연 2급 이상.', fall: '전도 방지.', electric: '220V.', weather: '실내.', note: '화기 금지.' },
    warnings: [{ type: '영업팀 사전 협의', description: '02-771-2200.' }],
    digital_signage: { allowed_locations: ['그랜드볼룸 LED'], content_review: true },
    last_updated: '2026-05-22',
    special_notes: ['【자립형 스탠드만】'],
  },

  // ══════════════════════════════════════════════════════════════
  // 5/22 사용자 명시 = 미등록 공공시설·지방 컨벤션 영역 (광화문 광장·aT센터·국립중앙박물관·평창 알펜시아)
  // ══════════════════════════════════════════════════════════════
  {
    venue_key: 'gwanghwamun_square',
    venue_name: '광화문 광장',
    install_allowed: [
      { category: 'X배너', status: 'allowed', note: '광장 영역 자립형 스탠드.' },
      { category: '세로현수막', status: 'allowed', note: '폴대형 또는 자립형.' },
      { category: '가로현수막', status: 'conditional', note: '광화문 광장 운영지침 영역. 종로구청 영역 신청 의무.' },
      { category: '통천 배너', status: 'conditional', note: '대형 통천 = 종로구청 사전 허가 영역.' },
      { category: '포디움 타이틀', status: 'allowed', note: '600×200mm.', standard_width_mm: 600, standard_height_mm: 200 },
    ],
    mount_methods: { taka: 'denied', magnet: 'denied', adhesive: 'denied', hanger: 'conditional', rope: 'conditional', note: '광장 영역 자체 시설 부착 X.' },
    rigging: { available: false, note: '천장 영역 X (야외 영역).' },
    safety: { fire: '난연 2급 이상.', fall: '바닥 스탠드 전도·풍압 영역.', electric: '220V·임시 전원 신청.', weather: '야외 영역·우천·강풍 즉시 철거.', note: '안전 관리자 상시 영역.' },
    warnings: [
      { type: '종로구청 사용 신청', description: '광화문 광장 사용 허가 = 종로구청 영역.' },
      { type: '풍압·우천 영역', description: '야외 영역 = 풍압·우천 대비 필수.' },
    ],
    digital_signage: { allowed_locations: ['LED 영역 = 별도 임시 시설'], content_review: true },
    last_updated: '2026-05-22',
    special_notes: ['【종로구청 사용 신청 의무】', '【야외 영역 = 풍압·우천 영역 대비】'],
  },
  {
    venue_key: 'at_center',
    venue_name: 'aT센터',
    install_allowed: [
      { category: 'X배너', status: 'allowed', note: '전시장 부스·통로 영역.' },
      { category: '세로현수막', status: 'allowed', note: '600×1800·자립형.' },
      { category: '가로현수막', status: 'conditional', note: 'aT센터 운영팀(02-6300-1114) 사전 협의.' },
      { category: '통천 배너', status: 'conditional', note: '외벽 영역·운영팀 협의.' },
      { category: '천정배너', status: 'conditional', note: '리깅 영역 = 운영팀 도면 확인.' },
      { category: '포디움 타이틀', status: 'allowed', note: '600×200mm.', standard_width_mm: 600, standard_height_mm: 200 },
      { category: 'A4·A3 POP', status: 'allowed', note: '아크릴 스탠드.' },
    ],
    mount_methods: { taka: 'denied', magnet: 'denied', adhesive: 'denied', hanger: 'conditional', rope: 'conditional', note: '리깅 영역 운영팀 협의.' },
    rigging: { available: true, max_load_kg: 50, note: 'aT센터 리깅 영역 운영팀 도면 영역.' },
    safety: { fire: '난연 2급 이상.', fall: '리깅 2점 이상.', electric: '220V.', weather: '실내 영역.', note: '비상구 가림 X.' },
    warnings: [{ type: '운영팀 사전 협의', description: '02-6300-1114.' }],
    digital_signage: { allowed_locations: ['전시장 LED 영역'], content_review: true },
    last_updated: '2026-05-22',
    special_notes: ['【운영팀 사전 협의 D-30 이전】'],
  },
  {
    venue_key: 'pyeongchang_alpensia',
    venue_name: '평창 알펜시아',
    install_allowed: [
      { category: 'X배너', status: 'allowed', note: '컨벤션홀·로비 자립형.' },
      { category: '세로현수막', status: 'allowed', note: '600×1800·롤업.' },
      { category: '가로현수막', status: 'conditional', note: '리조트 영업팀(033-339-0000) 사전 협의.' },
      { category: '통천 배너', status: 'conditional', note: '외벽 영역 운영팀 영역.' },
      { category: '천정배너', status: 'conditional', note: '컨벤션홀 리깅 영역 운영팀 도면.' },
      { category: '포디움 타이틀', status: 'allowed', note: '600×200mm.', standard_width_mm: 600, standard_height_mm: 200 },
      { category: 'A4·A3 POP', status: 'allowed', note: '아크릴 스탠드.' },
    ],
    mount_methods: { taka: 'denied', magnet: 'denied', adhesive: 'denied', hanger: 'conditional', rope: 'conditional', note: '리깅 영역 운영팀 협의.' },
    rigging: { available: true, max_load_kg: 50, note: '컨벤션홀 리깅 영역 운영팀 도면.' },
    safety: { fire: '난연 2급 이상.', fall: '리깅 2점.', electric: '220V.', weather: '실내 영역·외벽 우천 시 철거.', note: '동절기 영역 추가 점검.' },
    warnings: [{ type: '리조트 영업팀 사전 협의', description: '033-339-0000.' }],
    digital_signage: { allowed_locations: ['컨벤션홀 LED 영역'], content_review: true },
    last_updated: '2026-05-22',
    special_notes: ['【리조트 영업팀 D-30 이전 협의】', '【동절기 영역 = 동결 대비】'],
  },
]

/**
 * 5/22 사용자 명시 = 도면만 보유 행사장 (BEXCO·EXCO·DCC 등) = 기본 컨벤션 가이드 영역 자동 반환.
 * 단순 패턴 = X배너·세로현수막 (allowed)·가로현수막·통천·천정배너 (conditional·운영팀 협의)·포디움 (allowed).
 */
export function buildDefaultConventionGuide(venueName: string): VenueFacilityGuide {
  return {
    venue_key: 'default_convention_' + venueName.replace(/[^a-zA-Z0-9가-힣]/g, '_').slice(0, 30),
    venue_name: venueName,
    install_allowed: [
      { category: 'X배너', status: 'allowed', note: '전시장·로비 자립형 스탠드. 물통형 권장.' },
      { category: '세로현수막', status: 'allowed', note: '600×1800·롤업.' },
      { category: '가로현수막', status: 'conditional', note: '운영팀 사전 협의 의무.' },
      { category: '통천 배너', status: 'conditional', note: '외벽 영역 운영팀 협의.' },
      { category: '천정배너', status: 'conditional', note: '리깅 영역 운영팀 도면 확인.' },
      { category: '포디움 타이틀', status: 'allowed', note: '600×200mm.', standard_width_mm: 600, standard_height_mm: 200 },
      { category: 'A4·A3 POP', status: 'allowed', note: '아크릴 스탠드.' },
    ],
    mount_methods: { taka: 'denied', magnet: 'denied', adhesive: 'denied', hanger: 'conditional', rope: 'conditional', note: '리깅 영역 운영팀 협의.' },
    rigging: { available: true, max_load_kg: 50, note: '운영팀 도면 영역 영역.' },
    safety: { fire: '난연 2급 이상.', fall: '리깅 2점 이상.', electric: '220V.', weather: '실내 영역.', note: '비상구 가림 X.' },
    warnings: [{ type: '운영팀 사전 협의 의무', description: '시설 가이드 영역 미등록 행사장·운영팀 영역 사전 협의 필수.' }],
    digital_signage: { allowed_locations: ['전시장 LED 영역 (협의)'], content_review: true, note: '운영팀 영역.' },
    last_updated: '2026-05-22',
    special_notes: ['【기본 가이드 영역】 시설 가이드 미등록 행사장·운영팀 영역 사전 협의 후 발주 영역.'],
  }
}

/** 행사장명 → venue_key 매칭 (퍼지 매칭) */
export function findVenueKey(venueName: string | null | undefined): string | null {
  if (!venueName) return null
  const n = venueName.toLowerCase().trim()
  if (n.includes('킨텍스') || n.includes('kintex')) {
    if (n.includes('5홀')) return 'kintex_1_hall_5'
    if (/[1-4]홀/.test(n)) return 'kintex_1_hall_1_to_4'
    if (/[6-9]홀|10홀|2전시장/.test(n)) return 'kintex_2_hall_6_to_10'
    return 'kintex_1_hall_5'   // 홀 미지정 시 가장 많이 사용하는 5홀 기본
  }
  if (n.includes('코엑스') || n.includes('coex')) return 'coex'
  if (n.includes('송도') || n.includes('컨벤시아')) return 'songdo_convensia'
  if (n.includes('icc') || n.includes('제주국제컨벤션') || n.includes('제주컨벤션')) return 'icc_jeju'
  if (n.includes('ddp') || n.includes('동대문디자인') || n.includes('동대문플라자')) return 'ddp_arthall_1'
  return null
}

/** 행사장명으로 시드 데이터 조회 */
export function getFacilityGuide(venueName: string | null | undefined): VenueFacilityGuide | null {
  const key = findVenueKey(venueName)
  if (!key) return null
  return VENUE_FACILITY_GUIDE_SEED.find(g => g.venue_key === key) ?? null
}

/**
 * 비동기 조회: Supabase venues.facility_guide_json 우선 → 없으면 시드 폴백.
 * 서버 컴포넌트 / API Route에서 사용.
 */
export async function getFacilityGuideAsync(
  venueName: string | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<VenueFacilityGuide | null> {
  const key = findVenueKey(venueName)
  if (!key) return null

  try {
    const keyword = venueName?.split(/[\s(]/)[0] ?? ''
    if (keyword && supabase) {
      const { data } = await supabase
        .from('venues')
        .select('facility_guide_json, name')
        .ilike('name', `%${keyword}%`)
        .limit(1)
        .maybeSingle()

      if (data?.facility_guide_json) {
        // DB 데이터 + seed 필드 병합 (seed가 베이스, DB가 덮어씀)
        const seed = VENUE_FACILITY_GUIDE_SEED.find(g => g.venue_key === key)
        return seed ? { ...seed, ...data.facility_guide_json } : (data.facility_guide_json as VenueFacilityGuide)
      }
    }
  } catch {
    // Supabase 실패 시 폴백
  }

  return VENUE_FACILITY_GUIDE_SEED.find(g => g.venue_key === key) ?? null
}
