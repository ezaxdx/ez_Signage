// v2 행사장 풀 시드 — L1 43개 (기존 30 + 신규 13) + L2 상세 홀 (2026-05-15)
//
// 출처:
//   - Agent 2 보도자료·공식 사이트 크롤링 결과 (15개 호텔·컨벤션)
//   - Agent 1 보도자료 크롤링 결과 (8개 컨벤션 — BEXCO·KSPO·EXCO·DCC·CECO·GUMICO·UECO·수원, 진행 중)
//   - 학습데이터_통합_260514 폴더 매핑 (30개 L1)
//   - venueFacilityGuide.ts 시드 (7개 등록 완료)
// SOT: docs/NEW_STRUCTURE_260514.md §2

export type VenueRegionV2 =
  | '서울특별시' | '부산광역시' | '인천광역시' | '대구광역시' | '대전광역시'
  | '광주광역시' | '울산광역시' | '세종특별자치시'
  | '경기도' | '강원특별자치도' | '충청북도' | '충청남도'
  | '전북특별자치도' | '전라남도' | '경상북도' | '경상남도' | '제주특별자치도'
  | '해외'

export interface VenueSpecsV2 {
  /** 면적 (㎡) - 주요 홀별 또는 전체 */
  area_sqm?: number | Record<string, number | string>
  /** 천장 높이 (m) - 주요 홀별 */
  ceiling_height_m?: number | Record<string, number | string>
  /** 좌석 수 - 컨퍼런스홀·대회의실 등 */
  seat_count?: number | Record<string, number | string>
  /** 출입구 위치 */
  entrance_locations?: string
  /** 메인 동선 */
  main_route?: string
  /** 가능 환경 장식물 (24종 마스터 키 또는 자유 텍스트) */
  allowed_categories?: string[]
  /** 불가 환경 장식물 */
  denied_categories?: string[]
  /** 규격 제약 */
  size_constraints?: string
  /** 전기·음향 시설 */
  electrical_audio?: string
  /** 시설 가이드 공식 URL */
  facility_guide_url?: string
  /** 학습 일자 */
  learned_at?: string
  /** 추가 메모 */
  additional_memo?: string
  /** 출처 URL 목록 */
  sources?: string[]
}

export interface VenueV2 {
  /** L1 venue key */
  venue_key: string
  /** L1 venue 이름 */
  venue_name: string
  /** 권역 (광역시·도) */
  region: VenueRegionV2
  /** L2 상세 홀 키 목록 */
  hall_keys?: string[]
  /** 12항목 메타 */
  specs: VenueSpecsV2
  /** 데이터 보강 상태 */
  data_status: 'full' | 'partial' | 'pending' | 'placeholder'
  /** 학습 데이터 보유 여부 */
  has_learning_data: boolean
  /** 학습 파일 개수 (학습데이터_통합_260514) */
  learning_file_count?: number
}

export interface VenueHallV2 {
  hall_key: string
  venue_key: string                  // 부모 L1
  name: string
  parent_hall_key?: string           // 홀 안 부속 (예: COEX 그랜드볼룸 안 그랜드볼룸 1)
  specs?: VenueSpecsV2
}

// ============================================================
// L1 행사장 풀 — 43개 (30 기존 + 13 신규)
// ============================================================

