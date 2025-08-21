'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function SellerOrdersPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      if (user.user_metadata?.role !== 'seller') { router.push('/dashboard'); return }
      setUser(user)

      // 1) Fetch orders for this seller
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('seller_id', user.id)
        .order('order_date', { ascending: false })

      if (error) { setOrders([]); setLoading(false); return }

      const list = ordersData || []

      // 2) Batch fetch buyer profiles
      const buyerIds = [...new Set(list.map(o => o.buyer_id).filter(Boolean))]
      let buyersById = {}
      if (buyerIds.length) {
        const { data: buyers } = await supabase
          .from('profiles')
          .select('id, full_name, address')
          .in('id', buyerIds)
        ;(buyers || []).forEach(b => { buyersById[b.id] = b })
      }

      // 3) Batch fetch product names
      const productIds = [...new Set(list.map(o => o.product_id).filter(Boolean))]
      let productsById = {}
      if (productIds.length) {
        const { data: prods } = await supabase
          .from('products')
          .select('id, name, unit, price')
          .in('id', productIds)
        ;(prods || []).forEach(p => { productsById[p.id] = p })
      }

      const enriched = list.map(o => ({
        ...o,
        buyer: buyersById[o.buyer_id] || null,
        product: productsById[o.product_id] || null,
      }))

      setOrders(enriched)
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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Incoming Orders</h1>
          <div className="space-x-2">
            <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900" onClick={() => router.push('/dashboard/seller')}>Seller Dashboard</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow divide-y">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No orders yet.</div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div>
                  <div className="text-sm text-gray-500">Order #{order.id.slice(0,8).toUpperCase()}</div>
                  <div className="text-sm text-gray-700 font-medium">{order.product?.name || 'Product'}</div>
                </div>
                <div className="text-sm text-gray-600">Qty: {order.quantity}</div>
                <div className="text-sm text-gray-600">
                  Buyer: {order.buyer?.full_name || 'Not provided'}
                  <div className="text-xs text-gray-500">{order.buyer?.address || ''}</div>
                </div>
                <div className="flex justify-end items-center gap-2">
                  <span className="inline-block px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 capitalize">{order.status}</span>
                  <button onClick={() => router.push(`/orders/${order.id}`)} className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">View Details</button>
                  <button onClick={() => router.push(`/orders/${order.id}/chat`)} className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">Open Chat</button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
