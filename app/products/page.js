'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import WishlistButton from '@/components/ui/wishlist-button'

export default function Products() {
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [categoriesMaster, setCategoriesMaster] = useState(['all'])

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])// Temporary auth check
  supabase.auth.getUser().then(({ data }) => console.log('Auth user:', data?.user)).catch(console.error)

  const loadCategories = async () => {
    try {
      const { data } = await supabase
        .from('categories')
        .select('name')
        .eq('is_active', true)
        .order('name')
      const names = (data || []).map(c => c.name).filter(Boolean)
      setCategoriesMaster(['all', ...names])
    } catch (e) {
      console.warn('Could not load categories:', e?.message)
      // Fallback: keep derived categories from products if needed
    }
  }

  const loadProducts = async () => {
    try {
      console.log('Loading products...')
      
      // Get all visible products
      const { data, error } = await supabase
        .from('products')
        .select('*')
        // Visible if any of these match (supports schemas that use either is_approved or status)
        .or('is_approved.is.true,status.eq.active,status.eq.approved,status.is.null')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      // Batch-load related seller profiles and stores, and categories
      const rawProducts = data || []
      const sellerIds = Array.from(new Set(rawProducts.map(p => p.seller_id).filter(Boolean)))
      const categoryIds = Array.from(new Set(rawProducts.map(p => p.category_id).filter(Boolean)))

      let profilesMap = {}
      let storesMap = {}
      let categoriesMap = {}

      if (sellerIds.length > 0) {
        const [{ data: profilesData }, { data: storesData }] = await Promise.all([
          supabase.from('profiles').select('id, full_name').in('id', sellerIds),
          supabase.from('seller_profiles').select('id, farm_name').in('id', sellerIds)
        ])

        if (profilesData) {
          profilesMap = profilesData.reduce((acc, row) => {
            acc[row.id] = { full_name: row.full_name }
            return acc
          }, {})
        }
        if (storesData) {
          storesMap = storesData.reduce((acc, row) => {
            acc[row.id] = { farm_name: row.farm_name }
            return acc
          }, {})
        }
      }

      if (categoryIds.length > 0) {
        const { data: catsData } = await supabase
          .from('categories')
          .select('id, name')
          .in('id', categoryIds)
        if (catsData) {
          categoriesMap = catsData.reduce((acc, row) => {
            acc[row.id] = { name: row.name }
            return acc
          }, {})
        }
      }

      const merged = rawProducts.map(p => ({
        ...p,
        // Attach under the keys already used by UI
        profiles: profilesMap[p.seller_id] || null,
        seller_profiles: storesMap[p.seller_id] || null,
        categories: categoriesMap[p.category_id] || null
      }))

      console.log('Products loaded (merged):', merged)
      setProducts(merged)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || 
                           product.categories?.name?.toLowerCase() === selectedCategory.toLowerCase()
    return matchesSearch && matchesCategory
  })

  const categories = categoriesMaster

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Fresh Products</h1>
        </div>
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Products</label>
              <input
                type="text"
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="aspect-square bg-gray-100 rounded-t-lg flex items-center justify-center relative">
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="text-4xl">🥬</div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-green-600">₹{product.price}/{product.unit}</span>
                  <span className="text-sm text-gray-500">{product.quantity_available} available</span>
                </div>
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xs text-green-600">
                      {product.profiles?.full_name?.[0]?.toUpperCase() || 'F'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">{product.seller_profiles?.farm_name || 'Local Farm'}</span>
                </div>
                <button
                  onClick={() => router.push(`/products/${product.id}`)}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium"
                >
                  View Details
                </button>
                <div className="mt-2">
                  <WishlistButton productId={product.id} size="default" showText />
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🥬</div>
            <p className="text-gray-600">No products found</p>
            <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </main>
    </div>
  )
}
