import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConnectButton from './connect-button'

export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_onboarded, stripe_account_id')
    .eq('id', user.id)
    .single()

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Payout Setup</h1>
      {profile?.stripe_onboarded ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-700 font-semibold">✓ Stripe account connected</p>
          <p className="text-green-600 text-sm mt-1">You will receive payouts after each sale.</p>
        </div>
      ) : (
        <div>
          {params.success && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-700 text-sm">Setup submitted. Stripe is verifying your details — this can take a few minutes.</p>
            </div>
          )}
          <p className="text-gray-600 mb-4">
            Connect a Stripe account to receive payouts when your cards sell. CardHaus uses Stripe Express — takes about 2 minutes.
          </p>
          <ConnectButton />
        </div>
      )}
    </main>
  )
}
