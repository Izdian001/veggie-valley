"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { formatBDT } from '@/lib/currency';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import ChatWindow from '@/components/messaging/ChatWindow';

export default function OrderDetails() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = useParams();

  console.log('Component mounted with id:', id);

  useEffect(() => {
    console.log('useEffect triggered with id:', id);
    
    if (!id) {
      console.error('No order ID found in URL');
      return;
    }

    const fetchOrder = async () => {
      try {
        console.log('Starting to fetch order...');
        setLoading(true);
        
        // First, get the basic order data only
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', id)
          .single();

        console.log('Order fetch response:', { data, error });

        if (error) throw error;
        if (!data) throw new Error('Order not found');
        
        setOrder({
          ...data,
          order_items: [],
          buyer: null,
          seller: null
        });
        
      } catch (error) {
        console.error('Error in fetchOrder:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  // Check for chat query parameter on component mount
  useEffect(() => {
    const chatParam = searchParams.get('chat');
    if (chatParam === 'true') {
      setShowChat(true);
    }
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-gray-900">Order Not Found</h1>
        <p className="mt-2 text-gray-600">The requested order could not be loaded.</p>
        <Link href="/seller/orders" className="mt-4 text-green-600 hover:underline">
          ← Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href="/seller/orders" className="inline-flex items-center text-sm text-green-600 hover:underline">
          ← Back to Orders
        </Link>
      </div>
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Order #{order?.id?.split('-')[0] || 'N/A'}</h1>
          <div className="flex items-center mt-2 space-x-4">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
              order?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              order?.status === 'processing' ? 'bg-blue-100 text-blue-800' :
              order?.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
              'bg-green-100 text-green-800'
            }`}>
              {order?.status ? (order.status.charAt(0).toUpperCase() + order.status.slice(1)) : 'N/A'}
            </span>
            <span className="text-sm text-gray-500">
              {new Date(order.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Order details content */}
      <div className="mb-8">
        {/* Your existing order details code */}
      </div>

      {/* Chat Window - Only show if chat is open */}
      {showChat && (
        <div className="mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Chat with Buyer</h2>
            <button
              onClick={() => setShowChat(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {order?.buyer ? (
            <ChatWindow 
              order={{
                ...order,
                buyer_id: order.buyer.id,
                seller_id: order.seller?.id,
                buyer: order.buyer,
                seller: order.seller
              }} 
              initialUser={order.seller} 
            />
          ) : (
            <div className="p-4 text-center text-gray-500 bg-white rounded-md">
              <p>Loading chat data...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
