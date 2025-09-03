"use client";

import { useEffect, useState } from 'react';
import { formatBDT } from '@/lib/currency';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import ChatWindow from '@/components/messaging/ChatWindow';
import Link from 'next/link';

export default function SellerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeStatus, setActiveStatus] = useState('all');
  const [loadingStates, setLoadingStates] = useState({});
  const [activeChat, setActiveChat] = useState(null); // Track which chat is active
  const router = useRouter();

  useEffect(() => {
    const fetchUserAndOrders = async () => {
      try {
        // Get current user
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!currentUser) {
          router.push('/auth');
          return;
        }
        
        setUser(currentUser);

        // Get seller profile - first let's see what columns exist
        console.log('Fetching seller profile for user ID:', currentUser.id);
        
        // First, let's get a list of all columns in seller_profiles
        const { data: columns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name')
          .eq('table_name', 'seller_profiles');
          
        console.log('Available columns in seller_profiles:', columns);
        
        // Now try to fetch the seller profile with the most likely column names
        let sellerProfile;
        let profileError;
        
        // Try with common column names
        const possibleColumns = ['id', 'user_id', 'userid', 'uid', 'user_uid'];
        
        for (const column of possibleColumns) {
          console.log(`Trying to fetch with column: ${column}`);
          const { data, error } = await supabase
            .from('seller_profiles')
            .select('*')
            .eq(column, currentUser.id)
            .single();
            
          if (!error && data) {
            sellerProfile = data;
            console.log(`Found seller profile using column: ${column}`, sellerProfile);
            break;
          } else {
            console.log(`No match with column: ${column}`, error);
          }
        }
        
        if (!sellerProfile) {
          // If we still don't have a profile, try to get all profiles to see the structure
          console.log('Could not find profile with direct lookup, fetching all profiles to check structure...');
          const { data: allProfiles, error: allProfilesError } = await supabase
            .from('seller_profiles')
            .select('*')
            .limit(5);
            
          if (!allProfilesError && allProfiles && allProfiles.length > 0) {
            console.log('First few seller profiles:', allProfiles);
            
            // Try to find a profile that might match the current user
            const matchingProfile = allProfiles.find(profile => 
              profile.id === currentUser.id || 
              profile.user_id === currentUser.id ||
              profile.userid === currentUser.id
            );
            
            if (matchingProfile) {
              sellerProfile = matchingProfile;
              console.log('Found matching profile in full table scan:', matchingProfile);
            }
          }
        }
        
        if (!sellerProfile) {
          console.error('No seller profile found for user after all attempts:', currentUser.id);
          alert('No seller profile found. Please complete your seller profile first.');
          router.push('/seller/profile');
          return;
        }

        // Build the orders query
        let query = supabase
          .from('orders')
          .select(`
            *,
            buyer:buyer_id(*),
            order_items(*, product:product_id(*))
          `)
          .eq('seller_id', sellerProfile.id)
          .order('created_at', { ascending: false });

        // Apply status filter if not 'all'
        if (activeStatus !== 'all') {
          query = query.eq('status', activeStatus);
        }

        const { data: ordersData, error: ordersError } = await query;
        if (ordersError) throw ordersError;

        setOrders(ordersData || []);
      } catch (error) {
        console.error('Error:', error);
        alert('Failed to load orders: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndOrders();
  }, [activeStatus, router]);

  // Get count of orders for each status
  const getStatusCount = (status) => {
    if (status === 'all') return orders.length;
    return orders.filter(order => order.status === status).length;
  };

  // Status tabs configuration
  const statusTabs = [
    { id: 'all', label: 'All', count: getStatusCount('all') },
    { id: 'pending', label: 'Pending', count: getStatusCount('pending') },
    { id: 'confirmed', label: 'Confirmed', count: getStatusCount('confirmed') },
    { id: 'shipped', label: 'Shipped', count: getStatusCount('shipped') },
    { id: 'delivered', label: 'Delivered', count: getStatusCount('delivered') },
  ];

  // Status options for dropdown
  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
    { value: 'shipped', label: 'Shipped', color: 'bg-purple-100 text-purple-800' },
    { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  ];

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    setLoadingStates(prev => ({ ...prev, [orderId]: true }));
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    } finally {
      setLoadingStates(prev => ({ ...prev, [orderId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg font-medium">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 mx-auto">
      <div className="flex flex-col justify-between mb-8 md:items-center md:flex-row">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order List</h1>
          <p className="mt-1 text-sm text-gray-500">Manage and track your orders here</p>
        </div>
        <Link 
          href="/seller/dashboard"
          className="px-4 py-2 mt-4 text-sm font-medium text-white bg-green-600 rounded-md md:mt-0 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Status Tabs */}
      <div className="flex mb-6 overflow-x-auto border-b border-gray-200">
        {statusTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveStatus(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
              activeStatus === tab.id
                ? 'border-b-2 border-green-500 text-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col mb-6 space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search orders..."
            className="w-full py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <select className="px-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500">
          <option>All Time</option>
          <option>Today</option>
          <option>Last 7 days</option>
          <option>This Month</option>
          <option>Last Month</option>
        </select>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-lg shadow">
            <p className="text-gray-500">No orders found</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="block transition-colors hover:bg-gray-50">
              <div className="p-4 bg-white rounded-lg shadow">
                <div className="flex flex-col justify-between md:items-center md:flex-row">
                  <div className="mb-2 md:mb-0">
                    <p className="font-medium text-gray-900">Order #{order.id.split('-')[0]}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        disabled={loadingStates[order.id]}
                        className={`px-3 py-1 text-xs font-medium rounded-full appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                          statusOptions.find(s => s.value === order.status)?.color || 'bg-gray-100'
                        }`}
                      >
                        {statusOptions.map((option) => (
                          <option 
                            key={option.value} 
                            value={option.value}
                            className="bg-white text-gray-900"
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      {loadingStates[order.id] && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 rounded-full">
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => setActiveChat(activeChat === order.id ? null : order.id)}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-full hover:bg-green-700"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Message</span>
                    </button>
                    <span className="font-medium">{formatBDT(order.total_amount)}</span>
                  </div>
                </div>
                
                {/* Chat Window */}
                {activeChat === order.id && (
                  <div className="mt-4 p-4 border-t border-gray-200">
                    <ChatWindow 
                      order={{
                        id: order.id,
                        buyer_id: order.buyer_id,
                        seller_id: user.id,  
                        buyer: order.buyer,
                        seller: { 
                          id: user.id,
                          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Seller',
                          email: user.email
                        }
                      }} 
                      initialUser={{
                        id: user.id,
                        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Seller',
                        email: user.email
                      }}
                    />
                  </div>
                )}
                
                {/* Order Items */}
                <div className="mt-4 space-y-2">
                  {order.order_items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-t border-gray-100">
                      <div className="flex items-center space-x-3">
                        {item.product?.images?.[0] ? (
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="object-cover w-10 h-10 rounded"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.product?.name || 'Product not found'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.quantity} × {formatBDT(item.unit_price)}
                          </p>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatBDT(item.quantity * item.unit_price)}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Customer Info */}
                <div className="pt-3 mt-3 border-t border-gray-100">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Customer:</span> {order.buyer?.full_name || 'Guest'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Phone:</span> {order.phone || order.buyer?.phone || 'N/A'}
                    </p>
                    {order.delivery_address && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Address:</span> {order.delivery_address}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
