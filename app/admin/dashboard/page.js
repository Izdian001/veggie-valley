'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AdminRouteGuard from '@/components/auth/AdminRouteGuard'

export default function AdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSellers: 0,
    totalProducts: 0,
    pendingReviews: 0
  })
  const [lastUpdated, setLastUpdated] = useState(null)

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true)
      console.log('Loading admin stats...')
      
      // Get total users (all profiles)
      const { count: totalUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      if (usersError) {
        console.error('Error loading users:', usersError)
      }

      // Get all sellers (both approved and pending)
      const { count: activeSellers, error: sellersError } = await supabase
        .from('seller_profiles')
        .select('*', { count: 'exact', head: true })

      if (sellersError) {
        console.error('Error loading sellers:', sellersError)
      }

      // Get all products (both approved and pending)
      const { count: totalProducts, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      if (productsError) {
        console.error('Error loading products:', productsError)
      }

      // Try to get pending reviews (content flags) - handle if table doesn't exist
      let pendingReviews = 0
      try {
        const { count: reviewsCount, error: reviewsError } = await supabase
          .from('content_flags')
          .select('*', { count: 'exact', head: true })
          .eq('is_resolved', false)
        
        if (reviewsError) {
          console.error('Error loading reviews:', reviewsError)
        } else {
          pendingReviews = reviewsCount || 0
        }
      } catch (error) {
        console.log('Content flags table not available, setting pending reviews to 0')
        pendingReviews = 0
      }

      const newStats = {
        totalUsers: totalUsers || 0,
        activeSellers: activeSellers || 0,
        totalProducts: totalProducts || 0,
        pendingReviews: pendingReviews
      }

      console.log('New stats loaded:', newStats)
      setStats(newStats)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Get current user immediately
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        setLoading(false)
        // Load stats immediately after user is loaded
        loadStats()
      }
    }
    getUser()
  }, [loadStats])

  useEffect(() => {
    // Set up real-time updates
    const interval = setInterval(() => {
      console.log('Refreshing admin stats...')
      loadStats()
    }, 30000) // Update every 30 seconds
    
    return () => clearInterval(interval)
  }, [loadStats])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const navigateToSection = (section) => {
    switch (section) {
      case 'sellers':
        window.location.href = '/admin/sellers'
        break
      case 'users':
        window.location.href = '/admin/users'
        break
      case 'reports':
        window.location.href = '/admin/reports'
        break
      case 'moderation':
        window.location.href = '/admin/moderation'
        break
      case 'settings':
        window.location.href = '/admin/settings'
        break
      default:
        break
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <AdminRouteGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={loadStats}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50"
                  disabled={statsLoading}
                >
                  {statsLoading ? (
                    <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    '🔄 Refresh Stats'
                  )}
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
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Welcome, Admin {user?.user_metadata?.full_name || 'User'}!
                </h2>
                <p className="text-gray-600">
                  Manage the Veggie Valley platform
                </p>
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Manage Sellers</h3>
                <div className="text-2xl">👥</div>
              </div>
              <p className="text-gray-600 mb-4">Approve or reject seller applications</p>
              <button
                onClick={() => navigateToSection('sellers')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                View Sellers
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                <div className="text-2xl">👤</div>
              </div>
              <p className="text-gray-600 mb-4">Manage all platform users</p>
              <button
                onClick={() => navigateToSection('users')}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
              >
                Manage Users
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Reports</h3>
                <div className="text-2xl">📊</div>
              </div>
              <p className="text-gray-600 mb-4">View platform analytics and reports</p>
              <button
                onClick={() => navigateToSection('reports')}
                className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all"
              >
                View Reports
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Content Moderation</h3>
                <div className="text-2xl">🚫</div>
              </div>
              <p className="text-gray-600 mb-4">Review flagged content and reviews</p>
              <button
                onClick={() => navigateToSection('moderation')}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
              >
                Review Content
              </button>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
                <div className="text-2xl">⚙️</div>
              </div>
              <p className="text-gray-600 mb-4">Platform configuration and settings</p>
              <button
                onClick={() => navigateToSection('settings')}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all"
              >
                Platform Settings
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Users</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Sellers</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.activeSellers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Products</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalProducts}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending Reviews</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.pendingReviews}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Last Updated Info */}
          {lastUpdated && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </AdminRouteGuard>
  )
} 