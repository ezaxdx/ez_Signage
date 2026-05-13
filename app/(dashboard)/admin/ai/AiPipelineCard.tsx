// v9.39: AI 추천 파이프라인 4 step 시각화 카드
// 명세: ADMIN_REDESIGN_260513.md §1-4 (AI 환경 설정 + 흐름 시각화)
// 1) 파트 후보 → 2) 시설 가이드 제약 → 3) 표준 수량 → 4) 도면 Vision 보강

import { Layers, ShieldAlert, Calculator, Camera } from 'lucide-react'

interface PipelineStep {
  num: number
  title: string
  desc: string
  icon: typeof Layers
  status: 'active' | 'coming'
}

const STEPS: PipelineStep[] = [
  {
    num: 1,
    title: '파트 후보 추출',
    desc: '선택된 프로그램 파트 다중 → 권장 환경장식물 ID 풀',
    icon: Layers,
    status: 'active',
  },
  {
    num: 2,
    title: '시설 가이드 제약',
    desc: '행사장별 설치 불가 카테고리 후보 제외',
    icon: ShieldAlert,
    status: 'active',
  },
  {
    num: 3,
    title: '표준 수량 산정',
    desc: '행사장 시설 가이드 표준 규격·수량 적용',
    icon: Calculator,
    status: 'active',
  },
  {
    num: 4,
    title: '도면 Vision 보강',
    desc: '행사장 배치도 분석 → 동선·설치 위치 컨텍스트',
    icon: Camera,
    status: 'coming',
  },
]

export function AiPipelineCard() {
  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
      <h2 className="text-slate-700 text-sm font-semibold mb-3">AI 추천 파이프라인</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {STEPS.map(step => {
          const Icon = step.icon
          const isComing = step.status === 'coming'
          return (
            <div
              key={step.num}
              className={`relative border rounded-lg p-3 ${
                isComing
                  ? 'border-dashed border-slate-200 bg-slate-50 dark:bg-slate-900'
                  : 'border-slate-200 bg-white dark:bg-slate-950'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <span
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                    isComing
                      ? 'bg-slate-200 text-slate-500'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {step.num}
                </span>
                <Icon className={`w-3.5 h-3.5 ${isComing ? 'text-slate-400' : 'text-indigo-600'}`} />
                <span className={`text-xs font-medium ${isComing ? 'text-slate-500' : 'text-slate-900'}`}>
                  {step.title}
                </span>
              </div>
              <p className={`text-[10px] leading-snug ${isComing ? 'text-slate-400' : 'text-slate-600'}`}>
                {step.desc}
              </p>
              {isComing && (
                <span className="absolute top-2 right-2 text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                  커밍순
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
