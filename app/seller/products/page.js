'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { formatBDT } from '@/lib/currency'

export default function SellerProducts() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: '',
    unit: 'kg',
    quantityAvailable: '',
    minOrderQuantity: '1',
    isOrganic: false
  })

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadProducts()
    }
  }, [user])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'seller') {
      router.push('/auth')
      return
    }
    setUser(user)
  }

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            id,
            name
          )
        `)
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error loading products:', error)
      setLoading(false)
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setEditForm({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      unit: product.unit,
      quantityAvailable: product.quantity_available.toString(),
      minOrderQuantity: product.min_order_quantity.toString(),
      isOrganic: product.is_organic || false
    })
  }

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target
    setEditForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: editForm.name,
          description: editForm.description,
          price: parseFloat(editForm.price),
          unit: editForm.unit,
          quantity_available: parseInt(editForm.quantityAvailable),
          min_order_quantity: parseInt(editForm.minOrderQuantity),
          is_organic: editForm.isOrganic,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingProduct.id)

      if (error) throw error

      setEditingProduct(null)
      setEditForm({
        name: '',
        description: '',
        price: '',
        unit: 'kg',
        quantityAvailable: '',
        minOrderQuantity: '1',
        isOrganic: false
      })
      loadProducts() // Refresh the list
    } catch (error) {
      console.error('Error updating product:', error)
      alert('Error updating product. Please try again.')
    }
  }

  const handleDelete = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error

      loadProducts() // Refresh the list
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error deleting product. Please try again.')
    }
  }

  const getStatusBadge = (isApproved) => {
    return isApproved ? 
      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span> :
      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Pending</span>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/seller/dashboard')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Manage Products</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/seller/products/new')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
              >
                Add New Product
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{products.length}</div>
              <div className="text-sm text-gray-600">Total Products</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {products.filter(p => p.is_approved).length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {products.filter(p => !p.is_approved).length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {products.filter(p => p.quantity_available > 0).length}
              </div>
              <div className="text-sm text-gray-600">In Stock</div>
            </div>
          </div>
        </div>

        {/* Products List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Products</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {products.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-gray-500 mb-4">No products found</div>
                <button
                  onClick={() => router.push('/seller/products/new')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                >
                  Add Your First Product
                </button>
              </div>
            ) : (
              products.map((product) => (
                <div key={product.id} className="p-6">
                  {editingProduct?.id === product.id ? (
                    // Edit Form
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Name
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={editForm.name}
                            onChange={handleEditChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Price
                          </label>
                          <input
                            type="number"
                            name="price"
                            step="0.01"
                            min="0"
                            value={editForm.price}
                            onChange={handleEditChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Available Quantity
                          </label>
                          <input
                            type="number"
                            name="quantityAvailable"
                            min="0"
                            value={editForm.quantityAvailable}
                            onChange={handleEditChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit
                          </label>
                          <select
                            name="unit"
                            value={editForm.unit}
                            onChange={handleEditChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="kg">Kilogram (kg)</option>
                            <option value="litre">Litre (L)</option>
                            <option value="g">Gram (g)</option>
                            <option value="lb">Pound (lb)</option>
                            <option value="piece">Piece</option>
                            <option value="bunch">Bunch</option>
                            <option value="dozen">Dozen</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          name="description"
                          value={editForm.description}
                          onChange={handleEditChange}
                          rows="3"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          name="isOrganic"
                          checked={editForm.isOrganic}
                          onChange={handleEditChange}
                          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-900">
                          This is an organic product
                        </label>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingProduct(null)}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Product Display
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            {product.images && product.images.length > 0 ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {product.name}
                              </h3>
                              {getStatusBadge(product.is_approved)}
                              {product.is_organic && (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                  Organic
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {product.description}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-500">Price:</span>
                                <span className="ml-1 text-gray-900">
                                  {formatBDT(product.price)}/{product.unit}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-500">Available:</span>
                                <span className="ml-1 text-gray-900">
                                  {product.quantity_available} {product.unit}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-500">Min Order:</span>
                                <span className="ml-1 text-gray-900">
                                  {product.min_order_quantity} {product.unit}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-500">Category:</span>
                                <span className="ml-1 text-gray-900">
                                  {product.categories?.name || 'Uncategorized'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleEdit(product)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
