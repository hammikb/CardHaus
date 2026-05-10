'use client'
import { useRef, useState } from 'react'

interface Card {
  id: string
  card_id: string
  tcgcsv_id: string
  name: string
  set: string
  image_url: string | null
  rarity: string | null
}

interface Props {
  value: string
  onChange: (card: Card | null, name: string) => void
  placeholder?: string
}

export default function CardAutocomplete({ value, onChange, placeholder = 'Search cards...' }: Props) {
  const input = value
  const [suggestions, setSuggestions] = useState<Card[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Card | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  async function search(query: string) {
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/cards/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setSuggestions(Array.isArray(data) ? data : [])
      setOpen(true)
    } catch (error) {
      console.error('Search error:', error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setSelected(null)
    onChange(null, val)

    clearTimeout(timeoutRef.current)
    if (val.length >= 2) {
      timeoutRef.current = setTimeout(() => search(val), 300)
    } else {
      setSuggestions([])
      setOpen(false)
    }
  }

  function handleSelect(card: Card) {
    setSelected(card)
    setSuggestions([])
    setOpen(false)
    onChange(card, card.name)
  }

  function handleClear() {
    setSelected(null)
    setSuggestions([])
    setOpen(false)
    onChange(null, '')
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={input}
        onChange={handleInputChange}
        onFocus={() => input.length >= 2 && suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full border rounded px-3 py-2"
      />

      {input && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      )}

      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-t-0 rounded-b shadow-lg z-10 max-h-96 overflow-y-auto">
          {suggestions.map(card => (
            <button
              key={card.id}
              type="button"
              onClick={() => handleSelect(card)}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b last:border-b-0 flex gap-3 items-start"
            >
              {card.image_url && (
                <img
                  src={card.image_url}
                  alt={card.name}
                  className="w-8 h-12 object-cover rounded flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{card.name}</p>
                <p className="text-xs text-gray-500">
                  {card.set} {card.rarity && `• ${card.rarity}`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-t-0 rounded-b p-3 text-sm text-gray-500">
          Searching...
        </div>
      )}

      {open && !loading && suggestions.length === 0 && input.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-t-0 rounded-b p-3 text-sm text-gray-500">
          No cards found
        </div>
      )}

      {selected && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <p className="font-medium">{selected.name}</p>
          <p className="text-gray-600">{selected.set}</p>
        </div>
      )}
    </div>
  )
}
