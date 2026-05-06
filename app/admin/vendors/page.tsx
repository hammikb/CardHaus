import { requireAdmin } from '@/lib/auth'
import VendorActions from './vendor-actions'

export default async function AdminVendorsPage() {
  const { supabase } = await requireAdmin()

  const { data: applicants } = await supabase
    .from('profiles')
    .select('id, username, email, created_at')
    .eq('role', 'seller')
    .eq('verified_vendor', false)
    .order('created_at', { ascending: true })

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Vendor Applications</h1>
      {applicants && applicants.length > 0 ? (
        <div className="space-y-3">
          {applicants.map(a => (
            <div key={a.id} className="bg-white border rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{a.username}</p>
                <p className="text-sm text-gray-500">{a.email}</p>
              </div>
              <VendorActions sellerId={a.id} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No pending applications.</p>
      )}
    </main>
  )
}
