'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  DollarSign, AlertTriangle, Save, RefreshCw,
  Phone, Bot, Target, Bell, Sparkles, Camera, Plus, MapPin,
} from 'lucide-react'
import { AccuracyTable, type AccuracyRow } from './AccuracyTable'
import {
  PIPELINE_CARDS, PIPELINE_CARD_LIST, PERSONA_VARIABLES,
  type AiModelKey, type CardKey, type CardOverridesMap,
} from '@/lib/ai/agentPipeline'

// v9.51 (2026-05-14) — 4 step → 2 카드 통합 + 페르소나 변수 chip 삽입 (D-1 단순)
//   김연아 대리님 카톡 (보존): "관리자페이지 AI 관리에 3번 AI 투입되는 부분에서 투입되는 AI를 설정하고 페르소나를 수정"
//   ★ ′3번 AI 투입 = 표준 수량 산정′은 카드 1 (recommend) 안에 indigo highlight 박스로 시각 강조
//   2 카드:
//     1. 추천 (항상 호출) — step1·2·3 통합 (파트 후보 → 시설 제약 → 표준 수량) + 인라인 변수 chip
//     2. 도면 분석 보강 (도면 첨부 시만) — step4 단독 + {{floor_plan}} 토큰 자동 치환
//   localStorage:
//     - admin_ai_settings_v3 (신규 카드 단위)
//     - admin_ai_settings_v2 (v9.46 step 단위 — 호환 위해 보존, v3가 우선 read)
// v9.46 (2026-05-14): step별 페르소나 (v9.51에서 카드 단위로 통합됨)
// v9.43: AI 추천 파이프라인 카드는 화면에서 제거 (프롬프트 SYSTEM_INSTRUCTION 조립에만 사용)
// v9.39: KPI 3 + 카테고리 정확도 테이블 (명세 ADMIN_REDESIGN_260513.md §1-4)
// v9.47 (2026-05-14): IA SOT(김연아 대리님 노션) 정렬 — KPI 3종 라벨 변경
//   IA 목표: ① ai 추천 정확도(행사장/파트별/도면 커밍순) ② 총 API 호출 수 ③ 이상 사용자 알림
//   변경:
//     - 토큰·비용 카드 제거 → AccuracyTable의 카테고리별 평균을 ′ai 추천 정확도′ 단일 카드로 통합 (3 sub-label)
//     - ′이번 달 호출′ → ′총 API 호출 수′ 라벨 정리
//     - ′이상 사용자 알림′ 카드 신설 (admin_ai_settings의 abnormal_repeat_threshold 활용)
//   보존:
//     - 토큰·비용 상세 통계는 하단 ′상세 사용량′ + ′예산 사용률′ 영역으로 이동 (예산 임계 경고 연계 유지)
//     - AccuracyTable 본체는 KPI 카드 아래에 그대로 노출 (카테고리별 상세)
// v9.48 (2026-05-14): UI 중복·코드 메타 노출 정리 (사용자 명시 — 조기흠 사원, AXDX팀)
//   문제: ′AI 환경 설정′(전역 폼) + ′AI 추천 파이프라인 step별 페르소나 설정′이 모델·Temperature·system_prompt를
//        중복 노출 → "이게 뭐가 다른데?" 의문 + 코드 메타(`agentPipeline.ts`·`localStorage(admin_ai_settings_v2)`·
//        `admin_ai_settings 테이블`·`/projects/new/case-a` 등) UI 노출 = ′응?′ 룰 위반.
//   변경:
//     1) step별 폼 위 amber 안내 + AI 환경 설정 아래 footer 삭제 (코드 메타 제거)
//     2) 전역 폼 슬림화: 모델·Temperature·시스템 프롬프트 입력칸 제거 → step별 폼으로 일원화.
//        제목 ′AI 환경 설정′ → ′운영 설정 — 호출 한도·예산′. 최대 출력 토큰·월 예산·이상 사용자 임계값 3개만 유지.
//     3) step별 폼 라벨 친절화: ′현 사이클은 Gemini만 활성′ → ′현재 Gemini 사용 중′,
//        ′기본 본문:′ → ′기본 동작:′, ′비우면 기본 본문 사용′ → ′비워두면 기본 동작 그대로′
//   보존: AiPipelineCard.tsx · v9.46 step 페르소나 본체 · DB 스키마 0건 · 의존성 0건.
//   fallback: recommendSignage.ts에서 step별 오버라이드 비면 PIPELINE_BLOCKS 기본 동작으로 자동 fallback.
// v9.48-C (2026-05-14): step별 페르소나 안내 박스 한 줄로 단순화 — MapPin 1줄 박스
//   v9.51에서 카드 단위로 통합되며 박스도 1줄 형태(′적용 위치: 새 프로젝트 만들기 → AI 추천 받기′)로 보존.
// v9.52 (2026-05-14): 카드 안 부연·강조 텍스트 5건 삭제 (조기흠 사원 명시 — ′응? 금지′ + ′내부 경로 금지′ 룰)
//   ① 카드 1 안 indigo highlight 박스 (★ 표준 수량 산정 = 김연아 대리님 명시 ′3번 AI 투입′) 전체 삭제
//   ② 카드 1 안 안내 ′이 카드 안의 페르소나가 ... 표준 수량 산정에도 동일 적용′ 삭제 (① 박스에 포함되어 함께 제거)
//   ③ 카드 1 안내 ′이 페르소나는 추천 흐름 1번의 Gemini 호출에 사용됩니다. 파트 후보 추출 → 시설 제약 → 표준 수량 산정 ...′ 삭제
//      → agentPipeline.ts PIPELINE_CARDS.recommend.notice = '' 로 처리, AdminAiClient는 notice 비었으면 <p> 렌더 스킵.
//   ④ 카드 1 안 두 번째 indigo highlight 중복 박스 삭제 (① 통합 처리)
//   ⑤ 카드 2 안 안내 ′분석 결과는 추천 호출의 [보강] 절로 자동 합쳐져 location 필드 정확도를 올립니다.′ 삭제
//      → agentPipeline.ts PIPELINE_CARDS.floor_plan_vision.notice = '' 로 처리.
//   보존: 카드 헤더 title + ′항상 호출 / 도면 첨부 시만′ 배지 + 모델 select + Temperature + 변수 chip 패널 + 페르소나 textarea
//        + ′📍 적용 위치: 새 프로젝트 만들기 → AI 추천 받기′ 1줄 박스 (v9.48-C, 카드 위)
//        + v9.46 페르소나 본체 + v9.51 cardOverrides 흐름 + AiPipelineCard.tsx 미삭제 (사용자 명시 보존 조건)
//   ′3번 AI 투입′ 의미는 페르소나 textarea 안 ′기본 동작:′ 본문에서 ′3순위: 행사장 시설 가이드 표준 수량′ 텍스트로
//   노출되므로 박스 없어도 의미 전달 가능 (조기흠 사원 5/14 명시).

