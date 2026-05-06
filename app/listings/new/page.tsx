'use client'
import Link from 'next/link'

const PRODUCT_TYPES = [
  {
    type: 'single',
    title: 'Single Card',
    description: 'List individual cards in any condition',
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
]

export default function ListingTypePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-slate-900 mb-2">What are you selling?</h1>
        <p className="text-slate-600">Choose the type of trading card product</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PRODUCT_TYPES.map(product => (
          <Link
            key={product.type}
            href={product.href}
            className="group bg-white border border-slate-200 rounded-xl p-8 hover:border-blue-500 hover:shadow-lg transition-all"
          >
            <div className="text-5xl mb-4">{product.icon}</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
              {product.title}
            </h2>
            <p className="text-slate-600">{product.description}</p>
            <div className="mt-6 text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">
              Start listing →
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
