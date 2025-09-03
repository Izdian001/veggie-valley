'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function BuyerOrdersPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      // Redirect non-buyers away
      if (user.user_metadata?.role === 'seller') {
        router.push('/seller/dashboard')
        return
      }
      if (user.user_metadata?.role === 'admin') {
        router.push('/admin/dashboard')
        return
      }
      setUser(user)

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          products ( id, name, unit ),
          seller:profiles!orders_seller_id_fkey ( id, full_name )
        `)
        .eq('buyer_id', user.id)
        .order('order_date', { ascending: false })

      if (!error) setOrders(data || [])
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-5 py-2.5 text-base font-medium text-gray-700 hover:text-gray-900 rounded-md"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <button
            onClick={() => router.push('/products')}
            className="px-5 py-2.5 text-base font-medium text-gray-700 hover:text-gray-900 rounded-md"
          >
            Shop
          </button>
        </div>
        <div className="bg-white rounded-lg shadow divide-y">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No orders yet.</div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="text-sm text-gray-500">Order #{order.id.slice(0,8).toUpperCase()}</div>
                  <div className="font-medium text-gray-900">{order.products?.name || 'Product'}</div>
                  <div className="text-sm text-gray-600">Qty: {order.quantity} {order.products?.unit || ''}</div>
                  <div className="text-sm text-gray-600">Status: <span className="font-medium capitalize">{order.status}</span></div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => router.push(`/orders/${order.id}`)}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >View Details</button>
                  <button
                    onClick={() => router.push(`/orders/${order.id}/chat`)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >Open Chat</button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
