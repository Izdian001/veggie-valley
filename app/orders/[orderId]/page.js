'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ReviewForm from '@/components/reviews/ReviewForm';
import ReviewList from '@/components/reviews/ReviewList';

export default function OrderDetailsPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get('payment');
  const { orderId } = params;
  const [order, setOrder] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [hasReviewed, setHasReviewed] = useState(false);

  const fetchOrderAndReviews = useCallback(async (currentUser) => {
    setLoading(true);
    setError('');
    try {
      const { data: orderRow, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      if (currentUser.id !== orderRow.buyer_id && currentUser.id !== orderRow.seller_id) {
        throw new Error('You are not authorized to view this order.');
      }

      const ids = [orderRow.buyer_id, orderRow.seller_id].filter(Boolean);
      let buyerProfile = null;
      let sellerProfile = null;
      if (ids.length) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, address, phone')
          .in('id', ids);
        if (profilesError) throw profilesError;
        buyerProfile = profilesData.find(p => p.id === orderRow.buyer_id) || null;
        sellerProfile = profilesData.find(p => p.id === orderRow.seller_id) || null;
      }

      let productInfo = null;
      if (orderRow.product_id) {
        const { data: prod, error: prodErr } = await supabase
          .from('products')
          .select('id, name, unit, price')
          .eq('id', orderRow.product_id)
          .single();
        if (!prodErr) productInfo = prod;
      }

      const orderData = {
        ...orderRow,
        seller: sellerProfile,
        buyer: buyerProfile,
        product: productInfo
      };

      setOrder(orderData);

      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .select(`
          *,
          buyer_name:buyer_id ( full_name )
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (reviewError) throw reviewError;

      setReviews(reviewData.map(r => ({ ...r, buyer_name: r.buyer_name.full_name })));

      const userReview = reviewData.find(r => r.buyer_id === currentUser.id);
      setHasReviewed(!!userReview);

    } catch (err) {
      setError(err.message);
      console.error('Error fetching order details:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUser(user);
      fetchOrderAndReviews(user);
    };
    getCurrentUser();
  }, [router, fetchOrderAndReviews]);

  const handleReviewSubmitted = () => {
    if (user) {
      fetchOrderAndReviews(user);
    }
  };

  const handlePayment = async () => {
    try {
      const response = await fetch('/api/payment/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, total: order.total_price || (order.product?.price * order.quantity) }),
      });
      const { GatewayPageURL } = await response.json();
      if (GatewayPageURL) {
        window.location.href = GatewayPageURL;
      } else {
        alert('Payment initiation failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Error initiating payment.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <p>Order not found.</p>
      </div>
    );
  }

  const isBuyer = user?.id === order.buyer_id;
  const canReview = isBuyer && !hasReviewed;

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
          <div className="w-16" />
        </div>

        {/* Payment Feedback */}
        {paymentStatus === 'success' && (
          <div className="bg-green-100 text-green-800 p-4 rounded mb-4">
            Payment successful! Order status updated.
          </div>
        )}
        {paymentStatus === 'fail' && (
          <div className="bg-red-100 text-red-800 p-4 rounded mb-4">
            Payment failed. Please try again.
          </div>
        )}
        {paymentStatus === 'cancel' && (
          <div className="bg-yellow-100 text-yellow-800 p-4 rounded mb-4">
            Payment cancelled.
          </div>
        )}
        {paymentStatus === 'error' && (
          <div className="bg-red-100 text-red-800 p-4 rounded mb-4">
            An error occurred during payment processing.
          </div>
        )}

        {/* Order Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Order #{order.id.substring(0, 8)}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><p><strong>Status:</strong> {order.status}</p></div>
            <div><p><strong>Total:</strong> ${order.total_price || (order.product?.price ? (order.product.price * order.quantity).toFixed(2) : '—')}</p></div>
            <div><p><strong>Seller:</strong> {order.seller?.full_name || 'Not provided'}</p></div>
            <div><p><strong>Buyer:</strong> {order.buyer?.full_name || 'Not provided'}</p></div>
          </div>
          <div className="mt-6 space-y-4">
            {isBuyer && order.status === 'pending' && (
              <button
                onClick={handlePayment}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
              >
                Make Payment
              </button>
            )}
            <button
              onClick={() => router.push(`/orders/${order.id}/chat`)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
            >
              Message About This Order
            </button>
          </div>
        </div>

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
  );
};