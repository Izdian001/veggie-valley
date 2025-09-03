'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { formatBDT } from '@/lib/currency'

export default function SellerStore() {
  const router = useRouter()
  const params = useParams()
  const [seller, setSeller] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [ratingAvg, setRatingAvg] = useState(null)
  const [ratingCount, setRatingCount] = useState(null)

  useEffect(() => {
    if (params.sellerId) {
      loadSellerData()
    }
  }, [params.sellerId])

  const loadSellerData = async () => {
    try {
      // Load seller profile (no relational joins)
      const { data: sellerProfile, error: sellerError } = await supabase
        .from('profiles')
        .select('id, full_name, role, address, phone, location')
        .eq('id', params.sellerId)
        .eq('role', 'seller')
        .single()

      if (sellerError) throw sellerError

      // Try to load optional store info from seller_profiles if table exists
      let store = null
      try {
        const { data: storeRow } = await supabase
          .from('seller_profiles')
          .select('farm_name, bio, years_farming, cover_image_url, rating, total_reviews')
          .eq('id', params.sellerId)
          .single()
        store = storeRow || null
      } catch (e) {
        // Table may not exist; ignore
      }

      // Load seller's products using visibility rules
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', params.sellerId)
        .or('is_approved.is.true,status.eq.active,status.eq.approved,status.is.null')
        .order('created_at', { ascending: false })

      if (productsError) throw productsError

      setSeller({ ...sellerProfile, seller_profiles: store })
      setProducts(productsData || [])

      // Compute rating aggregates from reviews table (live source of truth)
      try {
        const { data: revs } = await supabase
          .from('reviews')
          .select('rating')
          .eq('seller_id', params.sellerId)

        const count = (revs || []).length
        const sum = (revs || []).reduce((acc, r) => acc + (r.rating || 0), 0)
        setRatingCount(count)
        setRatingAvg(count ? sum / count : 0)
      } catch (_) {
        // ignore
      }
    } catch (error) {
      console.error('Error loading seller data:', error)
      router.push('/products')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!seller) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-600">Seller not found</p>
          <button
            onClick={() => router.push('/products')}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Back to Products
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <button
              onClick={() => router.push('/products')}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              ← Back to Products
            </button>
            <h1 className="text-xl font-semibold text-gray-900">
              {seller.seller_profiles?.farm_name || 'Seller Store'}
            </h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Seller Profile */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Seller Avatar and Basic Info */}
            <div className="text-center md:text-left">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto md:mx-0 mb-4">
                <span className="text-3xl text-green-600">
                  {seller.full_name?.[0]?.toUpperCase() || 'S'}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {seller.seller_profiles?.farm_name || 'Local Farm'}
              </h2>
              <p className="text-gray-600 mb-2">{seller.full_name}</p>
              {seller.location && (
                <p className="text-sm text-gray-500 mb-2">📍 {seller.location}</p>
              )}
              {seller.phone && (
                <p className="text-sm text-gray-500">📞 {seller.phone}</p>
              )}
            </div>

            {/* Seller Bio and Stats */}
            <div className="md:col-span-2">
              {seller.seller_profiles?.bio && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">About</h3>
                  <p className="text-gray-700">{seller.seller_profiles.bio}</p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{products.length}</p>
                  <p className="text-sm text-gray-500">Products</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {seller.seller_profiles?.years_farming || 0}
                  </p>
                  <p className="text-sm text-gray-500">Years Farming</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span 
                        key={star} 
                        className={`text-xl ${star <= Math.round(ratingAvg || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {Number(ratingAvg || 0).toFixed(1)} ({(ratingCount || 0)} reviews)
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {(ratingCount || seller.seller_profiles?.total_reviews || 0)}
                  </p>
                  <p className="text-sm text-gray-500">Reviews</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              Products from {seller.seller_profiles?.farm_name || 'this seller'}
            </h3>
            <span className="text-sm text-gray-500">{products.length} products</span>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🥬</div>
              <p className="text-gray-600">No products available</p>
              <p className="text-sm text-gray-500">Check back later for fresh produce</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/products/${product.id}`)}
                >
                  <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="text-4xl">🥬</div>
                    )}
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">{product.name}</h4>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-green-600">{formatBDT(product.price)}/{product.unit}</span>
                    <span className="text-sm text-gray-500">{product.quantity_available} available</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
