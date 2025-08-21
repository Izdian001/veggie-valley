'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function SellerProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState()
  const router = useRouter()

  // Fetch logged-in seller's own products
  useEffect(() => {
    async function fetchProducts() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) {
        setError('Not signed in')
        setLoading(false)
        return
      }
      const sellerId = userData.user.id

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })

      if (error) setError(error.message)
      else setProducts(data)
      setLoading(false)
    }

    fetchProducts()
  }, [])

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Products</h1>
      <button
        className="mb-6 px-4 py-2 bg-green-700 text-white rounded"
        onClick={() => router.push('/dashboard/seller/products/new')}
      >
        Add New Product
      </button>
      {loading ? <div>Loading...</div>
        : error ? <div className="text-red-600">{error}</div>
        : products.length === 0 ? <div>No products found.</div>
        : <ul className="space-y-4">
            {products.map(product => (
              <li
                key={product.id}
                className="border p-4 rounded shadow flex flex-col space-y-2"
              >
                <span className="text-xl font-bold">{product.name}</span>
                <span>{product.description}</span>
                <span className="font-semibold text-green-800">${product.price}</span>
                <span className="text-sm text-gray-500">Status: {product.status}</span>
                {/* TODO: edit/delete buttons can be added */}
              </li>
            ))}
          </ul>
      }
    </main>
  )
}
