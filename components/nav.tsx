'use client'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import SearchDropdown from './search-dropdown'

export default function Nav() {
  const [user, setUser] = useState<User | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      router.refresh()
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router, supabase])

  async function signOut() {
    setSigningOut(true)
    setUser(null)
    const { error } = await supabase.auth.signOut()
    if (error) {
      setSigningOut(false)
      return
    }
    router.refresh()
    router.replace('/')
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          CardHaus
        </Link>
        <div className="flex items-center gap-6">
          <SearchDropdown />
          <Link href="/marketplace" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
            Marketplace
          </Link>
          <Link href="/auctions" className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
            Auctions
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
                disabled={signingOut}
                className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
              >
                {signingOut ? 'Signing out...' : 'Sign out'}
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
