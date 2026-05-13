'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Activity, Brain, DollarSign, AlertTriangle, Save, RefreshCw,
  Users, GraduationCap, Database
} from 'lucide-react'

// v9.27: 관리자가 AI 환경을 설정할 수 있는 영역 (사용자 피드백 ③)
// — 모델·프롬프트·임계값을 관리자가 직접 설정. 1차는 localStorage 저장,
//   다음 사이클에 admin_ai_settings 테이블로 영구화.

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

interface Props {
  stats: Stats
  dailyTrend: DailyTrend[]
  abnormalUsers: AbnormalUser[]
}

const SETTINGS_KEY = 'admin_ai_settings_v1'

interface AiSettings {
  model: 'gemini-2.5-flash' | 'gemini-2.5-pro'
  temperature: number
  max_output_tokens: number
  budget_monthly_usd: number          // 월 예산 한도 ($)
  abnormal_repeat_threshold: number   // 이상 사용자 알림 임계값 (회)
  system_prompt: string
}

const DEFAULT_SETTINGS: AiSettings = {
  model: 'gemini-2.5-flash',
  temperature: 0.4,
  max_output_tokens: 8000,
  budget_monthly_usd: 50,
  abnormal_repeat_threshold: 5,
  system_prompt: `당신은 MICE 환경장식물 발주 전문가입니다.
주어진 행사 정보 + 학습 데이터 + 시설 가이드를 기반으로
표준 카테고리(외벽·게이트·가로등·X배너·천정·부속시설)별 추천 리스트를 JSON으로 응답하세요.
학습 데이터에 없는 카테고리는 "[추천 없음 — 학습 데이터 부재]"로 명시.`,
}

export function AdminAiClient({ stats, dailyTrend, abnormalUsers }: Props) {
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_SETTINGS)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) })
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

  // 예산 사용률
  const budgetUsage = settings.budget_monthly_usd === 0 ? 0
    : Math.min(100, Math.round((stats.monthCostUsd / settings.budget_monthly_usd) * 100))
  const budgetWarn = budgetUsage >= 80
  const maxDaily = Math.max(1, ...dailyTrend.map(d => d.count))

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="text-slate-900 font-semibold text-sm tracking-tight">
              관리자 페이지 — AI 관리
            </span>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/dashboard" className="text-slate-700 hover:text-indigo-600 text-xs">내 프로젝트</Link>
            <div className="w-px h-4 bg-slate-200" />
            <Link href="/admin" className="text-slate-500 hover:text-indigo-600 text-xs flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> 운영 대시보드
            </Link>
            <Link href="/admin/ai" className="text-indigo-600 font-medium text-xs flex items-center gap-1">
              <Brain className="w-3.5 h-3.5" /> AI 관리
            </Link>
            <Link href="/admin/users" className="text-slate-400 cursor-not-allowed text-xs flex items-center gap-1" title="접근 차단 — 데이터허브 연동 결정 전">
              <Users className="w-3.5 h-3.5" /> 유저 관리
            </Link>
            <Link href="/admin/learning" className="text-slate-500 hover:text-indigo-600 text-xs flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" /> 데이터 학습
            </Link>
            <Link href="/data" className="text-slate-400 hover:text-indigo-600 text-xs flex items-center gap-1">
              <Database className="w-3.5 h-3.5" /> 분석 자료
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-slate-900 text-xl font-bold">AI 관리</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Gemini API 사용량·비용·이상 알림 + 모델·프롬프트·임계값 환경 설정
          </p>
        </div>

        {/* ── 사용량 KPI 4카드 ──────────────────────────── */}
        <section>
          <h2 className="text-slate-700 text-sm font-semibold mb-3">Gemini API 사용량</h2>
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

        {/* ── AI 환경 설정 (관리자 직접 수정) ────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-700 text-sm font-semibold">AI 환경 설정</h2>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="모델" hint="추론 정확도·속도 트레이드오프">
                <select
                  value={settings.model}
                  onChange={e => setSettings(s => ({ ...s, model: e.target.value as AiSettings['model'] }))}
                  className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (빠름, 권장)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro (정확)</option>
                </select>
              </Field>

              <Field label="Temperature" hint="0.0 ~ 1.0 (낮을수록 일관성)">
                <input
                  type="number" min={0} max={1} step={0.05}
                  value={settings.temperature}
                  onChange={e => setSettings(s => ({ ...s, temperature: parseFloat(e.target.value) || 0 }))}
                  className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5"
                />
              </Field>

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

            <Field label="시스템 프롬프트" hint="추천 모듈에 항상 prepend 되는 베이스 지시문">
              <textarea
                rows={6}
                value={settings.system_prompt}
                onChange={e => setSettings(s => ({ ...s, system_prompt: e.target.value }))}
                className="w-full text-xs border border-slate-200 rounded-md px-2 py-1.5 font-mono"
              />
            </Field>

            <p className="text-[10px] text-slate-400">
              ※ 현재 설정은 브라우저(localStorage)에 저장됩니다. 다음 사이클에서 admin_ai_settings 테이블로 영구화 예정.
            </p>
          </div>
        </section>

      </main>
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