interface Stats {
  todayCalls: number
  monthCalls: number
  todayTokens: number
  monthTokens: number
  todayCostUsd: number
  monthCostUsd: number
  todayCostKrw: number
  monthCostKrw: number
}
interface DailyTrend { date: string; count: number }
interface AbnormalUser { user_id: string; project_id: string; count: number }

// v9.47: KPI 카드용 정확도 요약 (행사장 평균·파트별 평균은 동일 데이터에서 추출)
interface AccuracySummary {
  venue_avg: number | null      // 행사장(외벽·천정·게이트·가로등 등 6대 카테고리 평균)
  part_avg: number | null       // 파트별 평균 (현 사이클은 venue와 동일 데이터, 향후 분리 예정)
  floor_plan_status: string     // ′커밍순′ 고정 — 도면 Vision 학습 미가동
}

interface Props {
  accuracySummary: AccuracySummary
  totalApiCalls: number
  accuracyRows: AccuracyRow[]
  stats: Stats
  dailyTrend: DailyTrend[]
  abnormalUsers: AbnormalUser[]
}

const SETTINGS_KEY = 'admin_ai_settings_v1'
// v9.46 — step별 페르소나 설정 (v9.51에선 카드로 통합됐지만 호환 위해 보존)
const STEP_SETTINGS_KEY_V2 = 'admin_ai_settings_v2'
// v9.51 — 카드별 페르소나 설정 (신규)
const CARD_SETTINGS_KEY = 'admin_ai_settings_v3'

