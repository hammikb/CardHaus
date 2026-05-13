'use client'
import Link from 'next/link'

const PRODUCT_TYPES = [
  {
    type: 'single',
    title: 'Single Card',
    description: 'List individual cards in any condition, including multi-copy inventory',
    icon: '🎴',
    href: '/listings/singles/new',
  },
  {
    type: 'graded',
    title: 'Graded Card',
    description: 'List PSA, BGS, CGC, or SGC graded cards',
    icon: '🏆',
    href: '/listings/graded/new',
  },
  {
    type: 'sealed',
    title: 'Sealed Product',
    description: 'List booster boxes, packs, tins, and more',
    icon: '📦',
    href: '/listings/sealed/new',
  },
  {
    type: 'auction',
    title: 'Auction',
    description: 'Start a bidding auction for trading cards',
    icon: '🔨',
    href: '/listings/auction/new',
  },
]

export default function ListingTypePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-slate-950 mb-3">What are you selling?</h1>
          <p className="text-slate-600 text-lg">Choose a listing type to get started</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRODUCT_TYPES.map(product => (
            <Link
              key={product.type}
              href={product.href}
              className="group bg-white border border-slate-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200"
            >
              <div className="text-5xl mb-4 block">{product.icon}</div>
              <h2 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                {product.title}
              </h2>
              <p className="text-sm text-slate-600 mb-6">{product.description}</p>
              <div className="text-blue-600 font-bold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Next
                <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
