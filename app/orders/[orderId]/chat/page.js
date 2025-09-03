'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import ChatWindow from '@/components/messaging/ChatWindow'

export default function ChatPage({ params }) {
  const router = useRouter()
  const { orderId } = params
  const [order, setOrder] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const initializeChat = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setUser(user)

      try {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select(`
            *,
            seller:seller_id ( id, full_name ),
            buyer:buyer_id ( id, full_name )
          `)
          .eq('id', orderId)
          .single()

        if (orderError) throw orderError

        // Security check
        if (user.id !== orderData.buyer_id && user.id !== orderData.seller_id) {
          throw new Error('You are not authorized to access this chat.')
        }

        setOrder(orderData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    initializeChat()
  }, [orderId, router])

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button 
          onClick={() => router.back()}
          className="mb-4 text-green-600 hover:underline"
        >
          &larr; Back to Order Details
        </button>
        {order && user && <ChatWindow order={order} initialUser={user} />}
      </div>
    </div>
  )
}
