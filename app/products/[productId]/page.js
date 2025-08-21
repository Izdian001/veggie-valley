// Updated Product Detail page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { wishlistUtils } from '@/lib/wishlistUtils';
import WishlistButton from '@/components/ui/wishlist-button';
import Link from 'next/link';

export default function ProductDetail() {
  const router = useRouter();
  const params = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [sellerProfile, setSellerProfile] = useState(null);
  const [sellerStore, setSellerStore] = useState(null);

  useEffect(() => {
    fetchUser();
    if (params.productId) {
      loadProduct();
    }
  }, [params.productId]);

  useEffect(() => {
    // Migrate localStorage wishlist when user is loaded
    if (user) {
      wishlistUtils.migrateLocalStorageWishlist();
    }
  }, [user]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (!error) {
        setUser({ ...user, role: profile.role });
      }
    }
  };

  const loadProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', params.productId)
        .or('is_approved.is.true,status.eq.active,status.eq.approved,status.is.null')
        .single();

      if (error) throw error;
      setProduct(data);

      // Separately load seller profile and store (no relational joins)
      if (data?.seller_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, address, phone')
          .eq('id', data.seller_id)
          .single();
        setSellerProfile(profile || null);

        const { data: store } = await supabase
          .from('seller_profiles')
          .select('farm_name, bio, years_farming, cover_image_url, rating, total_reviews')
          .eq('id', data.seller_id)
          .single();
        setSellerStore(store || null);
      }
    } catch (error) {
      console.error('Error loading product:', error);
      router.push('/products');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      alert('Please sign in to place an order');
      router.push('/auth');
      return;
    }

    if (orderQuantity < product.min_order_quantity) {
      alert(`Minimum order quantity is ${product.min_order_quantity} ${product.unit}`);
      return;
    }

    if (orderQuantity > product.quantity_available) {
      alert(`Only ${product.quantity_available} ${product.unit} available`);
      return;
    }

    setPlacingOrder(true);
    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          buyer_id: user.id,
          seller_id: product.seller_id,
          product_id: product.id,
          quantity: orderQuantity,
          unit_price: product.price,
          total_amount: product.price * orderQuantity,
          status: 'pending',
          order_date: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const { error: updateError } = await supabase
        .from('products')
        .update({
          quantity_available: product.quantity_available - orderQuantity
        })
        .eq('id', product.id);

      if (updateError) throw updateError;

      alert('Order placed successfully! The seller will be notified.');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Error placing order. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠</div>
          <p className="text-gray-600">Product not found</p>
          <button
            onClick={() => router.push('/products')}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Veggie Valley</h1>
            <div className="space-x-3">
              <Link
                href="/products"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Browse Products
              </Link>
              {!loading && user && user.role === 'buyer' && (
                <Link
                  href="/wishlist"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Wishlist
                </Link>
              )}
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Dashboard
              </Link>
              {!loading && user ? (
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push('/');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Sign Out
                </button>
              ) : (
                <Link
                  href="/auth"
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="relative">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-96 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-96 flex items-center justify-center text-8xl bg-gray-100 rounded-lg">🥬</div>
              )}
              {/* Wishlist button overlay */}
              <div className="absolute top-4 right-4">
                <WishlistButton productId={product.id} size="large" />
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
                <WishlistButton productId={product.id} size="large" />
              </div>
              <p className="text-xl text-green-600 mt-2">₹{product.price}/{product.unit}</p>
            </div>

            <p className="text-gray-700">{product.description}</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Available</p>
                <p className="text-lg font-medium text-gray-900">{product.quantity_available} {product.unit}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Min Order</p>
                <p className="text-lg font-medium text-gray-900">{product.min_order_quantity} {product.unit}</p>
              </div>
              {product.expiry_date && (
                <div>
                  <p className="text-sm text-gray-500">Expiry Date</p>
                  <p className="text-lg font-medium text-gray-900">
                    {new Date(product.expiry_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              {product.harvest_date && (
                <div>
                  <p className="text-sm text-gray-500">Harvest Date</p>
                  <p className="text-lg font-medium text-gray-900">
                    {new Date(product.harvest_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Order Section */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Place Order</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity ({product.unit})
                  </label>
                  <input
                    type="number"
                    min={product.min_order_quantity}
                    max={product.quantity_available}
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Min: {product.min_order_quantity} {product.unit} | Max: {product.quantity_available} {product.unit}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-gray-900">Total Amount:</span>
                    <span className="text-2xl font-bold text-green-600">
                      ₹{(product.price * orderQuantity).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handlePlaceOrder}
                    disabled={placingOrder || orderQuantity < product.min_order_quantity || orderQuantity > product.quantity_available}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  >
                    {placingOrder ? 'Placing Order...' : 'Place Order'}
                  </button>
                  
                  <WishlistButton 
                    productId={product.id} 
                    showText={true} 
                    size="default"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl text-green-600">
                    {sellerProfile?.full_name?.[0]?.toUpperCase() || 'F'}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {sellerStore?.farm_name || 'Local Farm'}
                  </h3>
                  <p className="text-gray-600">{sellerProfile?.full_name || 'Seller'}</p>
                  {sellerProfile?.address && (
                    <p className="text-sm text-gray-500">📍 {sellerProfile.address}</p>
                  )}
                </div>
              </div>

              {sellerStore?.bio && (
                <p className="text-gray-700 mb-4">{sellerStore.bio}</p>
              )}

              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push(`/seller/${product.seller_id}`)}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  View Seller Store
                </button>
                {sellerProfile?.phone && (
                  <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    📞 Contact
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}