// v9.48 (2026-05-14): 운영 설정으로 슬림화 — 모델·Temperature·시스템 프롬프트는
//   step별 페르소나 설정(STEP_SETTINGS_KEY)으로 일원화. 전역 폼은 호출 한도·예산·알림 임계값만 관리.
//   recommendSignage.ts는 step별 오버라이드가 비면 PIPELINE_BLOCKS의 기본 동작으로 자동 fallback.
interface AiSettings {
  max_output_tokens: number
  budget_monthly_usd: number          // 월 예산 한도 ($)
  abnormal_repeat_threshold: number   // 이상 사용자 알림 임계값 (회)
}

const DEFAULT_SETTINGS: AiSettings = {
  max_output_tokens: 8000,
  budget_monthly_usd: 50,
  abnormal_repeat_threshold: 5,
}

// ── v9.51: 카드별 페르소나 설정 (4 step → 2 카드 통합) ──────────────────
// 김연아 대리님 카톡 명시: "3번 AI 투입되는 부분" — 카드 1(추천) 내부 ′표준 수량 산정′ 영역에 indigo highlight.
// 2 카드 모두 동일 구조 + 모델 select 6종 (Gemini Flash/Pro · GPT-4o/4o-mini · Claude Sonnet 2종).
// 현 사이클은 Gemini만 실제 호출 (의존성 추가 금지). 그 외 모델은 메타정보로 저장 → 후속 사이클 어댑터 도입 시 활성.

interface CardPersonaForm {
  model: AiModelKey
  temperature: number
  system_prompt: string
}
type CardSettingsForm = Record<CardKey, CardPersonaForm>

const MODEL_OPTIONS: Array<{ value: AiModelKey; label: string; available: boolean }> = [
  { value: 'gemini-2.5-flash',     label: 'Gemini 2.5 Flash (현재 기본)', available: true },
  { value: 'gemini-2.5-pro',       label: 'Gemini 2.5 Pro (정확)',         available: true },
  { value: 'gpt-4o',               label: 'GPT-4o (후속 사이클 활성 예정)', available: false },
  { value: 'gpt-4o-mini',          label: 'GPT-4o mini (후속 사이클)',      available: false },
  { value: 'claude-3-5-sonnet',    label: 'Claude 3.5 Sonnet (후속 사이클)', available: false },
  { value: 'claude-3-7-sonnet',    label: 'Claude 3.7 Sonnet (후속 사이클)', available: false },
]

const CARD_ICONS: Record<CardKey, React.ComponentType<{ className?: string }>> = {
  recommend: Sparkles,
  floor_plan_vision: Camera,
}

const DEFAULT_CARD_SETTINGS: CardSettingsForm = {
  recommend:         { model: 'gemini-2.5-flash', temperature: 0.4, system_prompt: '' },
  floor_plan_vision: { model: 'gemini-2.5-flash', temperature: 0.4, system_prompt: '' },
}

