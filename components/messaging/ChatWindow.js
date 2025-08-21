'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import MessageItem from './MessageItem'
import MessageForm from './MessageForm'

export default function ChatWindow({ order, initialUser }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id ( id, full_name )
        `)
        .eq('order_id', order.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [order.id])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Set up Supabase real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${order.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${order.id}` },
        (payload) => {
          // This is a bit of a hack to get sender info without another fetch
          const sender = payload.new.sender_id === initialUser.id 
            ? { id: initialUser.id, full_name: initialUser.user_metadata.full_name }
            : { id: order.buyer_id === initialUser.id ? order.seller_id : order.buyer_id, full_name: order.buyer_id === initialUser.id ? order.seller.full_name : order.buyer.full_name }
          
          setMessages(currentMessages => [...currentMessages, {...payload.new, sender}])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [order, initialUser])

  const handleNewMessage = async (messageText) => {
    try {
      const receiverId = initialUser.id === order.buyer_id ? order.seller_id : order.buyer_id
      
      const { error } = await supabase
        .from('messages')
        .insert({
          order_id: order.id,
          sender_id: initialUser.id,
          receiver_id: receiverId,
          message_text: messageText
        })

      if (error) throw error
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p>Loading messages...</p>
  if (error) return <p className="text-red-600">Error: {error}</p>

  return (
    <div className="bg-white rounded-lg shadow h-[60vh] flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Chat for Order #{order.id.substring(0, 8)}</h2>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map(msg => (
              <MessageItem key={msg.id} message={msg} currentUser={initialUser} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="text-center text-gray-500 h-full flex items-center justify-center">
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
      </div>
      <div className="p-4 border-t">
        <MessageForm onSendMessage={handleNewMessage} />
      </div>
    </div>
  )
}
