'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

interface Props {
  auctionId: string
  initialBid: number | null
  startPrice: number
  endsAt: string
  listingId: string
}

export default function BidForm({ auctionId, initialBid, startPrice, endsAt, listingId }: Props) {
  const [currentBid, setCurrentBid] = useState(initialBid)
  const [bidAmount, setBidAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [ended, setEnded] = useState(new Date(endsAt) <= new Date())

  const supabase = createClient()
  const minBid = currentBid ? currentBid + 0.01 : startPrice

  useEffect(() => {
    const channel = supabase
      .channel(`auction-${auctionId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${auctionId}`
      }, (payload) => {
        setCurrentBid(payload.new.current_bid)
      })
      .subscribe()

    const timer = setInterval(() => {
      if (new Date(endsAt) <= new Date()) { setEnded(true); clearInterval(timer) }
    }, 10000)

    return () => { supabase.removeChannel(channel); clearInterval(timer) }
  }, [auctionId, endsAt, supabase])

  async function handleBid(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const res = await fetch(`/api/auctions/${auctionId}/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(bidAmount) }),
    })
    const data = await res.json()
    if (res.ok) { setMessage('Bid placed!'); setBidAmount('') }
    else setMessage(data.error)
    setLoading(false)
  }

  if (ended) return <p className="text-red-500 font-semibold">Auction ended.</p>

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <p className="text-2xl font-bold text-blue-600 mb-1">
        {currentBid ? formatCurrency(currentBid) : formatCurrency(startPrice)}
      </p>
      <p className="text-sm text-gray-500 mb-4">
        {currentBid ? 'Current bid' : 'Starting bid'}
      </p>
      <form onSubmit={handleBid} className="flex gap-2">
        <input type="number" step="0.01" min={minBid} value={bidAmount}
          onChange={e => setBidAmount(e.target.value)}
          placeholder={`Min $${minBid.toFixed(2)}`}
          className="flex-1 border rounded px-3 py-2" required />
        <button type="submit" disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50">
          {loading ? '...' : 'Bid'}
        </button>
      </form>
      {message && <p className="text-sm mt-2 text-gray-600">{message}</p>}
    </div>
  )
}
