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
      const res = await fetch("/api/listings");
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
      headers: { "x-user-id": "user-id-from-auth" },
    });
    if (res.ok) {
      setListings(listings.filter((l) => l.id !== id));
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">My Listings</h1>
        <button
          onClick={() => router.push("/dashboard/create-listing")}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create Listing
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">Item</th>
              <th className="px-6 py-3 text-left font-semibold">Price</th>
              <th className="px-6 py-3 text-left font-semibold">Qty</th>
              <th className="px-6 py-3 text-left font-semibold">Type</th>
              <th className="px-6 py-3 text-left font-semibold">Created</th>
              <th className="px-6 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((listing) => (
              <tr key={listing.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3">
                  {listing.card_variant
                    ? `${listing.card_variant.set_name} - ${listing.card_variant.language}`
                    : listing.product?.name || "Unknown"}
                </td>
                <td className="px-6 py-3 font-semibold">
                  ${listing.price.toFixed(2)}
                </td>
                <td className="px-6 py-3">{listing.quantity}</td>
                <td className="px-6 py-3 capitalize">{listing.listing_type}</td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {new Date(listing.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-3 space-x-2">
                  <button className="text-blue-600 hover:text-blue-800">
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(listing.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {listings.length === 0 && (
        <div className="mt-8 text-center text-gray-600">
          <p>No listings yet. Create one to get started!</p>
        </div>
      )}
    </div>
  );
}
