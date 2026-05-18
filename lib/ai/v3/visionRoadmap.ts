// 환경장식물 향후 도입 영역 로드맵 (5/19 광범위 조사 결과)
//
// 출처: reference-환경장식물-광범위조사-260519 메모리·8건 WebSearch 종합
//
// 본 파일 = 시드/로드맵 SOT. 실제 도입 = 사용자 컴펌·곽 이사 컴펌 영역.

export interface VisionRoadmapItem {
  id: string
  priority: 'immediate' | 'd-7' | 'd-30' | 'quarter'
  area: string
  tech_stack: string[]
  notion_alignment: string
  use_case: string
  cost_estimate_krw?: string
  blocker?: string
}

/** 5/19 광범위 조사 결과 도입 후보 4건 */
export const VISION_ROADMAP: VisionRoadmapItem[] = [
  {
    id: 'nist-rmf-display',
    priority: 'immediate',
    area: 'NIST AI RMF 4단계 정합 표시',
    tech_stack: ['react', 'tailwind'],
    notion_alignment: '§1-3 4단 안전망',
    use_case: '곽 이사 보고 자료 신뢰성·관리자 페이지 안전 영역 표시',
    blocker: undefined,
  },
  {
    id: 'sd-controlnet-signage',
    priority: 'd-7',
    area: 'Stable Diffusion 3.5 + ControlNet 시안 자동 1차안',
    tech_stack: ['stable-diffusion-3.5', 'controlnet', 'huggingface-diffusers', 'gradio'],
    notion_alignment: '§2-1 신규 ④ AI 시안 생성 (현재 미구현)',
    use_case: '디자이너 컴펌 시간 단축·1차안 즉시 제공·환경장식물 12 카테고리 규격 강제 (Canny edge)',
    cost_estimate_krw: 'GPU 비용 추정: 1 시안 약 50원 (RunPod·Modal·Vercel AI Gateway)',
    blocker: 'GPU 환경·디자이너 컴펌·곽 이사 컴펌 영역',
  },
  {
    id: 'pytorch-image-classify',
    priority: 'd-7',
    area: 'pytorch-image-models 시안 자동 분류',
    tech_stack: ['pytorch', 'huggingface-transformers-v5', 'vit', 'swin-transformer'],
    notion_alignment: '§2-1 신규 ⑤ 시안 → 12 카테고리 자동 매핑',
    use_case: '사용자 시안 업로드 → 자동 X배너/I배너/통천 등 분류 → design_items.category 자동 입력',
    cost_estimate_krw: '월 약 10,000원 추정 (Vercel AI Gateway·HF Spaces)',
    blocker: '학습 데이터 (200건 시안)·라이브러리 도입',
  },
  {
    id: 'kosbi-safety',
    priority: 'quarter',
    area: 'KoSBi 한국어 AI 안전 벤치마크 응답 검증',
    tech_stack: ['naver-ai-korean-safety-benchmarks', 'huggingface-spaces'],
    notion_alignment: 'Korea AI Basic Act pre-emptive safety 정합',
    use_case: 'AI 추천 응답 = KoSBi 안전·비안전 분류 → 비안전 응답 자동 차단·정정',
    cost_estimate_krw: '월 약 5,000원 추정 (분류 모델 호출)',
    blocker: 'KoSBi 데이터셋 사용 권한·라이브러리 도입',
  },
  {
    id: 'behance-pinterest-references',
    priority: 'd-30',
    area: 'Behance·Pinterest 시안 영감 큐레이션',
    tech_stack: ['behance-api', 'pinterest-api', 'notion-api'],
    notion_alignment: '§5 행사장 학습 + 디자이너 영감 라이브러리',
    use_case: '환경장식물 카테고리별 글로벌 시안 영감·디자이너 참고 자료·노션 디자인 갤러리 동기화',
    cost_estimate_krw: '월 약 30,000원 추정 (API + 노션 스토리지)',
    blocker: 'API 인증·저작권 검토·디자인팀 컴펌',
  },
]

/** 우선순위별 그룹핑 */
export function groupRoadmapByPriority(): Record<string, VisionRoadmapItem[]> {
  const grouped: Record<string, VisionRoadmapItem[]> = {}
  for (const item of VISION_ROADMAP) {
    if (!grouped[item.priority]) grouped[item.priority] = []
    grouped[item.priority].push(item)
  }
  return grouped
}

/** 즉시 도입 후보 (5/19·5/20 회의 영역) */
export const IMMEDIATE_ROADMAP = VISION_ROADMAP.filter(r => r.priority === 'immediate')

/** 5/19 광범위 조사 reference 메모리 */
export const RESEARCH_REFERENCE = {
  memory_id: 'reference-환경장식물-광범위조사-260519',
  source_count: 8,
  search_queries: [
    'AI coding agent best practices large refactoring 2026',
    'AI agent task completion verification user signal cycle skip',
    'MICE event signage AI recommendation system Korea',
    'PyTorch Hugging Face image classification design layout AI 2026',
    'Behance Pinterest event signage banner design references Korea 2026',
    'AI signage layout generation Stable Diffusion ControlNet event poster 2026',
    'MICE event procurement automation digital transformation Korea AT center COEX 2026',
    'GitHub event signage SaaS recommendation engine open source procurement template',
  ],
}
