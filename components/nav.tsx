'use client'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Nav() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [supabase])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          CardHaus
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/marketplace" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
            Marketplace
          </Link>
          <Link href="/auctions" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
            Auctions
          </Link>
          <Link href="/graded" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
            Graded
          </Link>
          <Link href="/sealed" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
            Sealed
          </Link>
          {user ? (
            <>
              <Link
                href="/listings/new"
                className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all"
              >
                Sell a Card
              </Link>
              <Link href="/dashboard" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
                Dashboard
              </Link>
              <button
                onClick={signOut}
                className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
