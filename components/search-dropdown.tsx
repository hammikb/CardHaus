'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Listing } from '@/lib/supabase/types'
import { debounce } from '@/lib/utils/debounce'

export default function SearchDropdown() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Listing[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const debouncedSearch = useRef(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([])
        setIsOpen(false)
        return
      }

      setIsLoading(true)
      try {
        const res = await fetch(`/api/listings?q=${encodeURIComponent(searchQuery)}&limit=8`)
        const data = await res.json()
        setResults(data.slice(0, 8))
        setIsOpen(true)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setIsLoading(false)
      }
    }, 300)
  ).current

  useEffect(() => {
    debouncedSearch(query)
  }, [query])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/marketplace?q=${encodeURIComponent(query)}`)
      setQuery('')
      setIsOpen(false)
    }
  }

  return (
    <div className="relative w-80">
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          placeholder="Search cards, sets, sellers..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setResults([])
              setIsOpen(false)
            }}
            className="absolute right-10 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
        <button
          type="submit"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          🔍
        </button>
      </form>

      {isOpen && (results.length > 0 || isLoading) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-40">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-slate-500">Loading...</div>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto">
                {results.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/marketplace?q=${encodeURIComponent(query)}`}
                    onClick={() => {
                      setQuery('')
                      setIsOpen(false)
                    }}
                    className="block px-4 py-3 hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition-colors"
                  >
                    <div className="flex gap-3">
                      {listing.images?.[0] && (
                        <img
                          src={listing.images[0]}
                          alt={listing.title}
                          className="w-10 h-14 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {listing.title}
                        </p>
                        <p className="text-xs text-slate-500 capitalize">
                          {listing.card_type}
                        </p>
                        <p className="text-sm font-semibold text-blue-600">
                          ${listing.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                href={`/marketplace?q=${encodeURIComponent(query)}`}
                onClick={() => {
                  setQuery('')
                  setIsOpen(false)
                }}
                className="block px-4 py-3 text-center text-sm font-medium text-blue-600 hover:bg-blue-50 border-t border-slate-100"
              >
                View all results →
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}
