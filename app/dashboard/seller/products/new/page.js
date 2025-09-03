'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AddProductPage() {
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    quantity_available: '',
    images: '',
    category_id: '',
    unit: 'kg'
  })
  const [error, setError] = useState()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError()

    // Get the current user (seller)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      setError('Not signed in')
      setLoading(false)
      return
    }
    const sellerId = userData.user.id

    // Validate and prepare product data
    const imagesArr = form.images.split(',').map(url => url.trim()).filter(Boolean)

    // Create product in DB
    const { error: insertError } = await supabase
      .from('products')
      .insert([{
        seller_id: sellerId,
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        quantity_available: parseInt(form.quantity_available, 10),
        images: imagesArr,
        category_id: form.category_id || null, // Set if categories are enabled
        unit: form.unit || 'kg',
      }])

    if (insertError) {
      setError(insertError.message)
    } else {
      router.push('/dashboard/seller/products')
    }
    setLoading(false)
  }

  return (
    <main className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Add New Product</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Product Name"
          value={form.name}
          required
          onChange={e => setForm({ ...form, name: e.target.value })}
          className="border p-2 w-full rounded"
        />
        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          required
          onChange={e => setForm({ ...form, description: e.target.value })}
          className="border p-2 w-full rounded"
        />
        <input
          type="number"
          name="price"
          placeholder="Price"
          value={form.price}
          required
          onChange={e => setForm({ ...form, price: e.target.value })}
          className="border p-2 w-full rounded"
        />
        <input
          type="number"
          name="quantity_available"
          placeholder="Quantity Available"
          value={form.quantity_available}
          required
          onChange={e => setForm({ ...form, quantity_available: e.target.value })}
          className="border p-2 w-full rounded"
        />
        <input
          type="text"
          name="images"
          placeholder="Image URLs (comma separated)"
          value={form.images}
          onChange={e => setForm({ ...form, images: e.target.value })}
          className="border p-2 w-full rounded"
        />
        <select
          name="unit"
          value={form.unit}
          onChange={e => setForm({ ...form, unit: e.target.value })}
          required
          className="border p-2 w-full rounded"
        >
          <option value="kg">kg</option>
          <option value="litre">litre</option>
          <option value="piece">piece</option>
          <option value="pack">pack</option>
        </select>
        {error && <p className="text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full p-2 bg-green-700 text-white rounded"
        >
          {loading ? 'Adding...' : 'Add Product'}
        </button>
      </form>
    </main>
  )
}
