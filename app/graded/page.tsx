import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ListingCard from '@/components/listing-card'
import EmptyState from '@/components/empty-state'

const CARD_TYPES = ['pokemon', 'mtg', 'sports', 'yugioh', 'lorcana', 'one_piece', 'digimon', 'other']
const GRADE_COMPANIES = ['PSA', 'BGS', 'CGC', 'SGC']

export default async function GradedPage(props: { searchParams: Promise<Record<string, string>> }) {
  const searchParams = await props.searchParams
  const supabase = await createClient()

  let query = supabase
    .from('listings')
    .select('*, profiles(username, verified_vendor)')
    .eq('status', 'active')
    .eq('is_auction', false)
    .eq('product_type', 'graded')
    .order('created_at', { ascending: false })

  const cardType = searchParams.card_type
  const gradeCompany = searchParams.grade_company

  if (cardType) query = query.eq('card_type', cardType)
  if (gradeCompany) query = query.eq('grade_company', gradeCompany)

  const { data: listings, error } = await query

  if (error) {
    console.error('Failed to fetch graded listings:', error)
  }

  const cards = listings || []

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-slate-950 mb-3">Graded Cards</h1>
          <p className="text-slate-600 text-lg">Professionally certified trading cards from top grading companies</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 p-6 sticky top-4 shadow-sm">
              <h2 className="font-bold text-slate-950 mb-5">Filters</h2>

              <div className="mb-6">
                <h3 className="font-bold text-xs uppercase tracking-wide text-slate-700 mb-3">Card Type</h3>
                <div className="space-y-2">
                  <Link
                    href="/graded"
                    className={`block text-sm px-3 py-2.5 rounded-lg transition-all duration-150 ${
                      !cardType
                        ? 'bg-blue-600 text-white font-semibold shadow-md'
                        : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    All Types
                  </Link>
                  {CARD_TYPES.map(type => (
                    <Link
                      key={type}
                      href={`/graded?card_type=${type}`}
                      className={`block text-sm px-3 py-2 rounded-lg transition-colors capitalize ${
                        cardType === type
                          ? 'bg-blue-100 text-blue-900 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {type.replace('_', ' ')}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-slate-900 mb-3">Grade Company</h3>
                <div className="space-y-2">
                  <Link
                    href="/graded"
                    className={`block text-sm px-3 py-2 rounded-lg transition-colors ${
                      !gradeCompany
                        ? 'bg-blue-100 text-blue-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    All Companies
                  </Link>
                  {GRADE_COMPANIES.map(company => (
                    <Link
                      key={company}
                      href={`/graded?grade_company=${company}`}
                      className={`block text-sm px-3 py-2 rounded-lg transition-colors ${
                        gradeCompany === company
                          ? 'bg-blue-100 text-blue-900 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {company}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Listings Grid */}
          <div className="lg:col-span-3">
            {cards.length === 0 ? (
              <EmptyState
                icon="🏆"
                title="No graded cards found"
                description="Be the first to list a graded card"
                actionText="List a Graded Card"
                actionHref="/listings/graded/new"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map(card => (
                  <ListingCard
                    key={card.id}
                    listing={card}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
