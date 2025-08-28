'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { formatBDT } from '@/lib/currency'

export default function SellerOrders() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadOrders()
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

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          products (
            id,
            name,
            unit
          ),
          profiles!orders_buyer_id_fkey (
            id,
            full_name,
            phone,
            address,
            city,
            state
          )
        `)
        .eq('seller_id', user?.id)
        .order('order_date', { ascending: false })

      if (error) throw error
      setOrders(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error loading orders:', error)
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId, status) => {
    // Optimistic UI update
    const previous = orders
    setSavingId(orderId)
    setOrders((curr) => curr.map(o => o.id === orderId ? { ...o, status } : o))

    try {
      const { data: updated, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select()

      if (error) throw error
      console.log('Order status updated:', updated)
      // Keep optimistic state; no reload to avoid race/flicker
    } catch (error) {
      console.error('Error updating order status:', error)
      alert(`Failed to update status: ${error?.message || 'Unknown error'}`)
      // rollback
      setOrders(previous)
    } finally {
      setSavingId(null)
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      confirmed: { color: 'bg-blue-100 text-blue-800', text: 'Confirmed' },
      shipped: { color: 'bg-purple-100 text-purple-800', text: 'Shipped' },
      delivered: { color: 'bg-green-100 text-green-800', text: 'Delivered' },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'Cancelled' }
    }
    
    const config = statusConfig[status] || statusConfig.pending
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.text}
      </span>
    )
  }

  const getStatusOptions = (currentStatus) => {
    const allStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
    return allStatuses.filter(status => status !== currentStatus)
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
              <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{orders.length}</div>
              <div className="text-sm text-gray-600">Total Orders</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {orders.filter(o => o.status === 'pending').length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {orders.filter(o => o.status === 'confirmed').length}
              </div>
              <div className="text-sm text-gray-600">Confirmed</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {orders.filter(o => o.status === 'shipped').length}
              </div>
              <div className="text-sm text-gray-600">Shipped</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {orders.filter(o => o.status === 'delivered').length}
              </div>
              <div className="text-sm text-gray-600">Delivered</div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Customer Orders</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {orders.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-gray-500 mb-4">No orders found</div>
                <p className="text-sm text-gray-400">Orders from customers will appear here</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-lg font-semibold text-blue-600">
                            {order.profiles?.full_name?.charAt(0) || 'C'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {order.profiles?.full_name || 'Customer'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Order #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(order.order_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(order.status)}
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        disabled={savingId === order.id}
                        className={`px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${savingId === order.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <option value={order.status}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</option>
                        {getStatusOptions(order.status).map(status => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => router.push(`/orders/${order.id}`)}
                        className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                      >View Details</button>
                      <button
                        onClick={() => router.push(`/orders/${order.id}/chat`)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                      >Open Chat</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Order Details */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Order Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Product:</span>
                          <span className="font-medium">{order.products?.name || 'Unknown Product'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Quantity:</span>
                          <span className="font-medium">{order.quantity} {order.products?.unit || 'units'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Unit Price:</span>
                          <span className="font-medium">{formatBDT(order.unit_price)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-gray-900 font-medium">Total Amount:</span>
                          <span className="text-green-600 font-bold">{formatBDT(order.total_amount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Information */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Customer Information</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Name:</span>
                          <span className="ml-2 font-medium">{order.profiles?.full_name || 'Not provided'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Phone:</span>
                          <span className="ml-2 font-medium">{order.profiles?.phone || 'Not provided'}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Address:</span>
                          <span className="ml-2 font-medium">
                            {order.profiles?.address || 'Not provided'}
                            {order.profiles?.city && `, ${order.profiles.city}`}
                            {order.profiles?.state && `, ${order.profiles.state}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
