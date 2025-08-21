// Updated Products page.js with wishlist integration
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { wishlistUtils } from '@/lib/wishlistUtils';
import WishlistButton from '@/components/ui/wishlist-button';
import Link from 'next/link';

export default function Products() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [user, setUser] = useState(null);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    loadProducts();
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      // Migrate localStorage wishlist when user loads
      wishlistUtils.migrateLocalStorageWishlist();
      loadWishlistCount();
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

  const loadWishlistCount = async () => {
    try {
      const count = await wishlistUtils.getWishlistCount();
      setWishlistCount(count);
    } catch (error) {
      console.error('Error loading wishlist count:', error);
    }
  };

  const loadProducts = async () => {
    try {
      console.log('Loading products...');
      
      // Get all visible products with seller information
      const { data, error } = await supabase
        .from('products')
        .select('*')
        // Visible if any of these match (supports schemas that use either is_approved or status)
        .or('is_approved.is.true,status.eq.active,status.eq.approved,status.is.null')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Products loaded:', data);
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           product.categories?.name?.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(products.map(p => p.categories?.name).filter(Boolean)))];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Fresh Products</h1>
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
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 relative"
                >
                  Wishlist
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {wishlistCount > 99 ? '99+' : wishlistCount}
                    </span>
                  )}
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
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Products</label>
              <input
                type="text"
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
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
                  <WishlistButton productId={product.id} />
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
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xs text-green-600">
                      {product.profiles?.full_name?.[0]?.toUpperCase() || 'F'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">{product.seller_profiles?.farm_name || 'Local Farm'}</span>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => router.push(`/products/${product.id}`)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium"
                  >
                    View Details
                  </button>
                  <WishlistButton 
                    productId={product.id} 
                    showText={true} 
                    size="small"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🥬</div>
            <p className="text-gray-600">No products found</p>
            <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </main>
    </div>
  );
}