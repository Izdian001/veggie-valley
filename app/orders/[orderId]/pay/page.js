'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function MockPaymentPage({ params }) {
  const router = useRouter()
  const { orderId } = params
  const [user, setUser] = useState(null)
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setUser(user)

      try {
        const { data: orderRow, error: orderErr } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()
        if (orderErr) throw orderErr

        // Security: ensure user is part of the order
        if (user.id !== orderRow.buyer_id && user.id !== orderRow.seller_id) {
          throw new Error('You are not authorized to pay for this order.')
        }

        setOrder(orderRow)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [orderId, router])

  const handleConfirmPayment = async () => {
    if (!order || !user) return
    setSubmitting(true)
    setError('')
    try {
      // Determine receiver (notify the counterparty)
      const receiverId = user.id === order.buyer_id ? order.seller_id : order.buyer_id

      // Insert a system-like message to notify seller about payment initiation/confirmation (demo)
      const methodLabel = paymentMethod === 'bkash' ? 'bKash' : paymentMethod === 'nagad' ? 'Nagad' : 'Card'

      const { error: msgErr } = await supabase
        .from('messages')
        .insert([
          {
            order_id: order.id,
            sender_id: user.id,
            receiver_id: receiverId,
            message_text: `Payment initiated via ${methodLabel} (demo).`
          },
          {
            order_id: order.id,
            sender_id: user.id,
            receiver_id: receiverId,
            message_text: 'Payment confirmed (demo).'
          }
        ])
      if (msgErr) throw msgErr

      // Optional: navigate back to order details
      router.push(`/orders/${order.id}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => router.back()} className="mb-4 text-green-600 hover:underline">&larr; Back</button>

        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Proceed to Payment</h1>
          <p className="text-gray-600 mb-6">Order #{order?.id?.substring(0, 8)}</p>

          <div className="space-y-4">
            <div>
              <p className="font-medium text-gray-800 mb-2">Choose a payment method</p>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                  />
                  <span>Credit/Debit Card</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="payment"
                    value="bkash"
                    checked={paymentMethod === 'bkash'}
                    onChange={() => setPaymentMethod('bkash')}
                  />
                  <span>bKash</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="payment"
                    value="nagad"
                    checked={paymentMethod === 'nagad'}
                    onChange={() => setPaymentMethod('nagad')}
                  />
                  <span>Nagad</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleConfirmPayment}
              disabled={submitting}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Confirm and Pay (Demo)'}
            </button>

            <p className="text-xs text-gray-500">This is a demo payment screen. No real payment is processed.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
