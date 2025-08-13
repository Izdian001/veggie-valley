'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function ProductDetail() {
  const router = useRouter()
  const params = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.productId) {
      loadProduct()
    }
  }, [params.productId])

  const loadProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          profiles!products_seller_id_fkey (
            id,
            full_name,
            avatar_url,
            phone,
            location
          ),
          seller_profiles!products_seller_id_fkey (
            farm_name,
            bio,
            years_farming,
            cover_image_url
          ),
          categories (
            name,
            description
          )
        `)
        .eq('id', params.productId)
        .eq('status', 'approved')
        .single()

      if (error) throw error
      setProduct(data)
    } catch (error) {
      console.error('Error loading product:', error)
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

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-600">Product not found</p>
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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <button
              onClick={() => router.push('/products')}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              ← Back to Products
            </button>
            <h1 className="text-xl font-semibold text-gray-900">{product.name}</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">
                  🥬
                </div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.slice(1, 5).map((image, index) => (
                  <div key={index} className="aspect-square bg-gray-100 rounded overflow-hidden">
                    <img
                      src={image}
                      alt={`${product.name} ${index + 2}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <p className="text-gray-600">{product.description}</p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="text-2xl font-bold text-green-600">₹{product.price}/{product.unit}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Available</p>
                  <p className="text-xl font-semibold text-gray-900">{product.quantity_available} {product.unit}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Min Order</p>
                  <p className="text-lg font-medium text-gray-900">{product.min_order_quantity} {product.unit}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="text-lg font-medium text-gray-900">{product.categories?.name || 'Vegetables'}</p>
                </div>
              </div>

              {product.is_organic && (
                <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  🌱 Organic
                </div>
              )}

              {product.harvest_date && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500">Harvest Date</p>
                  <p className="text-lg font-medium text-gray-900">
                    {new Date(product.harvest_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Seller Information */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl text-green-600">
                    {product.profiles?.full_name?.[0]?.toUpperCase() || 'F'}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {product.seller_profiles?.farm_name || 'Local Farm'}
                  </h3>
                  <p className="text-gray-600">{product.profiles?.full_name}</p>
                  {product.profiles?.location && (
                    <p className="text-sm text-gray-500">📍 {product.profiles.location}</p>
                  )}
                </div>
              </div>

              {product.seller_profiles?.bio && (
                <p className="text-gray-700 mb-4">{product.seller_profiles.bio}</p>
              )}

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push(`/seller/${product.profiles.id}`)}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  View Seller Store
                </button>
                {product.profiles?.phone && (
                  <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    📞 Contact
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
