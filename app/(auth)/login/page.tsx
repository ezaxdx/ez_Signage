'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, LayoutGrid } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const inputClass =
  'w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setIsLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
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
          <h1 className="text-slate-100 text-lg font-semibold mb-6">로그인</h1>

          <form onSubmit={handleLogin} className="space-y-4">
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
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className={inputClass}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-900/60 rounded-lg px-3.5 py-3">
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg text-sm transition flex items-center justify-center gap-2 mt-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? '로그인 중...' : '로그인하기'}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-500 text-sm">
            계정이 없으신가요?{' '}
            <Link
              href="/signup"
              className="text-indigo-400 hover:text-indigo-300 transition font-medium"
            >
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