export const VENUES_V2: VenueV2[] = [
  // ========== 컨벤션센터·전시장 (이미 시설 가이드 등록 5개) ==========
  {
    venue_key: 'coex',
    venue_name: 'COEX (코엑스)',
    region: '서울특별시',
    hall_keys: ['coex_grand_ballroom', 'coex_asem_ballroom', 'coex_auditorium', 'coex_conference_room_north', 'coex_hall_a', 'coex_hall_b', 'coex_hall_c', 'coex_hall_d', 'coex_hall_e', 'coex_hall_d2'],
    specs: {
      learned_at: '2026-05-13',  // v9.22 시드 등록
      additional_memo: '서울 최대 전시·컨벤션. D홀·컨퍼런스룸·아셈볼룸·그랜드볼룸',
    },
    data_status: 'partial',
    has_learning_data: true,
    learning_file_count: 159,
  },
  {
    venue_key: 'kintex',
    venue_name: 'KINTEX (킨텍스)',
    region: '경기도',
    hall_keys: ['kintex_1_hall_1', 'kintex_1_hall_2', 'kintex_1_hall_3', 'kintex_1_hall_4', 'kintex_1_hall_5', 'kintex_2_hall_6', 'kintex_2_hall_7a', 'kintex_2_hall_8', 'kintex_2_hall_9a', 'kintex_2_hall_9b', 'kintex_2_hall_10', 'kintex_grand_ballroom'],
    specs: {
      learned_at: '2026-05-13',
      additional_memo: '국내 최대 전시컨벤션. 1전시장(1~5홀)·2전시장(7A·8·9A·9B·10홀)·그랜드볼룸',
    },
    data_status: 'partial',
    has_learning_data: true,
    learning_file_count: 61,
  },
  {
    venue_key: 'songdo_convensia',
    venue_name: '송도컨벤시아',
    region: '인천광역시',
    hall_keys: ['songdo_premier_ballroom', 'songdo_exhibition_hall_1', 'songdo_exhibition_hall_2', 'songdo_meeting_113_117'],
    specs: {
      learned_at: '2026-05-13',
      additional_memo: '인천 송도 국제업무지구. 프리미어 볼룸·전시 1·2홀',
    },
    data_status: 'partial',
    has_learning_data: true,
    learning_file_count: 49,
  },
  {
    venue_key: 'icc_jeju',
    venue_name: 'ICC JEJU (제주국제컨벤션센터)',
    region: '제주특별자치도',
    specs: {
      learned_at: '2026-05-13',
      additional_memo: 'IUCN 리더스포럼·WLCF 등 국제 환경 행사 다수',
    },
    data_status: 'partial',
    has_learning_data: true,
    learning_file_count: 89,
  },
  {
    venue_key: 'ddp',
    venue_name: 'DDP (동대문디자인플라자)',
    region: '서울특별시',
    hall_keys: ['ddp_arthall_1', 'ddp_arthall_2', 'ddp_design_olleh', 'ddp_design_hall', 'ddp_eoulim_square'],
    specs: {
      learned_at: '2026-05-13',
      additional_memo: '디자인·문화 행사 특화. 알림1·2터 / 디자인올레 / 디자인전시관 / 어울림광장',
    },
    data_status: 'partial',
    has_learning_data: true,
    learning_file_count: 40,
  },

  // ========== Agent 2 결과 — 15개 (5/15 보도자료 크롤링 완료) ==========
  {
    venue_key: 'setec',
    venue_name: 'SETEC (서울무역전시컨벤션센터)',
    region: '서울특별시',
    hall_keys: ['setec_hall_1', 'setec_hall_2', 'setec_hall_3', 'setec_convention_hall', 'setec_conference_room'],
    specs: {
      area_sqm: { total_exhibition: 7948, hall_1: 3130, hall_2: 1684, hall_3: 3134, convention_hall: 362 },
      ceiling_height_m: { convention_hall_stage: 7.0, seminar_room_3: 3.1 },
      seat_count: { convention_hall: 300, conference_room: 100 },
      entrance_locations: '전시동(전시실·컨퍼런스룸)과 컨벤션동(컨벤션홀·세미나실) 별도 출입구. 지하철 3호선 학여울역 직결',
      main_route: '남부순환로 정문 → 로비 → 전시동 1·2·3전시실 / 컨벤션동 컨벤션홀·세미나실',
      allowed_categories: ['gate', 'streetlight', 'ceiling_hanging', 'outer_wall', 'vertical_pillar', 'x_banner_static', 'outer_curtain'],
      size_constraints: '제1·3전시실 50m×60m, 제2전시실 40m×42m. 컨벤션홀 14m×25.8m. 부스 표준 3m×3m',
      electrical_audio: '[확인 필요] — 시설사업팀(02-2187-4600) 별도 문의',
      facility_guide_url: 'https://www.setec.or.kr/front/facility/facility01.do',
      learned_at: '2026-05-15',
      additional_memo: '지상 1층 단층. 대지 31,000㎡. 동시주차 500대',
      sources: ['https://www.setec.or.kr/front/facility/facility01.do'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 23,
  },
  {
    venue_key: 'lotte_hotel_seoul',
    venue_name: '롯데호텔 서울',
    region: '서울특별시',
    hall_keys: ['lotte_crystal_ballroom', 'lotte_sapphire_ballroom'],
    specs: {
      area_sqm: { sapphire_ballroom: 832.4 },
      seat_count: { sapphire_ballroom: '200~300석' },
      entrance_locations: '본관 정문 — 소공로 측. 크리스탈볼룸은 3층',
      allowed_categories: ['x_banner_static', 'vertical_pillar', 'outer_curtain'],
      denied_categories: ['outer_wall', 'gate'],
      size_constraints: '호텔 표준 — 무피해·무손상 설치. 자립형 또는 기존 거치대 활용',
      facility_guide_url: 'https://www.lottehotel.com/seoul-hotel/ko/wedding-conference/banquet-halls/crystal-ballroom.html',
      learned_at: '2026-05-15',
      additional_memo: '본관·이그제큐티브타워 2동. 크리스탈볼룸 1,000명 이상 수용',
      sources: ['https://www.lottehotel.com/seoul-hotel/ko/'],
    },
    data_status: 'partial',
    has_learning_data: true,
    learning_file_count: 20,
  },
  {
    venue_key: 'grand_hyatt_seoul',
    venue_name: '그랜드 하얏트 서울',
    region: '서울특별시',
    hall_keys: ['hyatt_grand_ballroom', 'hyatt_regency_room', 'hyatt_foyer', 'hyatt_salon', 'hyatt_namsan_hall'],
    specs: {
      area_sqm: { grand_ballroom: 2370 },
      seat_count: { grand_ballroom_max: 2000 },
      entrance_locations: '남산 소월로 322 — 메인 로비 + 그랜드볼룸 전용 진입로',
      main_route: '메인 로비 → 메자닌(M층) → 그랜드볼룸 / 리젠시룸',
      allowed_categories: ['x_banner_static', 'vertical_pillar', 'photo_wall', 'outer_curtain'],
      denied_categories: ['outer_wall'],
      size_constraints: '호텔 표준 — 무피해 설치. 행잉 시 사전 도면 승인 필요',
      facility_guide_url: 'https://www.hyatt.com/grand-hyatt/en-US/selrs-grand-hyatt-seoul/meetings',
      learned_at: '2026-05-15',
      additional_memo: '서울 최대급 호텔 볼룸. 남산 부지로 옥외 가든 보유 (SPP 2024 진행지)',
      sources: ['https://www.hyatt.com/grand-hyatt/en-US/selrs-grand-hyatt-seoul/meetings'],
    },
    data_status: 'partial',
    has_learning_data: true,
    learning_file_count: 143,
  },
  {
    venue_key: 'the_plaza_seoul',
    venue_name: '더 플라자 호텔 서울',
    region: '서울특별시',
    hall_keys: ['plaza_grand_ballroom', 'plaza_diamond', 'plaza_ruby', 'plaza_maple', 'plaza_orchid'],
    specs: {
      area_sqm: { grand_ballroom: 889 },
      ceiling_height_m: { grand_ballroom: 6.0 },
      seat_count: { grand_ballroom_round_table: 520, grand_ballroom_reception: 600, grand_ballroom_theater: 700, grand_ballroom_classroom: 480 },
      entrance_locations: '시청광장 정문(태평로) — 메인 로비. 그랜드볼룸 LL층(지하 2층)',
      main_route: '메인 로비 → LL층 그랜드볼룸',
      allowed_categories: ['x_banner_static', 'vertical_pillar', 'outer_curtain', 'photo_wall'],
      denied_categories: ['outer_wall', 'gate'],
      size_constraints: '천장 6m — 통천·행잉 6m 이하',
      facility_guide_url: 'https://www.hoteltheplaza.com/en/meeting_and_wedding/grandballroom.jsp',
      learned_at: '2026-05-15',
      additional_memo: '총 9개 연회장 최대 600명. 시청 인접 — 정부·공공 행사 자주',
      sources: ['https://www.hoteltheplaza.com/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 17,
  },
  {
    venue_key: 'westin_josun_seoul',
    venue_name: '웨스틴 조선 서울',
    region: '서울특별시',
    hall_keys: ['westin_grand_ballroom', 'westin_orchid_room', 'westin_lilac_tulip'],
    specs: {
      ceiling_height_m: { grand_ballroom: 6.5 },
      seat_count: { grand_ballroom: '400명 이상' },
      allowed_categories: ['x_banner_static', 'vertical_pillar', 'photo_wall', 'outer_curtain'],
      denied_categories: ['outer_wall'],
      size_constraints: '천장 6.5m — 통천·행잉 6m 이하 권장',
      facility_guide_url: 'https://www.marriott.com/en-us/hotels/selwi-the-westin-josun-seoul/events/',
      learned_at: '2026-05-15',
      additional_memo: '1914년 개관 한국 최초 서양식 호텔. 환구단·시청 인접. 라일락+튤립 = 학습 데이터 폴더',
      sources: ['https://www.marriott.com/en-us/hotels/selwi-the-westin-josun-seoul/'],
    },
    data_status: 'partial',
    has_learning_data: true,
    learning_file_count: 8,  // 학습데이터 _L1미상 8건
  },
  {
    venue_key: 'shilla_seoul',
    venue_name: '서울 신라호텔',
    region: '서울특별시',
    hall_keys: ['shilla_dynasty_hall', 'shilla_yeongbingwan_garden'],
    specs: {
      area_sqm: { dynasty_hall: 1083.2 },
      ceiling_height_m: { dynasty_hall: 6.2 },
      seat_count: { dynasty_hall_reception: 1400, dynasty_hall_theater: 1400, yeongbingwan: '200~300명' },
      entrance_locations: '장충단로 정문. 다이너스티홀 2층. 영빈관 후방 정원',
      main_route: '메인 로비 → 2층 다이너스티홀 / 후방 정원 → 영빈관(야외)',
      allowed_categories: ['x_banner_static', 'vertical_pillar', 'photo_wall', 'outer_curtain', 'gate'],
      denied_categories: ['outer_wall'],
      size_constraints: '다이너스티홀 천장 6.2m. 영빈관 야외는 별도 협의',
      facility_guide_url: 'https://www.shilla.net/seoul/meetingevent/mtGrandBallRoom.do',
      learned_at: '2026-05-15',
      additional_memo: '다이너스티홀 국내 호텔 웨딩홀 최고급. 영빈관 야외 가든 — 정상회담·VIP 만찬',
      sources: ['https://www.shilla.net/seoul/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 9,
  },
  {
    venue_key: 'josun_palace_gangnam',
    venue_name: '조선 팰리스 서울 강남',
    region: '서울특별시',
    hall_keys: ['palace_grand_ballroom', 'palace_great_hall'],
    specs: {
      area_sqm: { grand_ballroom: 1494 },
      ceiling_height_m: { grand_ballroom: 7.5 },
      seat_count: { grand_ballroom: 1160, great_hall: 330 },
      entrance_locations: '테헤란로 231 센터필드 WEST 메인 로비. 그랜드볼룸 3·4층',
      main_route: '메인 로비 → 3층 그레이트홀 / 4층 그랜드볼룸',
      allowed_categories: ['x_banner_static', 'vertical_pillar', 'photo_wall', 'outer_curtain', 'ceiling_hanging'],
      denied_categories: ['outer_wall'],
      size_constraints: '천장 7.5m — 통천·행잉 여유',
      facility_guide_url: 'https://www.marriott.com/en-us/hotels/sellc-josun-palace-a-luxury-collection-hotel-seoul-gangnam/events/',
      learned_at: '2026-05-15',
      additional_memo: '2021년 5월 개관. 조선호텔앤리조트 최상위 럭셔리. 강남권 최대급',
      sources: ['https://www.marriott.com/en-us/hotels/sellc/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 2,
  },
  {
    venue_key: 'signiel_seoul',
    venue_name: '시그니엘 서울',
    region: '서울특별시',
    hall_keys: ['signiel_grand_ballroom'],
    specs: {
      area_sqm: { grand_ballroom: 550 },
      ceiling_height_m: { grand_ballroom: 7.8 },
      entrance_locations: '롯데월드타워 76층 — 전용 엘리베이터. 시그니엘 메인 로비(79층) 경유',
      main_route: '타워 1층 → 시그니엘 전용 엘리베이터 → 76층 그랜드볼룸',
      allowed_categories: ['x_banner_static', 'vertical_pillar', 'photo_wall', 'outer_curtain'],
      denied_categories: ['outer_wall', 'gate'],
      size_constraints: '76층 고층 — 자재 반입 엘리베이터 사이즈 제한. 천장 7.8m',
      facility_guide_url: 'https://www.lottehotel.com/seoul-signiel/ko/wedding-conference/banquet-halls/grand-ballroom.html',
      learned_at: '2026-05-15',
      additional_memo: '세계 최고층 호텔 볼룸(지상 약 350m). 한강 파노라마. 자재 반입 엘리베이터 규격 사전 확인 필수',
      sources: ['https://www.lottehotel.com/seoul-signiel/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 1,
  },
  {
    venue_key: 'sejong_government_convention_center',
    venue_name: '정부세종컨벤션센터',
    region: '세종특별자치시',
    hall_keys: ['sejong_international_conference', 'sejong_medium_conference', 'sejong_grand_banquet'],
    specs: {
      area_sqm: { international_conference_room: 574.76, medium_conference_room: 383.65, grand_banquet_hall: 677.85, indoor_exhibition: 3677, total_complex: 21492 },
      entrance_locations: '전시동 정문(다솜3로) — 1층 메인 로비. 지원동·홍보동 별도',
      main_route: '메인 로비 → 전시동(국제회의장·연회장·전시장) / 지원동(숙박) / 홍보동',
      allowed_categories: ['x_banner_static', 'vertical_pillar', 'photo_wall', 'outer_wall', 'gate', 'outer_curtain'],
      denied_categories: ['[확인 필요] — 정부청사 보안 규정'],
      size_constraints: '정부청사 보안 구역 — 차량·자재 사전 등록 필수',
      electrical_audio: '동시통역 시설 보유(국제회의장)',
      facility_guide_url: 'https://gbmo.go.kr/scc/cm/cntnts/cntntsView.do?mi=1585',
      learned_at: '2026-05-15',
      additional_memo: '정부청사관리본부 운영. 전시동·지원동·홍보동 3개 동. 공공기관 대관료 30% 저렴',
      sources: ['https://gbmo.go.kr/scc/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 9,
  },
  {
    venue_key: 'kdj_convention',
    venue_name: '김대중컨벤션센터',
    region: '광주광역시',
    hall_keys: ['kdj_exhibition_hall', 'kdj_convention_hall', 'kdj_multipurpose_hall', 'kdj_conference_room_2f'],
    specs: {
      area_sqm: { exhibition_hall: 9072, convention_hall: 1518, multipurpose_hall: 2955, conference_room_2f: 790, total_building: 23867 },
      ceiling_height_m: { convention_hall: 8.0, multipurpose_hall: 12.0 },
      seat_count: { convention_hall_theater_max: 1200, multipurpose_hall_total: 3000, conference_room_2f_max: 710, exhibition_booths: 500 },
      entrance_locations: '치평동 정문 — 1층 메인 로비. 전시장 1층 직접 진입(차량 반입로 별도). 컨벤션홀 4층',
      main_route: '정문 로비 → 1층 전시장(3분할) / 2층 회의실·다목적홀 / 4층 컨벤션홀(3분할)',
      allowed_categories: ['outer_wall', 'gate', 'ceiling_hanging', 'vertical_pillar', 'x_banner_static', 'photo_wall', 'streetlight'],
      size_constraints: '전시장 무주 공간 — 통천 자유. 다목적홀 12m 대형 행잉 가능',
      electrical_audio: '컨벤션홀 8개국 동시통역 시스템·영상음향. 다목적홀 무대 8m×23.5m',
      facility_guide_url: 'https://kdjcenter.gjto.or.kr/',
      learned_at: '2026-05-15',
      additional_memo: '호남권 최대 컨벤션. 대지 53,301㎡, 연면적 40,046㎡. 26개 중소회의실. 시설팀 062-611-2223',
      sources: ['https://kdjcenter.gjto.or.kr/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 32,
  },
  {
    venue_key: 'yeosu_expo_convention',
    venue_name: '여수엑스포컨벤션센터',
    region: '전라남도',
    hall_keys: ['yeosu_expo_hall', 'yeosu_conference_hall', 'yeosu_grand_hall', 'yeosu_big_o_outdoor'],
    specs: {
      area_sqm: { expo_hall_large: 1180, conference_hall: 868, grand_hall: 546 },
      seat_count: { expo_hall_theater: 978, expo_hall_total_19rooms: 3238, expo_digital_gallery: 2000, big_o_outdoor_stage: 1530, conference_hall_theater: 500, grand_hall_theater: 400 },
      entrance_locations: '여수세계박람회장 진입 — 컨벤션센터 메인 로비',
      main_route: '박람회장 정문 → 컨벤션센터 1층 로비 → 엑스포홀 / 컨퍼런스홀 / 그랜드홀, 2층 세미나·소회의실',
      allowed_categories: ['outer_wall', 'gate', 'outer_curtain', 'vertical_pillar', 'x_banner_static', 'photo_wall', 'streetlight'],
      size_constraints: '엑스포홀 극장식 계단배치(좌석 고정). 컨퍼런스·그랜드홀 분리벽',
      electrical_audio: '동시통역실 보유(컨퍼런스홀)',
      facility_guide_url: 'https://www.expo2012.kr/web/bbs/content.php?co_id=sub031',
      learned_at: '2026-05-15',
      additional_memo: '2012 여수세계박람회 시설 재활용. 19개 회의실 총 3,238석. 빅오 해상무대 1,530명',
      sources: ['https://yeosuexpoconvention.kr/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 9,
  },
  {
    venue_key: 'andong_international_convention',
    venue_name: '안동국제컨벤션센터 (ADCO)',
    region: '경상북도',
    hall_keys: ['adco_convention_hall', 'adco_medium_201_203', 'adco_medium_206_207'],
    specs: {
      area_sqm: { convention_hall_total: 2400, medium_201_203: 447, medium_206_207: 287, total_complex: 28000, site_area: 330000 },
      seat_count: { convention_hall_theater: 2000, medium_201_203_theater: 350, total_small_medium: 800 },
      entrance_locations: '안동시 ADCO 정문 — 1층 메인 로비. 컨벤션홀(지하 1층) 별도 차량 반입',
      main_route: '메인 로비 → 지하 1층 컨벤션홀(3분할) / 2층 중회의실 7실·소회의실',
      allowed_categories: ['outer_wall', 'gate', 'outer_curtain', 'vertical_pillar', 'x_banner_static', 'photo_wall'],
      size_constraints: '컨벤션홀 가변형 3분할. 행잉 시 분할 도면 사전 확인',
      facility_guide_url: 'http://adco.or.kr/',
      learned_at: '2026-05-15',
      additional_memo: '2022년 9월 개관. 지하 2층·지상 3층. 안동시 직영',
      sources: ['http://adco.or.kr/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 3,
  },
  {
    // 폴더명 'HICO'와 venue_key 정합 — 5/15 Agent 1 alias 점검 결과 (hico_gyeongju → hico)
    venue_key: 'hico',
    venue_name: 'HICO 경주화백컨벤션센터',
    region: '경상북도',
    hall_keys: ['hico_convention_hall', 'hico_exhibition_hall', 'hico_outdoor_square'],
    specs: {
      area_sqm: { convention_hall: 3421, indoor_exhibition: 2273, outdoor_exhibition: 4000, total_complex: 31307, site_area: 42774 },
      seat_count: { convention_hall_theater_max: 3500 },
      entrance_locations: '보문관광단지 진입 — HICO 정문 메인 로비',
      main_route: '정문 로비 → 컨벤션홀(3분할) / 실내전시장 / 12개 중소회의실 / 야외전시장(천년의 마루 광장)',
      allowed_categories: ['outer_wall', 'gate', 'outer_curtain', 'vertical_pillar', 'x_banner_static', 'photo_wall', 'streetlight'],
      size_constraints: '컨벤션홀 3,421㎡ 가변형. 야외 광장 4,000㎡',
      electrical_audio: '초고속 WI-FI7, 4K LED, 고사양 동시통역, 보안설비 (2025년 리뉴얼)',
      facility_guide_url: 'https://www.hico.or.kr/hico/ko/visitors/floorguide.do',
      learned_at: '2026-05-15',
      additional_memo: '지상 4층·지하 1층. 신라 문화유산 모티브. 야외 정원·광장 보유',
      sources: ['https://www.hico.or.kr/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 1,
  },
  {
    venue_key: 'lahan_select_gyeongju',
    venue_name: '라한셀렉트 경주',
    region: '경상북도',
    hall_keys: ['lahan_convention_hall', 'lahan_vega_hall', 'lahan_dynasty_hall'],
    specs: {
      area_sqm: { convention_hall: 1498 },
      ceiling_height_m: { convention_hall: 7.0 },
      seat_count: { convention_hall_banquet: 1000, convention_hall_seminar: 1100, convention_hall_reception: 2000, convention_hall_theater: 1500, vega_hall: 300 },
      entrance_locations: '라한셀렉트 정문 — 호텔 메인 로비. 컨벤션홀 지하 1층',
      main_route: '호텔 로비 → 지하 1층 컨벤션홀 + 전실(640㎡) / 13개 연회장 층별 분산',
      allowed_categories: ['x_banner_static', 'vertical_pillar', 'photo_wall', 'outer_curtain'],
      denied_categories: ['outer_wall'],
      size_constraints: '컨벤션홀 천장 7m — 대형 통천·행잉 가능. 경북 특급호텔 중 최대급',
      facility_guide_url: 'https://www.lahanhotels.com/gyeongju/ko/meetingHalls/convention.do',
      learned_at: '2026-05-15',
      additional_memo: '舊 현대호텔 경주. 2020년 4월 리브랜딩. 440객실·연회장 13실. 한앤컴퍼니 소유',
      sources: ['https://www.lahanhotels.com/gyeongju/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 1,
  },
  {
    // 폴더명 '소노캄 모음'과 venue_key 정합 — 5/15 Agent 1 점검 (TODO: 19개 지점은 hall_keys로 분리)
    venue_key: 'sono_calm',
    venue_name: '소노캄 고양',
    region: '경기도',
    hall_keys: ['sono_grand_ballroom'],
    specs: {
      seat_count: { grand_ballroom: 400 },
      entrance_locations: '킨텍스 인근 호텔 메인 로비',
      main_route: '호텔 로비 → 컨퍼런스 센터 / 그랜드볼룸 / 웨딩홀',
      allowed_categories: ['x_banner_static', 'vertical_pillar', 'photo_wall', 'outer_curtain', 'gate'],
      denied_categories: ['outer_wall'],
      electrical_audio: '그랜드볼룸 양측 LED 스크린 보유 (통천 대체 가능)',
      facility_guide_url: 'https://www.sonohotelsresorts.com/calm_gy/',
      learned_at: '2026-05-15',
      additional_memo: '舊 MVL 고양. 킨텍스 인접 — 대형 박람회 연계 행사 가능. 소노캄 브랜드 수도권 최대급',
      sources: ['https://www.sonohotelsresorts.com/calm_gy/'],
    },
    data_status: 'partial',
    has_learning_data: true,
    learning_file_count: 19,
  },

  // ========== Agent 1 결과 — 8개 컨벤션 (5/15 보도자료 크롤링 완료) ==========
  {
    venue_key: 'bexco',
    venue_name: 'BEXCO (부산국제컨벤션센터)',
    region: '부산광역시',
    hall_keys: ['bexco_exhibition_1', 'bexco_exhibition_2', 'bexco_auditorium', 'bexco_glass_hall', 'bexco_convention_hall'],
    specs: {
      area_sqm: { exhibition_1_total: 26508, exhibition_2_total: 19872, outdoor_exhibition: 13233, convention_hall_total: 29728, auditorium: 4766, glass_hall: 4843 },
      ceiling_height_m: { exhibition_1_max: 22.5, exhibition_2_hall_4: 12, exhibition_2_hall_5: 10 },
      seat_count: { auditorium: 4002, convention_hall_max: 5800, conference_3f: 2400, meeting_rooms: 50 },
      entrance_locations: '제1전시장 화물출입구 4.4m×5.5m 3개소, 제2전시장 4·5홀 화물출입구. 오디토리움 GATE 3~20',
      main_route: '지하철 2호선 벡스코역(시민홀 직결) → 본관(제1전시장)·신관(제2전시장)·오디토리움',
      allowed_categories: ['outer_curtain', 'x_banner_static', 'vertical_pillar', 'ceiling_hanging', 'outer_wall', 'gate'],
      denied_categories: ['벽면 테이프·못 부착'],
      size_constraints: '제1전시장 천장 12.5~22.5m, 제2전시장 4홀 12m·5홀 10m. 바닥하중 제2전시장 4홀 5t/㎡, 5홀 3t/㎡. 제2전시장 4홀 리깅 최대 500kg',
      electrical_audio: '기본 3∅ 4W 380V 100A. 대용량 380V 600A. LED 조명 432개, 조도 602lx. 오디토리움 잔향 0.93~1.41초',
      facility_guide_url: 'https://www.bexco.co.kr/kor/CMS/Contents/Contents.do?mCode=MN051',
      learned_at: '2026-05-15',
      additional_memo: '제1전시장 무주·단층 — 통천·대형 행잉 유리. 오디토리움 무대 32.3m×19m + 측무대 16m×15m',
      sources: ['https://www.bexco.co.kr/kor/CMS/Contents/Contents.do?mCode=MN051'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 82,
  },
  {
    venue_key: 'kspo_dome',
    venue_name: 'KSPO DOME (올림픽체조경기장)',
    region: '서울특별시',
    hall_keys: ['kspo_main_floor', 'kspo_2f', 'kspo_3f'],
    specs: {
      area_sqm: { building: 14016, total: 30548 },
      seat_count: { total: 14594, max_capacity: 15000 },
      entrance_locations: '원형 6개 게이트(Gate 1-1·1-2·1-3 → A/B블록, Gate 2-1·2-2·2-3 → C/D블록). 장비 반입구 1~3문(10톤 이하)',
      main_route: '올림픽공원역 → 평화의문 → KSPO DOME 광장 → 게이트 분산 진입. 1F 플로어·2F·3F 객석',
      allowed_categories: ['ceiling_hanging', 'outer_wall', 'x_banner_static', 'vertical_pillar'],
      denied_categories: ['객석 벽면 직접 부착', '10톤 초과 차량 반입'],
      size_constraints: '무대 폭 15.8m × 깊이 13.3m × 높이 8.7m, 전체 폭 47m. 장비 반입 차량 10톤 이하',
      electrical_audio: 'GRAND MA full size 조명콘솔, 네트워크 조명제어. 서라운드 음향, 영상자막기. 첨단 리깅시스템(2018 리모델링)',
      facility_guide_url: 'https://www.ksponco.or.kr/olympicpark/menu.es?mid=a20301030800',
      learned_at: '2026-05-15',
      additional_memo: '2018 리모델링 — 막구조→철골조. 콘서트·실내 스포츠 다목적. 좌석 가변. 대관 02-2180-3564~6',
      sources: ['https://www.ksponco.or.kr/olympicpark/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 78,
  },
  {
    venue_key: 'exco',
    venue_name: 'EXCO (대구전시컨벤션센터)',
    region: '대구광역시',
    hall_keys: ['exco_west_1_3', 'exco_east_4_6', 'exco_convention_hall', 'exco_grand_ballroom', 'exco_auditorium'],
    specs: {
      area_sqm: { west_total: 14415, east_total: 15024, convention_hall: 3872, grand_ballroom: 3872, auditorium: 1580, meeting_rooms_total: 5771 },
      ceiling_height_m: { west_hall_1_2: 17, west_hall_3: 9.6, east_hall_4_6: 20.3, convention_hall_ab: 7.7 },
      seat_count: { auditorium: 1572, convention_hall_theater_max: 3500, grand_ballroom_theater: 2200, meeting_rooms: 23 },
      entrance_locations: '서관 1~3홀(71.5m·68.6m·77.7m 폭) 화물출입구 다수, 동관 4~6홀 191m×76.8m',
      main_route: '엑스코역(3호선) → 서관 1F 로비 → 컨벤션홀(5F)·오디토리움·전시홀. 서관·동관 연결 통로',
      allowed_categories: ['outer_wall', 'gate', 'outer_curtain', 'vertical_pillar', 'x_banner_static', 'ceiling_hanging'],
      denied_categories: ['[확인 필요] — 시설 가이드 PDF 미확보'],
      size_constraints: '서관 부스 700개, 동관 750개. 무주 단층 전시장. 동관 천장 20.3m 대형 통천·행잉 가능',
      electrical_audio: '동시통역시스템 6개국, 첨단 A/V',
      facility_guide_url: 'https://www.exco.co.kr/facility/sub01.html',
      learned_at: '2026-05-15',
      additional_memo: '2011년 리노베이션 + 2021년 동관 개관. 1·3·5층 전시장 분산. 컨벤션홀 5F',
      sources: ['https://www.exco.co.kr/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 36,
  },
  {
    venue_key: 'dcc',
    venue_name: 'DCC (대전컨벤션센터)',
    region: '대전광역시',
    hall_keys: ['dcc_exhibition_1', 'dcc_exhibition_2', 'dcc_grand_ballroom'],
    specs: {
      area_sqm: { exhibition_1_total: 2520, exhibition_2_total: 10150, exhibition_2_hall_each: 2524 },
      ceiling_height_m: { exhibition_1: 10.3, exhibition_2_hall_1_3: 12, exhibition_2_hall_4: 17.5, max_install_1: 9, max_install_2: 10 },
      seat_count: { exhibition_1_booths: '109·110호 12, 111·112호 40', exhibition_2_booths_per_hall: 130 },
      entrance_locations: '[확인 필요] 시설 가이드 평면도 다운로드 필요',
      main_route: '유성온천역(1호선) → DCC 제1전시장(본관) → 제2전시장(별관)',
      allowed_categories: ['outer_curtain', 'x_banner_static', 'vertical_pillar', 'ceiling_hanging'],
      denied_categories: ['벽면 테이프 부착', '벽면 못 부착', '설치물 천장 초과(제1=9m, 제2=10m 초과 시 구조 협의)'],
      size_constraints: '제1=9m·제2=10m 이하. 바닥하중 제1 2.5t/㎡',
      electrical_audio: '제1: 380V 3상 4식. 제2: 30A 분전반 홀당 18개·75A 10개·40A 8개. 조명 홀당 72EA 리모컨',
      facility_guide_url: 'https://www.dcckorea.or.kr/content/view.do?contentKey=81',
      learned_at: '2026-05-15',
      additional_memo: '제2전시장 2022년 완공. 4홀이 천장 17.5m로 가장 높아 대형 행잉·통천 적합',
      sources: ['https://www.dcckorea.or.kr/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 20,
  },
  {
    venue_key: 'ceco',
    venue_name: 'CECO (창원컨벤션센터)',
    region: '경상남도',
    hall_keys: ['ceco_exhibition_1', 'ceco_exhibition_2', 'ceco_exhibition_3', 'ceco_convention_hall'],
    specs: {
      area_sqm: { exhibition_total: 9376, exhibition_1: 3914, exhibition_2: 3806, exhibition_3: 1656, outdoor: 1741, convention_hall: 1653, meeting_rooms_total: 3793, total: 78929 },
      ceiling_height_m: { exhibition_max: 16, convention_hall: 8 },
      seat_count: { exhibition_booths: 500, exhibition_max: 7700, convention_hall_theater: 1500, meeting_rooms: 16 },
      entrance_locations: '[확인 필요] 도면 다운로드 필요. 제1·제2전시장 54m 폭 화물출입구 추정',
      main_route: '창원 시청 인근 → 1F 로비 → 전시장(1F)·컨벤션홀(3F)·회의실(3·6·7F)',
      allowed_categories: ['outer_wall', 'vertical_pillar', 'x_banner_static', 'ceiling_hanging', 'outer_curtain'],
      size_constraints: '전시장 무주공간. 부스 3m×3m 500개. 컨벤션홀 3개실 분할(14.5m×38m)',
      electrical_audio: 'Floor Box 3상4선·3상3선 30~60kW. 벽 Panel 200kW. EPS실 250~300kW. 동시통역실 8개',
      facility_guide_url: 'https://www.ceco.co.kr/bbx/content.php?co_id=02_02_01_01',
      learned_at: '2026-05-15',
      additional_memo: '2005년 개관, 2017년 회의실·제3전시장 증축. 컨벤션홀 현수막 게시대 11m 자석 고정형',
      sources: ['https://www.ceco.co.kr/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 49,
  },
  {
    venue_key: 'gumico',
    venue_name: 'GUMICO (구미코)',
    region: '경상북도',
    hall_keys: ['gumico_hongbo_1f', 'gumico_exhibition_2f', 'gumico_conference_3f'],
    specs: {
      area_sqm: { site: 31339, total: 14392, exhibition_2f: 3402 },
      ceiling_height_m: { hongbo_1f: 3.5 },
      seat_count: { exhibition_booths: 150, conferences: '대·중·소회의실 + 동시통역 4개국' },
      entrance_locations: '[확인 필요] 평면도 미공개',
      main_route: '구미 IC 인근 → 1F 홍보관 → 2F 전시장 → 3F 대·중·소회의실',
      allowed_categories: ['outer_wall', 'x_banner_static', 'vertical_pillar'],
      denied_categories: ['2F 기둥 4개 회피 필수 — 부스 배치 제약', '홍보관 천장 3.5m로 대형 통천·행잉 불가'],
      size_constraints: '2F 전시장 2분할 가능. 기둥 4개 제약. 홍보관 천장 3.5m',
      electrical_audio: 'DLP 프로젝터, 4개국 동시통역, 최첨단 A/V',
      facility_guide_url: 'https://www.gumico.com/facilities/sub_main.php',
      learned_at: '2026-05-15',
      additional_memo: '지방 중소 규모. 2F 전시장 기둥 4개 부스 배치 핵심 제약. 054-477-8000',
      sources: ['https://www.gumico.com/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 53,
  },
  {
    venue_key: 'ueco',
    venue_name: 'UECO (울산전시컨벤션센터)',
    region: '울산광역시',
    hall_keys: ['ueco_exhibition_1f', 'ueco_conference_2f', 'ueco_convention_hall_3f'],
    specs: {
      area_sqm: { site: 43000, total: 42982, exhibition_1f: 7776, conference_2f: 808.6, convention_hall_3f: 1260 },
      seat_count: { exhibition_booths: 380, exhibition_max: 7600, convention_hall_3f_max: 1440 },
      entrance_locations: 'KTX 울산역 직결(역세권). [확인 필요] 화물출입구 위치',
      main_route: 'KTX 울산역 → UECO 직결 통로 → 1F 전시장·로비 → 2F 회의실 → 3F 컨벤션홀',
      allowed_categories: ['outer_wall', 'vertical_pillar', 'x_banner_static', 'ceiling_hanging', 'outer_curtain'],
      size_constraints: '전시장 2분할/4분할, 무주 구조. 부스 380개',
      facility_guide_url: 'https://ueco.or.kr/',
      learned_at: '2026-05-15',
      additional_memo: '2021년 4월 개관, 지하 1층·지상 3층. KTX역 직결',
      sources: ['https://ueco.or.kr/', 'https://uctf.or.kr/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 31,
  },
  {
    venue_key: 'scc_suwon',
    venue_name: '수원컨벤션센터 (SCC)',
    region: '경기도',
    hall_keys: ['scc_exhibition_a', 'scc_exhibition_b', 'scc_convention_hall', 'scc_meeting_rooms'],
    specs: {
      area_sqm: { exhibition_total: 7877, exhibition_a: 4177, exhibition_b: 3700, convention_hall_total: 3040, meeting_rooms_range: '82~516' },
      ceiling_height_m: { exhibition: 12, convention_hall: 13, meeting_rooms: 2.8 },
      seat_count: { exhibition_booths: 406, convention_hall_theater: 1800, convention_hall_banquet: 2916, meeting_rooms: 41 },
      entrance_locations: '광교중앙역(신분당선) 인근. [확인 필요] 화물출입구 위치',
      main_route: '광교중앙역 → 1F 메인 로비 → 전시홀(B1·1F)·컨벤션홀(3F)·회의실(1~4F)',
      allowed_categories: ['outer_wall', 'vertical_pillar', 'x_banner_static', 'ceiling_hanging', 'outer_curtain'],
      denied_categories: ['회의실 천장 2.8m로 행잉·대형 통천 불가'],
      size_constraints: '전시홀 124.5m×61.8m×12m, 3분할. 바닥하중 전시홀 3t/㎡, 컨벤션홀 1.5t/㎡',
      electrical_audio: '컨벤션홀 전동식 무대(30m×5m×1m), 스크린 5개(600·500·300인치), 빔 프로젝터 20,000+12,000 ANSI, 마이크 16개',
      facility_guide_url: 'https://www.scc.or.kr/exhibition-hall/',
      learned_at: '2026-05-15',
      additional_memo: '2019년 3월 개관. 광교호수공원 인접. 컨벤션홀 3분할. 회의실 41개',
      sources: ['https://www.scc.or.kr/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 29,
  },

  // ========== Agent 3 결과 — 12개 (5/15 보도자료 크롤링 완료) ==========
  {
    venue_key: 'gwanghwamun_square',
    venue_name: '광화문광장',
    region: '서울특별시',
    specs: {
      area_sqm: 40300,
      entrance_locations: '광화문(북), 세종대로 사거리(남), 세종문화회관(서), KT빌딩(동)',
      main_route: '광화문→세종대왕상→이순신장군상→세종대로 사거리 남북 축',
      allowed_categories: ['gate', 'outer_curtain', 'streetlight', 'x_banner_static', 'route_banner', 'photo_wall', 'stage_sidewing'],
      denied_categories: ['건물 외벽 부착(인접 임차 불가)', '대형 풍선·에어돔(조례 제한)', '정치 행사 일체'],
      size_constraints: '서울시 옥외광고물 조례·광장 사용 조례. 2024년 자유표시구역 1단계',
      electrical_audio: '임시 전기 인입 필요. 야간 시 한전 임시 전력',
      facility_guide_url: 'https://gwanghwamun.seoul.go.kr/',
      learned_at: '2026-05-15',
      additional_memo: '야외 공공 광장. 3.1절 100주년 등 국가행사. 학습 59 파일',
      sources: ['https://gwanghwamun.seoul.go.kr/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 59,
  },
  {
    venue_key: 'gyeongju_bomun',
    venue_name: '경주 (보문관광단지)',
    region: '경상북도',
    specs: {
      area_sqm: 42774,
      seat_count: 4300,
      entrance_locations: 'HICO 정문, 보문호 호반광장, PRS 측 보조',
      main_route: 'HICO 컨벤션홀→실내전시장→야외전시장→보문호 호반광장',
      allowed_categories: ['gate', 'outer_curtain', 'streetlight', 'photo_wall', 'stage_sidewing', 'did_signage'],
      denied_categories: ['보문호 호반 친수공간 영구 부착', '단지 내 가로수 직접 부착', '문화재 보호구역 인접 대형'],
      size_constraints: '보문호 호반광장 조형물 최대 16m (2025 APEC 기준). HICO 컨벤션홀 3,421㎡',
      electrical_audio: 'HICO 음향·조명·동시통역 기본. 야외 시 임시 전력',
      facility_guide_url: 'https://www.hico.or.kr/',
      learned_at: '2026-05-15',
      additional_memo: '2025 APEC 정상회의 메인. 보문호 호반 알 모티브 16m 조형물·미디어파사드',
      sources: ['https://www.hico.or.kr/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 13,
  },
  {
    venue_key: 'pyeongchang_olympic_stadium',
    venue_name: '평창올림픽스타디움 (개·폐회식장)',
    region: '강원특별자치도',
    specs: {
      area_sqm: 240000,
      seat_count: 35000,
      entrance_locations: '올림픽플라자 정문, 성화대 게이트, 본관동(7층) 인접 게이트',
      main_route: '올림픽플라자 진입→스타디움 중앙 원형무대→성화대→본관동',
      allowed_categories: ['gate', 'outer_curtain', 'streetlight', 'photo_wall', 'stage_sidewing'],
      denied_categories: ['성화대 직접 부착', '본관동 외벽 영구 부착', 'IOC 브랜딩 가이드 위반'],
      size_constraints: '관중석 35,000~40,000석. 올림픽플라자 24만㎡. 본관동 7층 + 성화대만 잔존(2018.6 일부 철거)',
      electrical_audio: '임시 전력·음향. 행사 시 임시 발전 필요',
      facility_guide_url: 'https://pom2018.org/intro/sub04',
      learned_at: '2026-05-15',
      additional_memo: '2018 동계올림픽 개·폐회식장. 상시 운영 X — 임시 행사 시 올림픽플라자 단위 활용',
      sources: ['https://pom2018.org/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 8,
  },
  {
    venue_key: 'busan_asean_2019',
    venue_name: '부산 (BEXCO + 누리마루 — 2019 한아세안 특별정상회의)',
    region: '부산광역시',
    specs: {
      area_sqm: 46380,
      entrance_locations: 'BEXCO 제1전시장 정문, 제2전시장, 오디토리움 / 누리마루 동백섬',
      main_route: 'BEXCO 제1·제2전시장 연결 / 누리마루 1층(지원)→2층(연회)→3층(정상회의)',
      allowed_categories: ['gate', 'outer_curtain', 'streetlight', 'photo_wall', 'x_banner_static', 'vehicle_q_bang'],
      denied_categories: ['누리마루 외벽 직접 부착(문화재급)', '동백섬 자연 식생 훼손', 'BEXCO 외벽 임의 부착'],
      size_constraints: 'BEXCO 제1전시장 26,508㎡, 제2전시장 19,872㎡. 누리마루 905평·3층',
      electrical_audio: 'BEXCO 표준. 누리마루 정상회담급 보안·음향',
      facility_guide_url: 'https://www.bexco.co.kr/',
      learned_at: '2026-05-15',
      additional_memo: '2019 한아세안 메인 = BEXCO 제2전시장. 정상회담 = 누리마루. 누리마루 정자형 한국전통 외벽 부착 강한 제한. 학습 19 파일',
      sources: ['https://www.bexco.co.kr/', 'http://han-asean.unionzglobal.com/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 19,
  },
  {
    venue_key: 'at_center',
    venue_name: 'aT센터',
    region: '서울특별시',
    specs: {
      area_sqm: 17637,
      entrance_locations: '강남대로 정문, 신분당선 양재시민의숲역 지하 연결, 제1·제2전시장 별도',
      main_route: '신분당선 지하→1층 로비→제1전시장(1층)→제2전시장(3·4·5층)→사무동',
      allowed_categories: ['gate', 'outer_curtain', 'streetlight', 'photo_wall', 'x_banner_static', 'stage_sidewing'],
      denied_categories: ['사무동 외벽 부착', '신분당선 연결통로 무단 부착'],
      size_constraints: '전시컨벤션동(1·3·4·5층) + 사무동 15층 + 지하 1층',
      electrical_audio: '식품·농수산 박람회 빈도 높음 — 냉장·조리 부스 인프라',
      facility_guide_url: 'https://atcenter.at.or.kr/',
      learned_at: '2026-05-15',
      additional_memo: '한국농수산식품유통공사 운영. 양재시민의숲역(신분당선) 연결',
      sources: ['https://atcenter.at.or.kr/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 5,
  },
  {
    venue_key: 'gyeongnam_provincial',
    venue_name: '경남도청 대회의실',
    region: '경상남도',
    specs: {
      entrance_locations: '경남도청 본관 정문 → 로비 → 대회의실(2~3층)',
      main_route: '본관 정문 로비→엘리베이터·계단→대회의실 입구',
      allowed_categories: ['x_banner_static', 'photo_wall', 'name_plate', 'table_number', 'streetlight'],
      denied_categories: ['도청 건물 외벽 부착', '본관 로비 대형 풍선', '보안구역 무단 미디어', 'gate'],
      size_constraints: '관공서 회의실 표준. 외부 행사 사전 승인 필수',
      electrical_audio: '회의실 기본 음향·영상·동시통역 (도지사 주재 회의 기준)',
      facility_guide_url: 'https://www.gyeongnam.go.kr/',
      learned_at: '2026-05-15',
      additional_memo: '대형 환경장식물보다 백월·X배너·테이블 사인 의전형. 학습 10 파일',
      sources: ['https://www.gyeongnam.go.kr/'],
    },
    data_status: 'partial',
    has_learning_data: true,
    learning_file_count: 10,
  },
  {
    venue_key: 'gwangju_biennale',
    venue_name: '광주비엔날레전시관',
    region: '광주광역시',
    specs: {
      area_sqm: 13329,
      entrance_locations: '정문(중외공원), 후문(주차장), 갤러리 1~5 개별 입구',
      main_route: '정문→1층 로비→갤러리1·2·3→2층 갤러리4·5→후문',
      allowed_categories: ['gate', 'outer_curtain', 'photo_wall', 'x_banner_static', 'stage_sidewing', 'streetlight'],
      denied_categories: ['전시관 외벽 영구 부착', '전시품(작품) 인접 광고', '중외공원 자연 훼손'],
      size_constraints: '지상 3층 2개 동, 13,329㎡. 갤러리 1~5 분할',
      electrical_audio: '전시용 표준 조명·전력. 미술관급 항온항습',
      facility_guide_url: 'https://www.gwangjubiennale.org/gb/exhibition/location/biennale.do',
      learned_at: '2026-05-15',
      additional_memo: '광주비엔날레재단 운영. 2027년 신규 전시관 건립 예정. 미술 전시 시 작품 간섭 X',
      sources: ['https://gwangjubiennale.org/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 1,
  },
  {
    venue_key: 'nmk',
    venue_name: '국립중앙박물관',
    region: '서울특별시',
    specs: {
      entrance_locations: '박물관 정문(이태원), 거울못 진입, 으뜸홀 직통, 의장대 측 주차장',
      main_route: '정문→거울못→열린마당(야외)→으뜸홀(중앙홀)→상설전시관',
      allowed_categories: ['stage_sidewing', 'photo_wall', 'x_banner_static', 'name_plate', 'table_number'],
      denied_categories: ['박물관 외벽 직접 부착', '상설전시관 인접 광고', '거울못 수면 부유물', '자연 훼손', 'gate', '대형 풍선·에어돔(보존)'],
      size_constraints: '교육·전시·시설 지장 없는 범위. 대관 신청 7일 통지. 사용 5일 전 취소 시 반환',
      electrical_audio: '으뜸홀·교육관 실내 표준. 야외 시 임시 전력',
      facility_guide_url: 'https://www.museum.go.kr/MUSEUM/contents/M0104070000.do',
      learned_at: '2026-05-15',
      additional_memo: '문화재 보존 환경 최우선. 저채도·자연 친화형 권장. 외벽 부착 일체 금지',
      sources: ['https://www.museum.go.kr/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 1,
  },
  {
    venue_key: 'seoul_square',
    venue_name: '서울스퀘어 (옛 대우빌딩)',
    region: '서울특별시',
    specs: {
      entrance_locations: '한강대로 정문(서울역 광장 인접), 후문(만리재로), 지하주차장',
      main_route: '한강대로 정문→1층 로비→회의실(층별)→옥상/외벽 미디어파사드',
      allowed_categories: ['photo_wall', 'x_banner_static', 'name_plate', 'did_signage'],
      denied_categories: ['외벽 물리적 부착(테라코타+LED 보호)', '건물 정면 가로등배너', '서울역 광장(별도 관할)', 'gate'],
      size_constraints: '회의실 8~116인. 외벽 미디어파사드 99m×78m (기네스 세계최대), LED 30,000~42,000개. 매시 정각 10분 점멸',
      electrical_audio: '사무빌딩 표준 회의실. 미디어파사드 콘텐츠 빌딩 운영사 협의',
      facility_guide_url: 'http://www.seoulsquare.com/reservation/reservation.asp',
      learned_at: '2026-05-15',
      additional_memo: '외벽 미디어파사드 = 핵심 차별. 디지털 콘텐츠 송출로 행사 연출. 입주사·외부 대관 모두 가능',
      sources: ['http://www.seoulsquare.com/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 9,
  },
  {
    venue_key: 'osco_cheongju',
    venue_name: 'OSCO (청주 오송컨벤션센터)',
    region: '충청북도',
    specs: {
      entrance_locations: '오송역(KTX) 측, 컨벤션홀 정문, 전시장 별도',
      main_route: 'KTX 오송역→연결도로→OSCO 정문→컨벤션홀→전시장',
      allowed_categories: ['gate', 'outer_curtain', 'streetlight', 'photo_wall', 'x_banner_static', 'stage_sidewing', 'did_signage'],
      denied_categories: ['신축 건물 외장재 보호', 'KTX 오송역 광장 무단 점유'],
      size_constraints: '2025-04-16 준공, 6월 시범, 9.11 정식 개관. 충북 최초 컨벤션센터',
      electrical_audio: '신축 표준 (음향·영상·동시통역). 디지털 사이니지 구비 추정',
      facility_guide_url: 'https://osco.or.kr/',
      learned_at: '2026-05-15',
      additional_memo: '⚠️ 사용자 요청서에 "부산광역시"로 기재되었으나 OSCO는 충북 청주 오송 시설. 학습 데이터 6 파일 출처 확인 필요 (부산 다른 OSCO일 가능성? BEXCO·BPEX 추정 가능)',
      sources: ['https://osco.or.kr/'],
    },
    data_status: 'partial',
    has_learning_data: true,
    learning_file_count: 6,
  },
  {
    venue_key: 'brazil_belem',
    venue_name: '브라질 벨렘 (COP30 한국홍보관)',
    region: '해외',
    specs: {
      entrance_locations: 'COP30 블루존 메인 게이트, 한국홍보관 전용 입구',
      main_route: '블루존 진입→국가관 구역→한국홍보관(KEITI)→부대행사장',
      allowed_categories: ['photo_wall', 'x_banner_static', 'did_signage', 'stage_sidewing', 'name_plate'],
      denied_categories: ['UNFCCC 외벽 부착', '블루존 보안구역 외 광고', '아마존 친환경 가이드 위반', 'gate'],
      size_constraints: 'COP 국가관 부스 50~150㎡. KEITI 운영 대행',
      electrical_audio: 'COP 표준 (110V/220V 혼용). 통역·디스플레이 자체 반입',
      facility_guide_url: 'https://cop30.br/en',
      learned_at: '2026-05-15',
      additional_memo: 'COP30 = 2025.11.10~21. 한국관 = 블루존 내 국가관 부스. 해외 운송·통관·현지 시공 변수 큼',
      sources: ['https://cop30.br/en'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 2,
  },
  {
    venue_key: 'france_paris_13e_art',
    venue_name: '프랑스 파리 13e Art (Théâtre du Treizième Art)',
    region: '해외',
    specs: {
      area_sqm: 3700,
      seat_count: 1030,
      entrance_locations: 'Italie 2 쇼핑센터 메인, 극장 전용 게이트, Grande Salle(900석)·Petite Salle(130석)',
      main_route: 'Italie 2 진입→극장 로비→Grande Salle / Petite Salle→TV 녹화 스튜디오·바·레스토랑',
      allowed_categories: ['photo_wall', 'x_banner_static', 'stage_sidewing', 'name_plate'],
      denied_categories: ['Italie 2 외벽 부착', '좌석 영역 영구 부착', '파리시 ZPA 옥외광고 규제', 'gate'],
      size_constraints: '3,700㎡ 문화공간. Grande 900석 + Petite 130석. 좌안 최대급',
      electrical_audio: '공연장 표준 (220V). TV 녹화 스튜디오 별도',
      facility_guide_url: 'https://le13emeart.com/',
      learned_at: '2026-05-15',
      additional_memo: '2017.9 개관 (Juste Pour Rire 그룹). Italie 2 쇼핑센터 내부 입주 — 외벽·옥외 게이트 불가. 환경장식물 = 로비·무대·포토월 중심',
      sources: ['https://le13emeart.com/'],
    },
    data_status: 'full',
    has_learning_data: true,
    learning_file_count: 3,
  },

  // ========== 기존 30개 L1 중 시설 가이드 미상세 (학습 데이터 보유) ==========
  { venue_key: 'gsco', venue_name: 'GSCO', region: '경기도', specs: { learned_at: '2026-05-15', additional_memo: '도면 6건 보유. 시설 가이드 미등록 — placeholder. (Agent 1 5/15 확인)' }, data_status: 'placeholder', has_learning_data: true, learning_file_count: 6 },
  { venue_key: 'jeju_shilla', venue_name: '제주신라호텔', region: '제주특별자치도', specs: { learned_at: '2026-05-15', additional_memo: '도면 6건 보유. 시설 가이드 미등록 — placeholder' }, data_status: 'placeholder', has_learning_data: true, learning_file_count: 6 },
  { venue_key: 'the_shilla', venue_name: 'THE SHILLA (라이프스타일)', region: '서울특별시', specs: { learned_at: '2026-05-15', additional_memo: '⚠️ 결락 — 파일 1건만 보유. 시설 가이드 신규 등록 우선순위 (Agent 1 §4.3)' }, data_status: 'placeholder', has_learning_data: true, learning_file_count: 1 },
]

// ============================================================
// 헬퍼
// ============================================================

/** 행사장 검색 — venue_key */
export function findVenueByKey(key: string): VenueV2 | undefined {
  return VENUES_V2.find(v => v.venue_key === key)
}

/** 행사장 검색 — 이름 fuzzy */
export function findVenueByName(name: string): VenueV2 | null {
  if (!name) return null
  const lower = name.toLowerCase().trim()
  for (const v of VENUES_V2) {
    if (v.venue_name.toLowerCase().includes(lower)) return v
    if (lower.includes(v.venue_name.toLowerCase())) return v
  }
  return null
}

/** 권역별 그룹핑 */
export function groupVenuesByRegion(): Record<VenueRegionV2, VenueV2[]> {
  const result: Partial<Record<VenueRegionV2, VenueV2[]>> = {}
  for (const v of VENUES_V2) {
    if (!result[v.region]) result[v.region] = []
    result[v.region]!.push(v)
  }
  return result as Record<VenueRegionV2, VenueV2[]>
}

/** 데이터 보강 상태별 카운트 (학습 진행 KPI) */
export function getDataStatusCounts() {
  return {
    full: VENUES_V2.filter(v => v.data_status === 'full').length,
    partial: VENUES_V2.filter(v => v.data_status === 'partial').length,
    pending: VENUES_V2.filter(v => v.data_status === 'pending').length,
    placeholder: VENUES_V2.filter(v => v.data_status === 'placeholder').length,
    total: VENUES_V2.length,
  }
}
