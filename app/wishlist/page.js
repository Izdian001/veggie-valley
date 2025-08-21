// Updated Wishlist page.js
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { wishlistUtils } from '@/lib/wishlistUtils';
import WishlistButton from '@/components/ui/wishlist-button';
import Link from 'next/link';

export default function WishlistPage() {
  const router = useRouter();
  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuthAndLoadWishlist();
  }, []);

  const checkAuthAndLoadWishlist = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth');
        return;
      }

      setUser(user);

      // Migrate localStorage wishlist first
      await wishlistUtils.migrateLocalStorageWishlist();
      
      // Then load the wishlist
      await loadWishlist();
    } catch (error) {
      console.error('Error loading wishlist:', error);
      setError('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const loadWishlist = async () => {
    try {
      const wishlistData = await wishlistUtils.getUserWishlist();
      setWishlistProducts(wishlistData);
    } catch (error) {
      console.error('Error loading wishlist:', error);
      setError('Failed to load wishlist');
    }
  };

  const handleRemoveFromWishlist = async (productId) => {
    try {
      await wishlistUtils.removeFromWishlist(productId);
      // Remove from local state immediately for better UX
      setWishlistProducts(prev => prev.filter(product => product.id !== productId));
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      alert('Failed to remove from wishlist. Please try again.');
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Try Again
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
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
              {wishlistProducts.length > 0 && (
                <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                  {wishlistProducts.length} item{wishlistProducts.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="space-x-3">
              <Link
                href="/products"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Browse Products
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {wishlistProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="aspect-square bg-gray-100 rounded-t-lg flex items-center justify-center relative">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="text-4xl">🥬</div>
                  )}
                  {/* Wishlist button overlay */}
                  <div className="absolute top-2 right-2">
                    <WishlistButton 
                      productId={product.id} 
                      size="default"
                    />
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 flex-1">{product.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-green-600">₹{product.price}/{product.unit}</span>
                    <span className="text-sm text-gray-500">{product.quantity_available} available</span>
                  </div>
                  
                  {/* Product status */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-xs text-green-600">
                          {product.seller_profiles?.farm_name?.[0]?.toUpperCase() || 'F'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">{product.seller_profiles?.farm_name || 'Local Farm'}</span>
                    </div>
                    {product.quantity_available === 0 && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                        Out of Stock
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={() => router.push(`/products/${product.id}`)}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium"
                    >
                      View Details
                    </button>
                    
                    <button
                      onClick={() => handleRemoveFromWishlist(product.id)}
                      className="w-full px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium"
                    >
                      Remove from Wishlist
                    </button>
                  </div>

                  {/* Added to wishlist date */}
                  {product.added_to_wishlist_at && (
                    <p className="text-xs text-gray-400 mt-2">
                      Added {new Date(product.added_to_wishlist_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-6">🥬</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-600 mb-6">
              Browse our fresh products and add your favorites to your wishlist!
            </p>
            <Link
              href="/products"
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Browse Products
            </Link>
          </div>
        )}

        {/* Quick stats */}
        {wishlistProducts.length > 0 && (
          <div className="mt-12 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Wishlist Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{wishlistProducts.length}</div>
                <div className="text-sm text-gray-500">Items in Wishlist</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {wishlistProducts.filter(p => p.quantity_available > 0).length}
                </div>
                <div className="text-sm text-gray-500">Available Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ₹{wishlistProducts.reduce((sum, p) => sum + (p.price || 0), 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">Total Value (approx.)</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}