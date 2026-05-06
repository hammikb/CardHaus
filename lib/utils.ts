export function calculatePlatformFee(price: number): number {
  const feePercent = Number(process.env.PLATFORM_FEE_PERCENT ?? 10)
  return Math.round(price * (feePercent / 100) * 100) / 100
}

export function calculateSellerPayout(price: number): number {
  return Math.round((price - calculatePlatformFee(price)) * 100) / 100
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export async function requireAdmin() {
  const { createClient } = await import('@/lib/supabase/server')
  const { redirect } = await import('next/navigation')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')
  return { user, supabase }
}
