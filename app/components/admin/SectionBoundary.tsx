'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

// app/components/admin/SectionBoundary.tsx
// 학습 관리자 6 섹션 독립 ErrorBoundary (v10.4)
// 의도 (Step 0):
//   표면 = "행사장 관리 페이지 전체 로딩 안 됨"
//   진짜 = 한 섹션 fail → 페이지 전체 죽음·다른 섹션도 사용 불가
//   설계 = 섹션 단위 격리·graceful degradation

interface Props {
  sectionName: string
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class SectionBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn(`[SectionBoundary:${this.props.sectionName}] 섹션 렌더 오류`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <h3 className="text-amber-900 font-semibold text-sm">
                {this.props.sectionName} 섹션 일시 오류
              </h3>
              <p className="text-amber-800 text-xs mt-1">
                이 섹션에서 일시 오류가 발생했습니다. 다른 섹션은 계속 사용 가능합니다.
                새로고침 후 다시 시도하거나 관리자에게 문의해 주세요.
              </p>
              {this.state.error?.message && (
                <details className="mt-2">
                  <summary className="text-amber-700 text-[10px] cursor-pointer hover:text-amber-900">
                    개발자 정보 (자세히)
                  </summary>
                  <pre className="mt-1 text-[10px] bg-amber-100 rounded px-2 py-1 overflow-x-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
