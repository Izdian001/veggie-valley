'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function ProductModeration() {
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    checkAdminAccess()
    loadProducts()
  }, [])

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'admin') {
      router.push('/auth')
      return
    }
  }

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          profiles (
            id,
            full_name,
            email
          ),
          seller_profiles (
            id,
            farm_name
          ),
          categories (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setProducts(data)
      setLoading(false)
    } catch (error) {
      console.error('Error loading products:', error)
      setLoading(false)
    }
  }

  const handleApproveProduct = async (productId) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          is_approved: true, 
          approval_date: new Date().toISOString() 
        })
        .eq('id', productId)

      if (error) throw error

      // Log admin action
      await supabase
        .from('admin_actions')
        .insert({
          admin_id: (await supabase.auth.getUser()).data.user.id,
          action_type: 'approve_product',
          target_id: productId,
          target_type: 'product',
          action_details: { action: 'approved' }
        })

      loadProducts() // Refresh the list
    } catch (error) {
      console.error('Error approving product:', error)
    }
  }

  const handleRejectProduct = async (productId, reason) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          is_approved: false, 
          admin_notes: reason 
        })
        .eq('id', productId)

      if (error) throw error

      // Log admin action
      await supabase
        .from('admin_actions')
        .insert({
          admin_id: (await supabase.auth.getUser()).data.user.id,
          action_type: 'reject_product',
          target_id: productId,
          target_type: 'product',
          action_details: { action: 'rejected', reason }
        })

      loadProducts() // Refresh the list
    } catch (error) {
      console.error('Error rejecting product:', error)
    }
  }

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', selectedProduct.id)

      if (error) throw error

      // Log admin action
      await supabase
        .from('admin_actions')
        .insert({
          admin_id: (await supabase.auth.getUser()).data.user.id,
          action_type: 'delete_product',
          target_id: selectedProduct.id,
          target_type: 'product',
          action_details: { action: 'deleted', reason: 'Admin decision' }
        })

      setShowDeleteModal(false)
      setSelectedProduct(null)
      loadProducts() // Refresh the list
    } catch (error) {
      console.error('Error deleting product:', error)
    } finally {
      setDeleting(false)
    }
  }

  const getStatusColor = (isApproved) => {
    return isApproved ? 'text-green-600' : 'text-red-600'
  }

  const getStatusText = (isApproved) => {
    return isApproved ? 'Approved' : 'Pending Approval'
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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Product Moderation</h1>
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
              <div className="text-sm text-gray-600">Approved</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {products.filter(p => !p.is_approved).length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {products.filter(p => p.organic).length}
              </div>
              <div className="text-sm text-gray-600">Organic</div>
            </div>
          </div>
        </div>

        {/* Products List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Product Listings</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {products.map((product) => (
              <div key={product.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                            <span className="text-gray-500">No Image</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {product.name}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {product.description}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-500">Price:</span>
                            <span className="ml-1 text-gray-900">
                              ${product.price}/{product.unit}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Quantity:</span>
                            <span className="ml-1 text-gray-900">
                              {product.quantity} {product.unit}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Category:</span>
                            <span className="ml-1 text-gray-900">
                              {product.categories?.name || 'Uncategorized'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Organic:</span>
                            <span className="ml-1 text-gray-900">
                              {product.organic ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="font-medium text-gray-500">Seller:</span>
                          <span className="ml-1 text-gray-900">
                            {product.profiles?.full_name || 'Unknown'} 
                            {product.seller_profiles?.farm_name && ` (${product.seller_profiles.farm_name})`}
                          </span>
                        </div>
                        <div className="mt-2">
                          <span className={`text-sm font-medium ${getStatusColor(product.is_approved)}`}>
                            Status: {getStatusText(product.is_approved)}
                          </span>
                          {product.admin_notes && (
                            <span className="ml-4 text-sm text-gray-600">
                              Notes: {product.admin_notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {!product.is_approved ? (
                      <>
                        <button
                          onClick={() => handleApproveProduct(product.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectProduct(product.id, 'Admin decision')}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedProduct(product)
                          setShowDeleteModal(true)
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Product</h3>
              <div className="mt-2 px-7">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete "{selectedProduct?.name}"? This action cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-center space-x-4 mt-6">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProduct}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
