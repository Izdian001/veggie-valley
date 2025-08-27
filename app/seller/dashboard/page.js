'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function SellerDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [baseProfile, setBaseProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    checkUser()
  }, [])

  // No longer redirecting to profile setup - users can edit profile later

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'seller') {
      router.push('/auth')
      return
    }
    setUser(user)
    
    // Get base profile
    const { data: baseProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    // Get seller profile
    const { data: sellerProfile } = await supabase
      .from('seller_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    setBaseProfile(baseProfile)
    setProfile(sellerProfile)
    setLoading(false)

    // Load initial pending orders count
    fetchPendingCount(user.id)

    // Realtime updates for orders belonging to this seller
    const channel = supabase
      .channel(`orders-seller-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `seller_id=eq.${user.id}` },
        () => {
          fetchPendingCount(user.id)
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      try { supabase.removeChannel(channel) } catch {}
    }
  }

  const fetchPendingCount = async (sellerId) => {
    const { count, error } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .eq('status', 'pending')
    if (!error && typeof count === 'number') setPendingCount(count)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/seller/profile/edit')}
                className="px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700"
              >
                Edit Profile
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center space-x-4">
            {profile?.cover_image_url ? (
              <img
                src={profile.cover_image_url}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Welcome back, {baseProfile?.full_name || user?.user_metadata?.full_name}!
              </h2>
              <p className="text-gray-600">
                {profile?.farm_name ? `Farm: ${profile.farm_name}` : 'Complete your profile to get started'}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        {profile && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Farm Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Farm Name:</span>
                  <p className="text-gray-900">{profile.farm_name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Location:</span>
                  <p className="text-gray-900">{baseProfile?.address || 'Not specified'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Years of Farming:</span>
                  <p className="text-gray-900">{profile.years_farming || 0} years</p>
                </div>
                {baseProfile?.phone && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Phone:</span>
                    <p className="text-gray-900">{baseProfile.phone}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-gray-500">Rating:</span>
                  <p className="text-gray-900">{profile.rating || 0} ⭐ ({profile.total_reviews || 0} reviews)</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Status:</span>
                  <p className="text-sm font-medium text-green-600">
                    ✅ Approved
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">About Your Farm</h3>
              <p className="text-gray-700">{profile.bio || 'No description provided'}</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/seller/products/new')}
              className="p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all text-center"
            >
              <div className="text-2xl mb-2">➕</div>
              <h4 className="font-medium text-gray-900">Add Product</h4>
              <p className="text-sm text-gray-600">List new vegetables</p>
            </button>

            <button
              onClick={() => router.push('/seller/products')}
              className="p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-center"
            >
              <div className="text-2xl mb-2">📦</div>
              <h4 className="font-medium text-gray-900">Manage Products</h4>
              <p className="text-sm text-gray-600">View and edit listings</p>
            </button>

            <button
              onClick={() => router.push('/seller/orders')}
              className="relative p-4 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all text-center"
            >
              {/* Notification badge */}
              {pendingCount > 0 && (
                <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 min-w-[1.5rem] h-6 text-xs font-bold leading-none text-white bg-red-600 rounded-full shadow">
                  {pendingCount}
                </span>
              )}
              <div className="text-2xl mb-2">📋</div>
              <h4 className="font-medium text-gray-900">View Orders</h4>
              <p className="text-sm text-gray-600">Check customer orders</p>
            </button>
          </div>
        </div>

        {/* Profile Completion Warning */}
        {!profile && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Complete your profile
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    To start selling, please complete your seller profile with your farm details.
                  </p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => router.push('/seller/profile/edit')}
                    className="bg-yellow-400 px-4 py-2 rounded-md text-sm font-medium text-yellow-900 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
                  >
                    Complete Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 