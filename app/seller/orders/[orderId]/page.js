"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  const params = useParams();
  const orderId = params?.orderId;

  console.log('Component mounted with orderId:', orderId);

  useEffect(() => {
    console.log('useEffect triggered with orderId:', orderId);
    
    if (!orderId) {
      console.error('No orderId found in URL');
      return;
    }

    const fetchOrder = async () => {
      try {
        console.log('Starting to fetch order...');
        setLoading(true);
        
        // First, get the basic order data only
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        console.log('Order fetch response:', { data: orderData, error: orderError });

        if (orderError) throw orderError;
        if (!orderData) throw new Error('Order not found');
        
        console.log('Order data:', orderData);
        
        // Set basic order data first
        setOrder({
          ...orderData,
          order_items: [],
          buyer: null,
          seller: null
        });
        
        // Then fetch buyer and seller profiles
        const [buyerRes, sellerRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .eq('id', orderData.buyer_id)
            .single(),
          supabase
            .from('profiles')
            .select('*')
            .eq('id', orderData.seller_id)
            .single()
        ]);
        
        if (buyerRes.error) console.error('Buyer fetch error:', buyerRes.error);
        if (sellerRes.error) console.error('Seller fetch error:', sellerRes.error);
        
        // Finally, fetch order items
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId);
          
        if (itemsError) console.error('Order items fetch error:', itemsError);
        
        // Update with all data
        setOrder(prev => ({
          ...prev,
          order_items: orderItems || [],
          buyer: buyerRes.data || null,
          seller: sellerRes.data || null
        }));
        
      } catch (error) {
        console.error('Error in fetchOrder:', error);
        alert(`Error loading order: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const updateOrderStatus = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      // Update local state
      setOrder(prev => ({
        ...prev,
        status: newStatus
      }));
      
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg font-medium">Loading order details...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-gray-900">Order Not Found</h1>
        <p className="mt-2 text-gray-600">The requested order could not be found.</p>
        <Link href="/seller/orders" className="mt-4 text-green-600 hover:underline">
          ← Back to Orders
        </Link>
      </div>
    );
  }

  if (order) {
    console.log('Order data:', order);
    console.log('Buyer data:', order.buyer);
    console.log('Seller data:', order.seller);
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
              {order?.created_at ? new Date(order.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : 'N/A'}
            </span>
          </div>
        </div>
        
        {/* Always show chat button */}
        <Button 
          variant="outline" 
          onClick={() => setShowChat(!showChat)}
          className="flex items-center gap-2 bg-white hover:bg-gray-50"
        >
          <MessageSquare className="w-4 h-4" />
          {showChat ? 'Hide Chat' : 'Message Buyer'}
        </Button>
      </div>

      {showChat && (
        <div className="mb-8 p-4 border rounded-lg bg-white">
          <h2 className="text-lg font-medium mb-4">Chat with Buyer</h2>
          {order?.buyer && order?.seller ? (
            <ChatWindow 
              order={{
                ...order,
                buyer_id: order.buyer.id,
                seller_id: order.seller.id,
                buyer: order.buyer,
                seller: order.seller
              }} 
              initialUser={order.seller} 
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Unable to load chat. Please refresh the page.</p>
            </div>
          )}
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="mb-4 text-lg font-medium">Order Items</h2>
            <div className="divide-y divide-gray-200">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex py-4">
                  {item.product?.images?.[0] && (
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="object-cover w-16 h-16 rounded"
                    />
                  )}
                  <div className="flex-1 ml-4">
                    <h3 className="font-medium text-gray-900">{item.product?.name || 'Product not found'}</h3>
                    <p className="text-sm text-gray-500">
                      {item.quantity} × {formatBDT(item.unit_price)} = {formatBDT(item.quantity * item.unit_price)}
                    </p>
                    {item.product?.unit && (
                      <p className="text-xs text-gray-500">Unit: {item.product.unit}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-4 mt-4 border-t">
              <span className="font-medium">Total</span>
              <span className="font-bold">{formatBDT(order.total_amount)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="mb-4 text-lg font-medium">Customer Information</h2>
            <div className="space-y-2">
              <p className="font-medium">{order.buyer?.full_name || 'Guest'}</p>
              <p className="text-sm text-gray-600">{order.buyer?.email || 'No email'}</p>
              <p className="text-sm text-gray-600">{order.phone || 'No phone'}</p>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-500">Delivery Address</h3>
                <p className="text-sm text-gray-700">{order.delivery_address || 'No address provided'}</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="mb-4 text-lg font-medium">Update Status</h2>
            <div className="space-y-2">
              <button
                onClick={() => updateOrderStatus('processing')}
                disabled={order.status !== 'pending'}
                className={`w-full px-4 py-2 text-sm font-medium text-left rounded-md ${
                  order.status === 'processing' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'hover:bg-gray-50'
                }`}
              >
                Mark as Processing
              </button>
              <button
                onClick={() => updateOrderStatus('shipped')}
                disabled={order.status !== 'processing'}
                className={`w-full px-4 py-2 text-sm font-medium text-left rounded-md ${
                  order.status === 'shipped' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'hover:bg-gray-50'
                }`}
              >
                Mark as Shipped
              </button>
              <button
                onClick={() => updateOrderStatus('delivered')}
                disabled={order.status !== 'shipped'}
                className={`w-full px-4 py-2 text-sm font-medium text-left rounded-md ${
                  order.status === 'delivered' 
                    ? 'bg-green-100 text-green-800' 
                    : 'hover:bg-gray-50'
                }`}
              >
                Mark as Delivered
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
