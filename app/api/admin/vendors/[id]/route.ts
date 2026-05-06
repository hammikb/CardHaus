import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getAdminSupabase() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return supabase
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getAdminSupabase()
  if (!supabase) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action } = await request.json()

  if (action === 'approve') {
    await supabase.from('profiles').update({ verified_vendor: true, role: 'vendor' }).eq('id', id)
    await supabase.from('storefronts').upsert({ vendor_id: id, shop_name: 'My Store' }, { onConflict: 'vendor_id' })
  } else if (action === 'reject') {
    await supabase.from('profiles').update({ role: 'seller' }).eq('id', id)
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
