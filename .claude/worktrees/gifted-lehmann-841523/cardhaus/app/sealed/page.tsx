"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface Product {
  id: number;
  name: string;
  product_type: string;
  set_name: string;
  image_url: string;
  msrp: number;
}

interface Listing {
  id: number;
  price: number;
  quantity: number;
  seller: { username: string; rating: number };
}

export default function SealedPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const res = await fetch("/api/products?limit=50");
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  }

  async function handleSelectProduct(product: Product) {
    setSelectedProduct(product);
    const res = await fetch(`/api/products/${product.id}/listings`);
    const data = await res.json();
    setListings(data.listings || []);
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold mb-8">Sealed Products</h1>

      {selectedProduct && (
        <div className="mb-8 bg-white p-6 rounded-lg shadow">
          <button
            onClick={() => setSelectedProduct(null)}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back
          </button>
          <h2 className="text-2xl font-bold">{selectedProduct.name}</h2>
          <p className="text-gray-600 mt-2">
            {selectedProduct.product_type} • {selectedProduct.set_name}
          </p>
          <p className="text-green-600 font-bold mt-2">MSRP: ${selectedProduct.msrp?.toFixed(2)}</p>

          <h3 className="font-semibold mt-6 mb-4">Available Listings</h3>
          <div className="space-y-3">
            {Array.isArray(listings) && listings.length > 0 ? (
              listings.map((listing) => (
                <div key={listing.id} className="border p-3 rounded">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">${listing.price.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">
                        Qty: {listing.quantity} • Seller: {listing.seller.username}
                      </p>
                      <p className="text-sm text-yellow-600">
                        ★ {listing.seller.rating.toFixed(1)}
                      </p>
                    </div>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                      Buy
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p>No listings</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.isArray(products) && products.length > 0 ? (
          products.map((product) => (
            <div
              key={product.id}
              onClick={() => handleSelectProduct(product)}
              className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer overflow-hidden"
            >
              <div className="relative w-full h-64">
                {product.image_url && (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                <p className="text-gray-500 text-xs">{product.product_type}</p>
                <p className="text-green-600 font-bold mt-2">
                  ${product.msrp?.toFixed(2) || "N/A"}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p>No products found</p>
        )}
      </div>
    </div>
  );
}
