'use client'

import { useState } from 'react'
import { Sparkles, ChevronRight, Wand2 } from 'lucide-react'
import { PURPOSE_PRESETS } from '@/lib/constants'

// 간단한 키워드 기반 매칭 (LLM 없이 로컬 추천)
const KEYWORD_MAP: Record<string, string[]> = {
  main_promo: ['홍보', '타이틀', '행사명', '메인', '포스터', '배너', '개막', '오픈', '타이틀배너', '주제'],
  registration: ['등록', '체크인', '접수', 'qr', '현장등록', '등록데스크', '신청', '입장'],
  wayfinding: ['안내', '방향', '길', '화살표', '호실', '동선', '입구', '출구', '웨이파인딩', '룸', '회의실', '층'],
  program_info: ['프로그램', '일정', '시간표', '스케줄', '세션', '발표', '컨퍼런스', '강연'],
  experience: ['체험', '참여', '이벤트', 'qr스캔', '부스', '실습', '부대행사', '시연'],
}

function recommendByText(text: string) {
  const lower = text.toLowerCase()
  const scores: Record<string, number> = {}
  for (const [purposeId, keywords] of Object.entries(KEYWORD_MAP)) {
    scores[purposeId] = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0)
  }
  return PURPOSE_PRESETS
    .filter(p => scores[p.id] > 0)
    .sort((a, b) => scores[b.id] - scores[a.id])
}

export function RecommenderWidget() {
  const [input, setInput] = useState('')
  const [recommended, setRecommended] = useState<typeof PURPOSE_PRESETS>([])
  const [submitted, setSubmitted] = useState(false)

  const handleRecommend = () => {
    if (!input.trim()) return
    const results = recommendByText(input)
    setRecommended(results)
    setSubmitted(true)
  }

  return (
    <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-900/40 rounded-xl p-5 mb-6">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600/30 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-indigo-300" />
        </div>
        <div>
          <p className="text-slate-800 text-sm font-semibold">상황 기반 제작물 추천</p>
          <p className="text-slate-500 text-xs mt-0.5">
            어떤 행사를 준비하는지 입력하면 적합한 제작물을 추천해드립니다
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleRecommend()}
          placeholder="예: 회의 등록데스크 안내와 프로그램 QR이 필요해요"
          className="flex-1 bg-white/70 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition"
        />
        <button
          onClick={handleRecommend}
          disabled={!input.trim()}
          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          추천
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {submitted && (
        <div className="mt-4">
          {recommended.length === 0 ? (
            <p className="text-slate-500 text-xs">
              ❓ 입력한 내용에서 특정 목적을 찾지 못했습니다. <strong className="text-slate-500">"등록", "프로그램", "안내" </strong> 같은 키워드를 포함해 다시 시도하세요.
            </p>
          ) : (
            <div>
              <p className="text-indigo-400 text-xs mb-2">추천 결과:</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {recommended.map(p => (
                  <span
                    key={p.id}
                    className="bg-indigo-900/40 border border-indigo-700/50 rounded-full px-3 py-1 text-xs text-indigo-200"
                  >
                    {p.emoji} {p.label}
                  </span>
                ))}
              </div>
              <button
                onClick={() => {
                  // localStorage에 추천 결과 저장 → NewProjectButton이 읽어서 자동 적용
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('mice_recommended_purposes', JSON.stringify(recommended.map(p => p.id)))
                    // 새 프로젝트 버튼 클릭 트리거
                    document.querySelector<HTMLButtonElement>('[data-new-project-trigger]')?.click()
                  }
                }}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
              >
                <Wand2 className="w-3.5 h-3.5" />
                이 추천으로 프로젝트 만들기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
