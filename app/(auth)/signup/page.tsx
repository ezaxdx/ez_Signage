'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, LayoutGrid, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const inputClass =
  'w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full text-center animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-slate-100 font-semibold text-lg mb-2">이메일을 확인해주세요</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            <span className="text-slate-200">{email}</span>으로<br />
            인증 링크를 발송했습니다.
          </p>
          <Link
            href="/login"
            className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2.5 rounded-lg transition text-center"
          >
            로그인 페이지로 이동
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-grid absolute inset-0" />

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* 브랜드 */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center glow-indigo">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <span className="text-slate-100 font-bold text-lg tracking-tight">제작물 리스트 가이드</span>
          </div>
          <p className="text-slate-500 text-sm">환경장식물 리스트 추천·발주 자동화</p>
        </div>

        {/* 카드 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <h1 className="text-slate-100 text-lg font-semibold mb-6">회원가입</h1>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                autoComplete="name"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                autoComplete="email"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8자 이상"
                required
                autoComplete="new-password"
                className={inputClass}
              />
            </div>

            {error && (
              <div className="bg-red-950/40 border border-red-900/60 rounded-lg px-3.5 py-3">
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg text-sm transition flex items-center justify-center gap-2 mt-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? '가입 중...' : '계정 만들기'}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-500 text-sm">
            이미 계정이 있으신가요?{' '}
            <Link
              href="/login"
              className="text-indigo-400 hover:text-indigo-300 transition font-medium"
            >
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
