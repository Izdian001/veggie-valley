'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function UserManagement() {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [filterRole, setFilterRole] = useState('all')

  useEffect(() => {
    checkAdminAccess()
    loadUsers()
  }, [])

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'admin') {
      router.push('/auth')
      return
    }
  }

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          seller_profiles (
            id,
            farm_name,
            is_approved,
            years_farming
          ),
          buyer_profiles (
            id,
            preferences
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Add role information and calculate stats
      const usersWithStats = data.map(user => {
        const role = user.role || 'buyer'
        const isSeller = user.seller_profiles && user.seller_profiles.length > 0
        const isBuyer = user.buyer_profiles && user.buyer_profiles.length > 0
        
        return {
          ...user,
          role,
          isSeller,
          isBuyer,
          sellerProfile: user.seller_profiles?.[0] || null,
          buyerProfile: user.buyer_profiles?.[0] || null
        }
      })

      setUsers(usersWithStats)
      setLoading(false)
    } catch (error) {
      console.error('Error loading users:', error)
      setLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    setDeleting(true)
    try {
      // Delete user profile (this will cascade to related data)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id)

      if (error) throw error

      // Log admin action
      await supabase
        .from('admin_actions')
        .insert({
          admin_id: (await supabase.auth.getUser()).data.user.id,
          action_type: 'delete_user',
          target_id: selectedUser.id,
          target_type: 'user',
          action_details: { action: 'deleted', reason: 'Admin decision' }
        })

      setShowDeleteModal(false)
      setSelectedUser(null)
      loadUsers() // Refresh the list
    } catch (error) {
      console.error('Error deleting user:', error)
    } finally {
      setDeleting(false)
    }
  }

  const getRoleBadge = (role, isSeller, isBuyer) => {
    if (role === 'admin') {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Admin</span>
    } else if (isSeller) {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Seller</span>
    } else if (isBuyer) {
      return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Buyer</span>
    } else {
      return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Unknown</span>
    }
  }

  const getStatusBadge = (isApproved) => {
    if (isApproved === null || isApproved === undefined) return null
    return isApproved ? 
      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Approved</span> :
      <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Pending</span>
  }

  const filteredUsers = users.filter(user => {
    if (filterRole === 'all') return true
    if (filterRole === 'admin') return user.role === 'admin'
    if (filterRole === 'seller') return user.isSeller
    if (filterRole === 'buyer') return user.isBuyer
    return true
  })

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
      <header className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{users.length}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {users.filter(u => u.isSeller).length}
              </div>
              <div className="text-sm text-gray-600">Sellers</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {users.filter(u => u.isBuyer).length}
              </div>
              <div className="text-sm text-gray-600">Buyers</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {users.filter(u => u.role === 'admin').length}
              </div>
              <div className="text-sm text-gray-600">Admins</div>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Filter by Role:</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Users</option>
              <option value="admin">Admins</option>
              <option value="seller">Sellers</option>
              <option value="buyer">Buyers</option>
            </select>
            <span className="text-sm text-gray-600">
              Showing {filteredUsers.length} of {users.length} users
            </span>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">User Profiles</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <div key={user.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-lg font-semibold text-blue-600">
                            {user.full_name?.charAt(0) || 'U'}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {user.full_name || 'Unknown'}
                          </h3>
                          {getRoleBadge(user.role, user.isSeller, user.isBuyer)}
                          {user.sellerProfile && getStatusBadge(user.sellerProfile.is_approved)}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {user.email || 'No email'}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-500">Phone:</span>
                            <span className="ml-1 text-gray-900">
                              {user.phone || 'Not provided'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Location:</span>
                            <span className="ml-1 text-gray-900">
                              {user.address || 'Not provided'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Joined:</span>
                            <span className="ml-1 text-gray-900">
                              {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-500">Last Updated:</span>
                            <span className="ml-1 text-gray-900">
                              {new Date(user.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Seller-specific info */}
                        {user.sellerProfile && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg">
                            <h4 className="text-sm font-medium text-green-900 mb-2">Seller Information:</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                              <div>
                                <span className="font-medium text-green-700">Farm:</span>
                                <span className="ml-1 text-green-900">
                                  {user.sellerProfile.farm_name || 'No farm name'}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-green-700">Experience:</span>
                                <span className="ml-1 text-green-900">
                                  {user.sellerProfile.years_farming || 0} years
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-green-700">Status:</span>
                                <span className="ml-1 text-green-900">
                                  {user.sellerProfile.is_approved ? 'Approved' : 'Pending Approval'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Buyer-specific info */}
                        {user.buyerProfile && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-900 mb-2">Buyer Information:</h4>
                            <div className="text-sm">
                              <span className="font-medium text-blue-700">Preferences:</span>
                              <span className="ml-1 text-blue-900">
                                {user.buyerProfile.preferences || 'No preferences set'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => {
                          setSelectedUser(user)
                          setShowDeleteModal(true)
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                      >
                        Delete User
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Delete User</h3>
              <div className="mt-2 px-7">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete {selectedUser?.full_name}? This action cannot be undone and will remove all associated data.
                </p>
              </div>
              <div className="flex items-center justify-center space-x-4 mt-6">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
