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
    <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
      <Link href="/" className="text-xl font-bold text-blue-600">CardHaus</Link>
      <div className="flex items-center gap-4">
        <Link href="/marketplace" className="text-sm hover:text-blue-600">Marketplace</Link>
        <Link href="/auctions" className="text-sm hover:text-blue-600">Auctions</Link>
        {user ? (
          <>
            <Link href="/listings/new" className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">Sell a Card</Link>
            <Link href="/dashboard" className="text-sm hover:text-blue-600">Dashboard</Link>
            <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-800">Sign out</button>
          </>
        ) : (
          <>
            <Link href="/auth/login" className="text-sm hover:text-blue-600">Sign in</Link>
            <Link href="/auth/signup" className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  )
}
