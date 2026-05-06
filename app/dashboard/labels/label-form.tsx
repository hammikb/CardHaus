'use client'
import { useState } from 'react'

export default function LabelForm({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ label_url: string; tracking_code: string; charged_rate: number } | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    to_name: '', to_street: '', to_city: '', to_state: '', to_zip: '',
    from_name: '', from_street: '', from_city: '', from_state: '', from_zip: '',
    weight_oz: '1',
  })

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/shipping/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, ...form, weight_oz: Number(form.weight_oz) }),
    })
    const data = await res.json()
    if (res.ok) setResult(data)
    else setError(data.error)
    setLoading(false)
  }

  if (result) {
    return (
      <div className="bg-green-50 border border-green-200 rounded p-4">
        <p className="font-semibold text-green-700">Label generated!</p>
        <p className="text-sm mt-1">Tracking: {result.tracking_code}</p>
        <p className="text-sm">Shipping cost: ${result.charged_rate.toFixed(2)}</p>
        <a href={result.label_url} target="_blank" rel="noreferrer"
          className="inline-block mt-3 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
          Download Label
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="font-medium text-sm mb-2">Ship To</p>
        <div className="grid grid-cols-2 gap-2">
          {(['to_name', 'to_street', 'to_city', 'to_state', 'to_zip'] as const).map(f => (
            <input key={f} placeholder={f.replace('to_', '').replace('_', ' ')} value={form[f]}
              onChange={e => set(f, e.target.value)}
              className="border rounded px-3 py-2 text-sm" required />
          ))}
        </div>
      </div>
      <div>
        <p className="font-medium text-sm mb-2">Ship From</p>
        <div className="grid grid-cols-2 gap-2">
          {(['from_name', 'from_street', 'from_city', 'from_state', 'from_zip'] as const).map(f => (
            <input key={f} placeholder={f.replace('from_', '').replace('_', ' ')} value={form[f]}
              onChange={e => set(f, e.target.value)}
              className="border rounded px-3 py-2 text-sm" required />
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Weight (oz)</label>
        <input type="number" step="0.1" min="0.1" value={form.weight_oz}
          onChange={e => set('weight_oz', e.target.value)}
          className="border rounded px-3 py-2 text-sm w-full mt-1" required />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="submit" disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50">
        {loading ? 'Generating...' : 'Generate Label'}
      </button>
    </form>
  )
}
