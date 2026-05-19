#!/usr/bin/env node
// 시설 가이드 골격 시드 21건 자동 생성 (2026-05-19)
// 출력: stdout — 사용자가 venueFacilityGuide.ts ] 직전에 paste 또는 자동 Edit
// 패턴: buildDefaultConventionGuide() 기반 + venue_key·venue_name 분리·last_updated·special_notes 명시
// 정답지 노출 X = 운영팀 연락처는 폴더 안내·임대자료 PDF 분석 후 보강 (special_notes 명시)

const VENUES = [
  // 1순위 (대형)
  { key: 'bexco_basic',                  name: 'BEXCO (벡스코) — 부산',                       region: '부산광역시' },
  { key: 'exco_basic',                   name: 'EXCO — 대구',                                  region: '대구광역시' },
  { key: 'gsco_basic',                   name: 'GSCO (광주김대중컨벤션센터) — 광주',          region: '광주광역시' },
  { key: 'kdjcc_basic',                  name: '광주 김대중컨벤션센터 — 광주',                 region: '광주광역시' },
  { key: 'the_shilla_basic',             name: 'THE SHILLA 서울신라호텔 — 서울',              region: '서울특별시' },
  // 2순위 (중형)
  { key: 'ceco_basic',                   name: 'CECO (창원컨벤션센터) — 경남',                 region: '경상남도' },
  { key: 'dcc_basic',                    name: 'DCC (대전컨벤션센터) — 대전',                  region: '대전광역시' },
  { key: 'hico_basic',                   name: 'HICO (경주화백컨벤션센터) — 경주',             region: '경상북도' },
  { key: 'kspo_dome_basic',              name: 'KSPO DOME (올림픽공원) — 서울',               region: '서울특별시' },
  { key: 'setec_basic',                  name: 'SETEC (서울무역전시컨벤션센터) — 서울',       region: '서울특별시' },
  { key: 'yeosu_expo_basic',             name: '여수엑스포컨벤션센터 — 여수',                 region: '전라남도' },
  { key: 'sejong_convention_basic',      name: '정부세종컨벤션센터 — 세종',                   region: '세종특별자치시' },
  { key: 'signiel_seoul_basic',          name: '시그니엘 서울 — 서울',                        region: '서울특별시' },
  { key: 'jeju_shilla_basic',            name: '제주신라호텔 — 제주',                         region: '제주특별자치도' },
  { key: 'josun_palace_basic',           name: '조선팰리스 강남 — 서울',                      region: '서울특별시' },
  { key: 'suwon_convention_basic',       name: '수원컨벤션센터 — 수원',                       region: '경기도' },
  // 3순위 (소형)
  { key: 'gumico_basic',                 name: 'GUMICO (구미컨벤션센터) — 구미',              region: '경상북도' },
  { key: 'ueco_basic',                   name: 'UECO (울산컨벤션센터) — 울산',                region: '울산광역시' },
  { key: 'rahan_hotel_basic',            name: '라한호텔·라한셀렉트 — 서울',                  region: '서울특별시' },
  { key: 'sonokam_basic',                name: '소노캄 — 강원',                                region: '강원특별자치도' },
  { key: 'andong_convention_basic',      name: '안동국제컨벤션센터 — 안동',                   region: '경상북도' },
]

function buildSeed(v) {
  return `  // ${v.name} — 폴더 안내·임대자료 분석 후 운영팀 연락처·표준 규격 보강 필요
  {
    venue_key: '${v.key}',
    venue_name: '${v.name.replace(/'/g, "\\'")}',
    install_allowed: [
      { category: 'X배너',         status: 'allowed',     note: '전시장·로비 자립형 스탠드. 물통형 권장.' },
      { category: '세로현수막',    status: 'allowed',     note: '600×1800 표준 (롤업 또는 폴대).', standard_width_mm: 600, standard_height_mm: 1800 },
      { category: '가로현수막',    status: 'conditional', note: '외벽 부착 = 운영팀 사전 협의 의무.' },
      { category: '통천 배너',     status: 'conditional', note: '외벽 대형 = 운영팀 협의.' },
      { category: '천정배너',      status: 'conditional', note: '리깅 영역 = 운영팀 도면 확인.' },
      { category: '포디움 타이틀', status: 'allowed',     note: '600×200mm 표준.', standard_width_mm: 600, standard_height_mm: 200 },
      { category: 'A4·A3 POP',     status: 'allowed',     note: '아크릴 스탠드 자유 배치.' },
    ],
    mount_methods: { taka: 'denied', magnet: 'denied', adhesive: 'denied', hanger: 'conditional', rope: 'conditional', note: '리깅·고정 영역 = 운영팀 사전 협의.' },
    rigging: { available: true, max_load_kg: 50, note: '운영팀 도면 영역.' },
    safety: { fire: '난연 2급 이상.', fall: '리깅 2점 이상.', electric: '220V.', weather: '실내 영역.', note: '비상구 가림 X.' },
    warnings: [{ type: '운영팀 사전 협의 의무', description: '${v.name} 운영팀 연락처 = 폴더 안내·임대자료 PDF 분석 후 보강 필요.' }],
    digital_signage: { allowed_locations: ['전시장 LED 영역 (협의)'], content_review: true, note: '운영팀 영역.' },
    last_updated: '2026-05-19',
    special_notes: ['【골격 시드 — 2026-05-19】 운영팀 연락처·표준 규격·리깅 조건 = 폴더 안내·임대자료 PDF 분석 후 보강 필요. 지역: ${v.region}'],
  },`
}

const out = VENUES.map(buildSeed).join('\n')
console.log(out)
console.log(`\n// 자동 생성 시드 ${VENUES.length}건 (시설 가이드 골격 — 운영팀 연락처·표준 규격은 후속 보강)`)
