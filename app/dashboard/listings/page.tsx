"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SellerListing {
  id: string;
  card_variant_id?: string;
  product_id?: string;
  price: number;
  quantity: number;
  listing_type: string;
  created_at: string;
  card_variant?: { set_name: string; language: string };
  product?: { name: string };
}

export default function DashboardPage() {
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      const res = await fetch("/api/listings?mine=1");
      const data = await res.json();
      if (!cancelled) {
        setListings(data.listings || []);
        setLoading(false);
      }
    }

    loadListings();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this listing?")) return;
    const res = await fetch(`/api/listings/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setListings(listings.filter((l) => l.id !== id));
    }
  }

  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <p className="text-slate-600">Loading listings...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-slate-950 mb-2">My Listings</h1>
            <p className="text-slate-600">{listings.length} active listing{listings.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => router.push("/listings/new")}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-blue-600 text-white font-bold text-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 active:translate-y-0.5"
          >
            + Create Listing
          </button>
        </div>

        {listings.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 py-16 text-center">
            <p className="text-slate-600 text-base mb-4">No listings yet</p>
            <p className="text-slate-500 text-sm mb-6">Start selling by creating your first listing</p>
            <button
              onClick={() => router.push("/listings/new")}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-blue-600 text-white font-bold text-sm transition-all duration-200 hover:bg-blue-700"
            >
              Create Your First Listing
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-left font-bold text-slate-900 text-sm">Item</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-900 text-sm">Price</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-900 text-sm">Qty</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-900 text-sm">Type</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-900 text-sm">Created</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-900 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing, idx) => (
                  <tr key={listing.id} className={`border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900">
                        {listing.card_variant
                          ? `${listing.card_variant.set_name} - ${listing.card_variant.language}`
                          : listing.product?.name || "Unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-950">
                      ${listing.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-slate-700">{listing.quantity}</td>
                    <td className="px-6 py-4 text-slate-700 capitalize text-sm">{listing.listing_type}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {new Date(listing.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="px-3 py-1.5 rounded text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors">
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(listing.id)}
                          className="px-3 py-1.5 rounded text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
