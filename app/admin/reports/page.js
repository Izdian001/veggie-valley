'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function Reports() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSellers: 0,
    totalBuyers: 0,
    totalProducts: 0,
    approvedProducts: 0,
    pendingProducts: 0,
    totalRevenue: 0,
    monthlyGrowth: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [topSellers, setTopSellers] = useState([])
  const [productCategories, setProductCategories] = useState([])

  useEffect(() => {
    checkAdminAccess()
    loadReports()
  }, [])

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'admin') {
      router.push('/auth')
      return
    }
  }

  const loadReports = async () => {
    try {
      // Load basic stats
      await Promise.all([
        loadBasicStats(),
        loadRecentActivity(),
        loadTopSellers(),
        loadProductCategories()
      ])
      
      setLoading(false)
    } catch (error) {
      console.error('Error loading reports:', error)
      setLoading(false)
    }
  }

  const loadBasicStats = async () => {
    try {
      // Get user counts
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      const { count: totalSellers } = await supabase
        .from('seller_profiles')
        .select('*', { count: 'exact', head: true })

      const { count: totalBuyers } = await supabase
        .from('buyer_profiles')
        .select('*', { count: 'exact', head: true })

      // Get product counts
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      const { count: approvedProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', true)

      const { count: pendingProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', false)

      setStats(prev => ({
        ...prev,
        totalUsers: totalUsers || 0,
        totalSellers: totalSellers || 0,
        totalBuyers: totalBuyers || 0,
        totalProducts: totalProducts || 0,
        approvedProducts: approvedProducts || 0,
        pendingProducts: pendingProducts || 0
      }))
    } catch (error) {
      console.error('Error loading basic stats:', error)
    }
  }

  const loadRecentActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_actions')
        .select(`
          *,
          admin:profiles!admin_actions_admin_id_fkey (
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setRecentActivity(data || [])
    } catch (error) {
      console.error('Error loading recent activity:', error)
    }
  }

  const loadTopSellers = async () => {
    try {
      const { data, error } = await supabase
        .from('seller_profiles')
        .select(`
          *,
          profiles (
            full_name
          ),
          products (
            id
          )
        `)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error

      // Calculate product counts and sort by activity
      const sellersWithStats = data.map(seller => ({
        ...seller,
        productCount: seller.products?.length || 0
      })).sort((a, b) => b.productCount - a.productCount)

      setTopSellers(sellersWithStats)
    } catch (error) {
      console.error('Error loading top sellers:', error)
    }
  }

  const loadProductCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          categories (
            name
          )
        `)
        .eq('is_approved', true)

      if (error) throw error

      // Count products by category
      const categoryCounts = {}
      data.forEach(product => {
        const categoryName = product.categories?.name || 'Uncategorized'
        categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1
      })

      const sortedCategories = Object.entries(categoryCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)

      setProductCategories(sortedCategories)
    } catch (error) {
      console.error('Error loading product categories:', error)
    }
  }

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'approve_seller':
        return '✅'
      case 'reject_seller':
        return '❌'
      case 'delete_seller':
        return '🗑️'
      case 'approve_product':
        return '✅'
      case 'reject_product':
        return '❌'
      case 'delete_product':
        return '🗑️'
      case 'delete_user':
        return '👤'
      default:
        return '📝'
    }
  }

  const getActionText = (actionType) => {
    switch (actionType) {
      case 'approve_seller':
        return 'Approved Seller'
      case 'reject_seller':
        return 'Rejected Seller'
      case 'delete_seller':
        return 'Deleted Seller'
      case 'approve_product':
        return 'Approved Product'
      case 'reject_product':
        return 'Rejected Product'
      case 'delete_product':
        return 'Deleted Product'
      case 'delete_user':
        return 'Deleted User'
      default:
        return 'Action'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Platform Reports</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalSellers}</div>
              <div className="text-sm text-gray-600">Active Sellers</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.totalProducts}</div>
              <div className="text-sm text-gray-600">Total Products</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.approvedProducts}</div>
              <div className="text-sm text-gray-600">Approved Products</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Admin Activity */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Admin Activity</h2>
            </div>
            <div className="p-6">
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((action) => (
                    <div key={action.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl">{getActionIcon(action.action_type)}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {getActionText(action.action_type)}
                        </div>
                        <div className="text-xs text-gray-500">
                          by {action.admin?.full_name || 'Unknown'} • {new Date(action.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </div>

          {/* Top Sellers */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Top Sellers</h2>
            </div>
            <div className="p-6">
              {topSellers.length > 0 ? (
                <div className="space-y-4">
                  {topSellers.map((seller, index) => (
                    <div key={seller.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-green-600">{index + 1}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {seller.profiles?.full_name || 'Unknown'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {seller.farm_name || 'No farm name'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {seller.productCount} products
                        </div>
                        <div className="text-xs text-gray-500">
                          {seller.years_farming || 0} years exp.
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No sellers found</p>
              )}
            </div>
          </div>
        </div>

        {/* Product Categories Distribution */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Product Categories Distribution</h2>
          </div>
          <div className="p-6">
            {productCategories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {productCategories.map((category) => (
                  <div key={category.name} className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{category.count}</div>
                      <div className="text-sm text-gray-600">{category.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No category data available</p>
            )}
          </div>
        </div>

        {/* Platform Health */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {stats.approvedProducts > 0 ? Math.round((stats.approvedProducts / stats.totalProducts) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-600">Product Approval Rate</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {stats.totalSellers > 0 ? Math.round((stats.totalSellers / stats.totalUsers) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-600">Seller Conversion Rate</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {stats.totalProducts > 0 ? Math.round(stats.totalProducts / stats.totalSellers) : 0}
              </div>
              <div className="text-sm text-gray-600">Avg Products per Seller</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
