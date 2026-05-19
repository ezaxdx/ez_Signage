// v9.42: AI 추천 파이프라인 4 step 시각화 카드
// 데이터 소스: `lib/ai/agentPipeline.ts` (PIPELINE_BLOCK_LIST — 동일 SOT를 SYSTEM_INSTRUCTION과 공유)
// 향후 어드민 편집 UI 추가 시 PIPELINE_BLOCKS만 변경하면 프롬프트·카드 양쪽에 즉시 반영됨.

import { Layers, ShieldAlert, Calculator, Camera, FileText, Database } from 'lucide-react'
import { PIPELINE_BLOCK_LIST } from '@/lib/ai/agentPipeline'

// step num → 아이콘 매핑 (5/22 = step6 = event_history DB SOT 영역 신규)
const STEP_ICONS = {
  1: Layers,
  2: ShieldAlert,
  3: Calculator,
  4: Camera,
  5: FileText,
  6: Database,
} as const

export function AiPipelineCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <h2 className="text-slate-700 text-sm font-semibold mb-3">AI 추천 파이프라인</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {PIPELINE_BLOCK_LIST.map(step => {
          const Icon = STEP_ICONS[step.num]
          const isComing = step.status === 'coming'
          return (
            <div
              key={step.num}
              className={`relative border rounded-lg p-3 ${
                isComing
                  ? 'border-dashed border-slate-200 bg-slate-50'
                  : 'border-slate-200 bg-white'
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
                <span className="absolute top-2 right-2 text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                  —
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
