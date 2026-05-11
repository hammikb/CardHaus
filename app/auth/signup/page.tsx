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
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-900 to-slate-900 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-indigo-500 rounded-full blur-3xl opacity-15"></div>
      </div>
      <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl w-full max-w-md p-8 border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-slate-950 mb-3">CardHaus</h1>
          <p className="text-slate-600 text-base">Create your account and start trading</p>
        </div>
        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2.5">Email address</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2.5">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50"
              required
              minLength={6}
            />
            <p className="text-xs text-slate-500 mt-2">Minimum 6 characters</p>
          </div>
          {error && (
            <p className="text-red-700 text-sm font-medium bg-red-50 px-4 py-3 rounded-lg border border-red-200">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-base transition-all duration-200 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed mt-8"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="mt-8 text-sm text-center text-slate-600">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-blue-600 font-bold hover:text-blue-700 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