export function AdminAiClient({ accuracySummary, totalApiCalls, accuracyRows, stats, dailyTrend, abnormalUsers }: Props) {
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_SETTINGS)
  const [savedMsg, setSavedMsg] = useState('')
  // v9.51 — 카드별 페르소나 설정 (2 카드: 추천 / 도면 분석 보강)
  const [cardSettings, setCardSettings] = useState<CardSettingsForm>(DEFAULT_CARD_SETTINGS)
  const [cardSavedMsg, setCardSavedMsg] = useState('')

  // textarea ref — 변수 chip 삽입 시 커서 위치에 토큰 삽입
  const textareaRefs = useRef<Record<CardKey, HTMLTextAreaElement | null>>({
    recommend: null,
    floor_plan_vision: null,
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) })
    } catch { /* ignore */ }
    // v9.51 카드 설정(v3) 우선, 없으면 v2(step) 마이그레이션 시도
    try {
      const raw3 = localStorage.getItem(CARD_SETTINGS_KEY)
      if (raw3) {
        const parsed = JSON.parse(raw3) as Partial<CardSettingsForm>
        const merged: CardSettingsForm = { ...DEFAULT_CARD_SETTINGS }
        for (const k of ['recommend', 'floor_plan_vision'] as const) {
          if (parsed[k]) merged[k] = { ...DEFAULT_CARD_SETTINGS[k], ...parsed[k] }
        }
        setCardSettings(merged)
        return
      }
      // v2 호환: step1·2·3 페르소나 중 가장 긴 것을 recommend 카드로, step4를 도면 카드로 마이그레이션
      const raw2 = localStorage.getItem(STEP_SETTINGS_KEY_V2)
      if (raw2) {
        type LegacyStep = { model?: AiModelKey; temperature?: number; system_prompt?: string }
        const parsed = JSON.parse(raw2) as Partial<Record<'step1' | 'step2' | 'step3' | 'step4', LegacyStep>>
        const candidates = (['step1', 'step2', 'step3'] as const)
          .map(k => parsed[k])
          .filter((s): s is LegacyStep => !!s && (s.system_prompt ?? '').trim().length > 0)
          .sort((a, b) => (b.system_prompt ?? '').length - (a.system_prompt ?? '').length)
        const recommendSeed = candidates[0]
        const visionSeed = parsed.step4
        const migrated: CardSettingsForm = { ...DEFAULT_CARD_SETTINGS }
        if (recommendSeed) {
          migrated.recommend = {
            model: recommendSeed.model ?? 'gemini-2.5-flash',
            temperature: typeof recommendSeed.temperature === 'number' ? recommendSeed.temperature : 0.4,
            system_prompt: recommendSeed.system_prompt ?? '',
          }
        }
        if (visionSeed) {
          migrated.floor_plan_vision = {
            model: visionSeed.model ?? 'gemini-2.5-flash',
            temperature: typeof visionSeed.temperature === 'number' ? visionSeed.temperature : 0.4,
            system_prompt: visionSeed.system_prompt ?? '',
          }
        }
        setCardSettings(migrated)
      }
    } catch { /* ignore */ }
  }, [])

  const saveSettings = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    setSavedMsg('저장됨')
    setTimeout(() => setSavedMsg(''), 2500)
  }

  const resetSettings = () => {
    if (!confirm('기본값으로 되돌립니까?')) return
    setSettings(DEFAULT_SETTINGS)
    localStorage.removeItem(SETTINGS_KEY)
  }

  const updateCard = (k: CardKey, patch: Partial<CardPersonaForm>) => {
    setCardSettings(prev => ({ ...prev, [k]: { ...prev[k], ...patch } }))
  }

  const saveCardSettings = () => {
    localStorage.setItem(CARD_SETTINGS_KEY, JSON.stringify(cardSettings))
    setCardSavedMsg('저장됨 — 다음 추천부터 적용')
    setTimeout(() => setCardSavedMsg(''), 3000)
  }

  const resetCardSettings = () => {
    if (!confirm('카드별 페르소나 설정을 모두 비웁니까? (기본 파이프라인 동작으로 복귀)')) return
    setCardSettings(DEFAULT_CARD_SETTINGS)
    localStorage.removeItem(CARD_SETTINGS_KEY)
    // v2 키도 비움 — 마이그레이션 잔재 제거
    try { localStorage.removeItem(STEP_SETTINGS_KEY_V2) } catch { /* ignore */ }
  }

  /** 변수 chip 삽입 — 커서 위치에 토큰 끼워 넣기 (D-1 단순 적용) */
  const insertVariable = (cardKey: CardKey, token: string) => {
    const el = textareaRefs.current[cardKey]
    const cur = cardSettings[cardKey].system_prompt
    if (!el) {
      // ref 미설정 시 끝에 추가
      updateCard(cardKey, { system_prompt: cur + (cur.length > 0 && !cur.endsWith(' ') ? ' ' : '') + token + ' ' })
      return
    }
    const start = el.selectionStart ?? cur.length
    const end = el.selectionEnd ?? cur.length
    const before = cur.slice(0, start)
    const after = cur.slice(end)
    const next = before + token + after
    updateCard(cardKey, { system_prompt: next })
    // 커서를 토큰 뒤로 이동
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + token.length
      el.setSelectionRange(pos, pos)
    })
  }

  // 변환: 화면 cardSettings → API 전달용 CardOverridesMap (참고용 — case-a에서 동일 변환)
  const _previewOverrides: CardOverridesMap = {}
  for (const k of ['recommend', 'floor_plan_vision'] as const) {
    const s = cardSettings[k]
    const prompt = (s.system_prompt ?? '').trim()
    if (prompt.length > 0 || s.temperature !== 0.4 || s.model !== 'gemini-2.5-flash') {
      _previewOverrides[k] = {
        model: s.model,
        temperature: s.temperature,
        system_prompt: prompt || undefined,
      }
    }
  }
  void _previewOverrides // 미사용 경고 회피 (디버그용 보존)

  // 예산 사용률
  const budgetUsage = settings.budget_monthly_usd === 0 ? 0
    : Math.min(100, Math.round((stats.monthCostUsd / settings.budget_monthly_usd) * 100))
  const budgetWarn = budgetUsage >= 80
  const maxDaily = Math.max(1, ...dailyTrend.map(d => d.count))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* v9.33: 헤더 인라인 nav 제거 — 글로벌 좌측 사이드바(AdminSidebar)로 일원화 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* v9.39 명세 매칭: 좌상단 페이지 타이틀 */}
        <h1 className="text-slate-900 text-xl font-bold">AI 관리</h1>

        {/* ── v9.47: IA SOT 정렬 — KPI 3카드 ─────────────────────────── */}
        {/* IA 목표: ai 추천 정확도(행사장/파트별/도면 커밍순) / 총 API 호출 수 / 이상 사용자 알림 */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* ① ai 추천 정확도 — 3 sub-label (행사장 / 파트별 / 도면) */}
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-4 shadow-sm">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-2">
                <Target className="w-4 h-4" />
                <span>ai 추천 정확도</span>
              </div>
              <div className="space-y-1.5">
                <AccuracyRowMini label="행사장" value={accuracySummary.venue_avg} />
                <AccuracyRowMini label="파트별" value={accuracySummary.part_avg} />
                <AccuracyRowMini label="도면" value={null} note={accuracySummary.floor_plan_status} />
              </div>
            </div>

            {/* ② 총 API 호출 수 — 누적 카운트 */}
            <Kpi3Card
              icon={<Phone className="w-4 h-4" />}
              label="총 API 호출 수"
              value={totalApiCalls > 0 ? `${totalApiCalls.toLocaleString()}회` : '—'}
              color="text-indigo-600"
            />

            {/* ③ 이상 사용자 알림 — 임계값 초과 사용자 카운트 */}
            <Kpi3Card
              icon={<Bell className={`w-4 h-4 ${abnormalUsers.length > 0 ? 'text-rose-600' : ''}`} />}
              label="이상 사용자 알림"
              value={abnormalUsers.length > 0 ? `${abnormalUsers.length}명` : '0명'}
              color={abnormalUsers.length > 0 ? 'text-rose-600' : 'text-slate-700'}
            />
          </div>
        </section>

        {/* ── v9.43: AI 추천 파이프라인 카드 제거 — 프롬프트(SYSTEM_INSTRUCTION) 조립에만 사용 ── */}

        {/* ── v9.39: 카테고리별 정확도 테이블 (도면 학습 = 커밍순) ── */}
        <AccuracyTable rows={accuracyRows} />

        {/* ── v9.51: AI 추천 파이프라인 — 2 카드 통합 + 페르소나 인라인 변수 chip ──────── */}
        {/* 김연아 대리님 카톡 (보존): "관리자페이지 AI 관리에 3번 AI 투입되는 부분에서 투입되는 AI를 설정하고 페르소나를 수정"
            ★ ′3번 AI 투입 = 표준 수량 산정′은 카드 1(추천) 안에 indigo highlight 박스로 시각 강조.
            카드 1 (recommend, 항상 호출): step1·2·3 통합 — 파트 후보 → 시설 제약 → 표준 수량
            카드 2 (floor_plan_vision, 도면 첨부 시만): step4 단독 — 도면 Vision 보강 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-700" />
              <h2 className="text-slate-700 text-sm font-semibold">AI 추천 파이프라인 — 카드별 페르소나 설정</h2>
            </div>
            <div className="flex items-center gap-2">
              {cardSavedMsg && <span className="text-emerald-600 text-xs">{cardSavedMsg}</span>}
              <button onClick={resetCardSettings} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> 비우기
              </button>
              <button onClick={saveCardSettings} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-md flex items-center gap-1">
                <Save className="w-3 h-3" /> 카드 설정 저장
              </button>
            </div>
          </div>

          {/* v9.48-C 단순화: 조기흠 사원 명시 — "박스 안내는 간단하게 사용되는 부분만".
              v9.51에서 4 step → 2 카드 통합 후에도 1줄 박스 형태 유지. */}
          <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mb-4 text-sm text-slate-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-700 shrink-0" />
            <span><span className="font-semibold text-indigo-700">적용 위치:</span> 새 프로젝트 만들기 → AI 추천 받기</span>
          </div>

          <div className="space-y-4">
            {PIPELINE_CARD_LIST.map(card => {
              const Icon = CARD_ICONS[card.key]
              const cur = cardSettings[card.key]
              const isAlways = card.trigger === 'always'
              // 이 카드에서 사용 가능한 변수 chip (cardScope null 또는 카드 키와 일치)
              const usableVars = PERSONA_VARIABLES.filter(v => !v.cardScope || v.cardScope === card.key)
              return (
                <div
                  key={card.key}
                  className={`bg-white border rounded-xl p-4 ${isAlways ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-slate-200'}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isAlways ? 'text-indigo-600' : 'text-slate-600'}`} />
                      <span className="text-sm font-semibold text-slate-900">{card.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${isAlways ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isAlways ? '항상 호출' : '도면 첨부 시만'}
                      </span>
                    </div>
                  </div>
                  {/* v9.52: card.notice 비었으면 <p> 렌더 스킵 (부연 안내문 5건 삭제 — ′응? 금지′ + ′내부 경로 금지′ 룰) */}
                  {card.notice && (
                    <p className="text-[11px] text-slate-500 mb-3 whitespace-pre-line">{card.notice}</p>
                  )}

                  {/* v9.52: indigo highlight 박스 (★ 표준 수량 산정 = 김연아 대리님 명시 ′3번 AI 투입′ 영역) 삭제.
                      ′3번 AI 투입′ 의미는 페르소나 textarea 안 ′기본 동작:′ 본문에서 ′3순위: 행사장 시설 가이드 표준 수량′
                      텍스트로 노출되므로 박스 없어도 의미 전달 가능 (조기흠 사원 5/14 명시). */}

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <Field label="모델" hint="현재 Gemini 사용 중">
                      <select
                        value={cur.model}
                        onChange={e => updateCard(card.key, { model: e.target.value as AiModelKey })}
                        className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5"
                      >
                        {MODEL_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}{!opt.available ? ' ⚠' : ''}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Temperature" hint="0.0~1.0 (낮을수록 일관)">
                      <input
                        type="number" min={0} max={1} step={0.05}
                        value={cur.temperature}
                        onChange={e => updateCard(card.key, { temperature: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5"
                      />
                    </Field>
                  </div>

                  {/* 변수 chip 패널 (D-1 단순 — 클릭 시 textarea 커서 위치에 토큰 삽입) */}
                  <div className="mb-2">
                    <p className="text-[10px] text-slate-500 mb-1.5 flex items-center gap-1">
                      <Plus className="w-2.5 h-2.5" />
                      <span>변수 삽입 (커서 위치에 토큰이 추가됩니다)</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {usableVars.map(v => (
                        <button
                          key={v.token}
                          type="button"
                          onClick={() => insertVariable(card.key, v.token)}
                          title={`${v.hint}\n토큰: ${v.token}`}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] hover:opacity-80 ${v.color}`}
                        >
                          <span>{v.label}</span>
                          <code className="text-[9px] opacity-70 font-mono">{v.token}</code>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Field label="페르소나" hint="비워두면 기본 동작 그대로. 변수 토큰은 추천 호출 시점에 실제 데이터로 치환됩니다.">
                    <textarea
                      ref={el => { textareaRefs.current[card.key] = el }}
                      rows={6}
                      placeholder={`예시:\n당신은 ${card.title.replace(/\s*\(.*\)\s*/, '')} 전문가입니다.\n행사 장소 {{venue}}, 선택 파트 {{parts}}를 기반으로 추천을 작성하세요.`}
                      value={cur.system_prompt}
                      onChange={e => updateCard(card.key, { system_prompt: e.target.value })}
                      className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 font-mono leading-relaxed"
                    />
                  </Field>
                </div>
              )
            })}
          </div>

        </section>

        {/* ── v9.27 보존: 일별 상세 사용량 4카드 (오늘/이번 달 호출·비용) ── */}
        <section>
          <h2 className="text-slate-700 text-sm font-semibold mb-3">상세 사용량</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <UsageCard label="오늘 호출" value={stats.todayCalls} unit="회" sub={`토큰 ${stats.todayTokens.toLocaleString()}`} color="text-indigo-600" />
            <UsageCard label="이번 달 호출" value={stats.monthCalls} unit="회" sub={`토큰 ${stats.monthTokens.toLocaleString()}`} color="text-blue-600" />
            <UsageCard label="오늘 비용" value={`$${stats.todayCostUsd.toFixed(4)}`} unit="" sub={`₩${Math.round(stats.todayCostKrw).toLocaleString()}`} color="text-amber-600" />
            <UsageCard label="이번 달 비용" value={`$${stats.monthCostUsd.toFixed(4)}`} unit="" sub={`₩${Math.round(stats.monthCostKrw).toLocaleString()}`} color="text-emerald-600" />
          </div>
        </section>

        {/* ── 예산 한도 + 진행 바 ──────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-slate-700" />
            <h2 className="text-slate-700 text-sm font-semibold">월 예산 사용률</h2>
          </div>
          <div className={`bg-white border rounded-xl p-4 ${budgetWarn ? 'border-amber-300' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-700">
                ${stats.monthCostUsd.toFixed(4)} / ${settings.budget_monthly_usd}
              </span>
              <span className={`font-medium ${budgetWarn ? 'text-amber-700' : 'text-slate-700'}`}>{budgetUsage}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${budgetUsage >= 100 ? 'bg-rose-500' : budgetUsage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${budgetUsage}%` }} />
            </div>
            {budgetWarn && (
              <div className="mt-2 text-xs text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                예산 임계값(80%) 도달. 사용량 점검 권장.
              </div>
            )}
          </div>
        </section>

        {/* ── 일자별 추이 (최근 30일) ─────────────────── */}
        <section>
          <h2 className="text-slate-700 text-sm font-semibold mb-3">최근 30일 호출 추이</h2>
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-end gap-0.5 h-32">
              {dailyTrend.map(d => {
                const ratio = d.count / maxDaily
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center" title={`${d.date}: ${d.count}회`}>
                    <div
                      className="w-full bg-indigo-400 rounded-t-sm hover:bg-indigo-600 transition"
                      style={{ height: `${ratio * 100}%`, minHeight: d.count > 0 ? '2px' : 0 }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
              <span>{dailyTrend[0]?.date}</span>
              <span>{dailyTrend[dailyTrend.length - 1]?.date}</span>
            </div>
          </div>
        </section>

        {/* ── 이상 사용자 알림 ───────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h2 className="text-slate-700 text-sm font-semibold">이상 사용자 알림</h2>
            </div>
            <span className="text-[10px] text-slate-500">
              임계값: 동일 프로젝트 {settings.abnormal_repeat_threshold}회 이상 재호출
            </span>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {abnormalUsers.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">현재 이상 사용 사례 없음</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium border-b">사용자 ID</th>
                    <th className="px-3 py-2 text-left font-medium border-b">프로젝트 ID</th>
                    <th className="px-3 py-2 text-left font-medium border-b">호출 횟수</th>
                  </tr>
                </thead>
                <tbody>
                  {abnormalUsers.map((u, i) => (
                    <tr key={`${u.user_id}-${u.project_id}-${i}`} className="hover:bg-slate-50 border-b border-slate-100">
                      <td className="px-3 py-2 font-mono text-[10px]">{u.user_id.slice(0, 8)}…</td>
                      <td className="px-3 py-2 font-mono text-[10px]">
                        <Link href={`/projects/${u.project_id}`} className="text-indigo-600 hover:underline">{u.project_id.slice(0, 8)}…</Link>
                      </td>
                      <td className="px-3 py-2 font-medium text-rose-600">{u.count}회</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* ── 운영 설정 — 호출 한도·예산·알림 (v9.48 슬림화) ────────── */}
        {/* 모델·Temperature·시스템 프롬프트는 위의 step별 페르소나 설정으로 일원화. */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-700 text-sm font-semibold">운영 설정 — 호출 한도·예산</h2>
            <div className="flex items-center gap-2">
              {savedMsg && <span className="text-emerald-600 text-xs">{savedMsg}</span>}
              <button onClick={resetSettings} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> 기본값
              </button>
              <button onClick={saveSettings} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-md flex items-center gap-1">
                <Save className="w-3 h-3" /> 저장
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="최대 출력 토큰" hint="응답 길이 상한">
                <input
                  type="number" min={1000} max={32000} step={1000}
                  value={settings.max_output_tokens}
                  onChange={e => setSettings(s => ({ ...s, max_output_tokens: parseInt(e.target.value) || 8000 }))}
                  className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5"
                />
              </Field>

              <Field label="월 예산 한도 ($)" hint="초과 시 알림 표시">
                <input
                  type="number" min={0} step={1}
                  value={settings.budget_monthly_usd}
                  onChange={e => setSettings(s => ({ ...s, budget_monthly_usd: parseFloat(e.target.value) || 0 }))}
                  className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5"
                />
              </Field>

              <Field label="이상 사용자 임계값 (회)" hint="동일 프로젝트 N회 이상 재호출 시 알림">
                <input
                  type="number" min={2} max={50} step={1}
                  value={settings.abnormal_repeat_threshold}
                  onChange={e => setSettings(s => ({ ...s, abnormal_repeat_threshold: parseInt(e.target.value) || 5 }))}
                  className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5"
                />
              </Field>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}

function Kpi3Card({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1.5">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

// v9.47: ai 추천 정확도 카드 내부 행 (3 sub-label용)
function AccuracyRowMini({ label, value, note }: { label: string; value: number | null; note?: string }) {
  const color =
    value === null ? 'text-slate-400'
    : value >= 70 ? 'text-emerald-600'
    : value >= 50 ? 'text-amber-600'
    : 'text-rose-600'
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-600">{label}</span>
      <span className={`font-semibold ${color}`}>
        {value === null ? (note ?? '—') : `${value}%`}
      </span>
    </div>
  )
}

function UsageCard({ label, value, unit, sub, color }: { label: string; value: number | string; unit: string; sub: string; color: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-3 shadow-sm">
      <p className="text-slate-500 text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>
        {value}{unit && <span className="text-sm font-normal ml-0.5 text-slate-400">{unit}</span>}
      </p>
      <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-700">{label}</span>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
