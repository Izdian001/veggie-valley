'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import ReviewForm from '@/components/reviews/ReviewForm'
import ReviewList from '@/components/reviews/ReviewList'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import ChatWindow from '@/components/messaging/ChatWindow'

export default function OrderDetailsPage({ params }) {
  const router = useRouter()
  const { orderId } = params
  const [order, setOrder] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [hasReviewed, setHasReviewed] = useState(false)
  const [showChat, setShowChat] = useState(false)

  const fetchOrderAndReviews = useCallback(async (currentUser) => {
    setLoading(true)
    setError('')
    try {
      // 1) Fetch order row (no joins to avoid null/400s)
      const { data: orderRow, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (orderError) throw orderError

      // Security: ensure user is part of the order
      if (currentUser.id !== orderRow.buyer_id && currentUser.id !== orderRow.seller_id) {
        throw new Error('You are not authorized to view this order.')
      }

      // 2) Fetch related profiles in one call
      const ids = [orderRow.buyer_id, orderRow.seller_id].filter(Boolean)
      let buyerProfile = null
      let sellerProfile = null
      if (ids.length) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, address, phone')
          .in('id', ids)
        if (profilesError) throw profilesError
        buyerProfile = profilesData.find(p => p.id === orderRow.buyer_id) || null
        sellerProfile = profilesData.find(p => p.id === orderRow.seller_id) || null
      }

      // 3) Fetch order items with product info
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          product:product_id (
            id,
            name,
            unit,
            price,
            images
          )
        `)
        .eq('order_id', orderId)

      if (itemsError) throw itemsError

      // Compose order object with nested info
      const orderData = {
        ...orderRow,
        seller: sellerProfile,
        buyer: buyerProfile,
        items: orderItems || []
      }

      setOrder(orderData)

      // Fetch reviews for the seller (seller store level)
      const { data: sellerReviewData, error: sellerReviewError } = await supabase
        .from('reviews')
        .select(`
          *,
          buyer_name:buyer_id ( full_name )
        `)
        .eq('seller_id', orderRow.seller_id)
        .order('created_at', { ascending: false })

      if (sellerReviewError) throw sellerReviewError

      setReviews((sellerReviewData || []).map(r => ({ ...r, buyer_name: r.buyer_name?.full_name })))

      // Check if the current user (buyer) has already reviewed THIS order
      const { data: existingOrderReview, error: existingErr } = await supabase
        .from('reviews')
        .select('id')
        .eq('order_id', orderId)
        .eq('buyer_id', currentUser.id)
        .maybeSingle()
      if (existingErr && existingErr.code !== 'PGRST116') throw existingErr
      setHasReviewed(!!existingOrderReview)

    } catch (err) {
      setError(err.message)
      console.error('Error fetching order details:', err)
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setUser(user)
      fetchOrderAndReviews(user)
    }
    getCurrentUser()
  }, [router, fetchOrderAndReviews])

  const handleReviewSubmitted = () => {
    // Refetch reviews after submission
    if (user) {
      fetchOrderAndReviews(user)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        <p>Error: {error}</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <p>Order not found.</p>
      </div>
    )
  }

  const isBuyer = user?.id === order.buyer_id
  // Allow review regardless of delivery status
  const canReview = isBuyer && !hasReviewed

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 text-base font-medium text-gray-700 hover:text-gray-900 rounded-md"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
          <div className="space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowChat(!showChat)}
              className="flex items-center gap-2"
            >
              {showChat ? 'Hide Chat' : 'Message Seller'}
            </Button>
          </div>
        </div>
        
        {/* Order Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Order #{order.id.substring(0, 8)}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="font-medium">Order Status</h3>
              <p className="capitalize">{order.status}</p>
            </div>
            <div>
              <h3 className="font-medium">Order Date</h3>
              <p>{new Date(order.order_date).toLocaleDateString()}</p>
            </div>
            <div>
              <h3 className="font-medium">Total Amount</h3>
              <p>${order.total_amount?.toFixed(2) || '0.00'}</p>
            </div>
          </div>

          <h3 className="font-medium mb-2">Items</h3>
          <div className="border rounded-lg divide-y">
            {order.items?.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {item.product?.images?.[0] && (
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div>
                    <h4 className="font-medium">{item.product?.name || 'Product'}</h4>
                    <p className="text-sm text-gray-600">
                      {item.quantity} × ${item.unit_price?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    ${(item.quantity * item.unit_price)?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {showChat && (
          <div className="mb-8 border rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Chat with Seller</h2>
            <ChatWindow order={order} initialUser={user} />
          </div>
        )}

        {/* Reviews Section */}
        <div className="space-y-8">
          {canReview && (
            <ReviewForm 
              order={order} 
              onReviewSubmitted={handleReviewSubmitted} 
            />
          )}

          <ReviewList 
            reviews={reviews} 
            onReplySubmitted={handleReviewSubmitted} 
          />
        </div>
      </div>
    </div>
  )
}
