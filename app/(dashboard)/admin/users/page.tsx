import Link from 'next/link'
import { Lock, ArrowLeft } from 'lucide-react'

export const metadata = { title: '유저 관리 (준비 중) | 제작물 리스트 가이드' }

// v9.28: 유저 관리 접근 차단 (사용자 피드백 ② 반영)
// — 구현은 보존, 라우트만 비활성. 데이터허브 연동 결정 후 활성 예정.
// — 사용자 퍼널 분석 영역으로 활용 검토 중 (자리잡기 화면)
// v9.33: 인증 가드는 부모 layout(AdminLayout)에서 수행. 헤더 nav 제거 (글로벌 사이드바로 일원화).
export default async function AdminUsersBlockedPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
            <Lock className="w-7 h-7 text-slate-500" />
          </div>
          <h1 className="text-slate-900 text-xl font-bold mb-3">유저 관리 — 준비 중</h1>
          <p className="text-slate-600 text-sm leading-relaxed mb-6 max-w-md mx-auto">
            데이터허브 SSO 연동 정책 확정 전까지 본 영역의 접근이 일시 차단되어 있습니다.
            구현 코드는 보존되며, 연동 결정 후 즉시 재활성화됩니다.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-left text-xs space-y-2 mb-6">
            <p className="font-medium text-slate-700">예정 기능</p>
            <ul className="space-y-1.5 text-slate-600 list-disc list-inside pl-1">
              <li>활동 사용자 목록 + 권한 단계(일반/관리자)</li>
              <li>사내 SSO 자동 매핑 (데이터허브 AI 게이트 연동)</li>
              <li>사용자 퍼널 분석 (접속·생성·완료 전환율)</li>
              <li>접근 권한 매트릭스 편집</li>
            </ul>
          </div>

          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-md"
          >
            <ArrowLeft className="w-4 h-4" /> 운영 대시보드로 돌아가기
          </Link>

          <p className="text-[10px] text-slate-400 mt-4">
            ※ 본 화면 = 사용자 피드백 ② 반영 — 구현 보존 + 접근 차단 (v9.28).
          </p>
        </div>
      </main>
    </div>
  )
}
