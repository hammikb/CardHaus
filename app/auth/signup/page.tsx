'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    if (!data.session) {
      setError('Account created. Check your email to confirm your account before signing in.')
      setLoading(false)
      return
    }
    router.refresh()
    router.replace('/marketplace')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            CardHaus
          </h1>
          <p className="text-slate-600">Create your account</p>
        </div>
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
              minLength={6}
            />
            <p className="text-xs text-slate-500 mt-1">Minimum 6 characters</p>
          </div>
          {error && <p className="text-red-600 text-sm font-medium bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold hover:shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="mt-6 text-sm text-center text-slate-600">
          Have an account?{' '}
          <Link href="/auth/login" className="text-blue-600 font-semibold hover:text-blue-700">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
