'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs transition px-3 py-1.5 rounded-md hover:bg-slate-50"
    >
      <LogOut className="w-3.5 h-3.5" />
      로그아웃
    </button>
  )
}
