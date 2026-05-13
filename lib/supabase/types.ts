export type UserRole = 'buyer' | 'seller' | 'vendor' | 'admin'
export type CardType = 'pokemon' | 'mtg' | 'sports' | 'yugioh' | 'lorcana' | 'one_piece' | 'digimon' | 'other'
export type ProductType = 'single' | 'graded' | 'sealed'
export type SealedType = 'booster_box' | 'booster_pack' | 'elite_trainer_box' | 'collection_box' | 'tin' | 'bundle' | 'blister' | 'other'
export type Condition = 'poor' | 'good' | 'excellent' | 'near_mint' | 'mint' | 'graded'
export type ListingStatus = 'active' | 'sold' | 'removed'
export type OrderStatus = 'paid' | 'shipped' | 'delivered' | 'disputed' | 'refunded'
export type GradeCompany = 'PSA' | 'BGS' | 'CGC' | 'SGC'

export interface Profile {
  id: string
  email: string
  username: string
  role: UserRole
  stripe_account_id: string | null
  stripe_onboarded: boolean
  verified_vendor: boolean
  created_at: string
}

export interface Listing {
  id: string
  seller_id: string
  title: string
  description: string | null
  price: number
  card_type: CardType
  condition: Condition
  grade: string | null
  grade_company: GradeCompany | null
  images: string[]
  status: ListingStatus
  is_auction: boolean
  product_type: ProductType
  sealed_type: SealedType | null
  quantity: number
  created_at: string
  profiles?: Profile
}

export interface Order {
  id: string
  buyer_id: string
  seller_id: string
  listing_id: string
  quantity: number
  total: number
  unit_price: number
  platform_fee: number
  shipping_cost: number
  stripe_payment_intent_id: string | null
  stripe_transfer_id: string | null
  easypost_shipment_id: string | null
  tracking_number: string | null
  status: OrderStatus
  created_at: string
  listings?: Listing
}

export interface MarketSnapshot {
  id: string
  card_id: string
  card_variant_id: string | null
  source: string
  label: string
  price: number
  url: string | null
  captured_at: string
  created_at: string
}

export interface Auction {
  id: string
  listing_id: string
  start_price: number
  current_bid: number | null
  bid_count: number
  winner_id: string | null
  ends_at: string
  created_at: string
  listings?: Listing
}

export interface Bid {
  id: string
  auction_id: string
  bidder_id: string
  amount: number
  created_at: string
}

export interface Storefront {
  id: string
  vendor_id: string
  shop_name: string
  banner_image: string | null
  description: string | null
  policies: string | null
  created_at: string
}

export interface Review {
  id: string
  order_id: string
  buyer_id: string
  seller_id: string
  rating: number
  body: string | null
  created_at: string
  profiles?: Pick<Profile, 'username'>
}
