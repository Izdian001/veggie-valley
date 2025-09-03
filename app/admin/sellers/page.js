'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function ManageSellers() {
  const router = useRouter()
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSeller, setSelectedSeller] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    checkAdminAccess()
    loadSellers()
  }, [])

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'admin') {
      router.push('/auth')
      return
    }
  }

  const loadSellers = async () => {
    try {
      setLoading(true)
      
      // First, get all users with role 'seller'
      const { data: sellerUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'seller')

      if (usersError) throw usersError

      // Then get all seller profiles
      const { data: sellerProfiles, error: profilesError } = await supabase
        .from('seller_profiles')
        .select('*')

      if (profilesError) throw profilesError

      // Combine the data
      const formattedSellers = sellerUsers.map(user => {
        const profile = sellerProfiles.find(p => p.id === user.id) || {}
        return {
          id: user.id,
          seller_profile_id: profile.id || user.id,
          full_name: user.full_name || 'Unknown',
          email: user.email || 'No email',
          phone: user.phone || 'No phone',
          address: user.address || 'No address',
          farm_name: profile.farm_name || 'No farm name',
          bio: profile.bio || '',
          rating: profile.rating || 0,
          total_reviews: profile.total_reviews || 0,
          created_at: user.created_at,
          updated_at: user.updated_at,
          cover_image_url: profile.cover_image_url || null
        }
      })

      console.log('Formatted sellers:', formattedSellers) // For debugging
      setSellers(formattedSellers)
    } catch (error) {
      console.error('Error loading sellers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSeller = async () => {
    if (!selectedSeller) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('seller_profiles')
        .delete()
        .eq('id', selectedSeller.seller_profile_id)

      if (error) throw error

      await supabase
        .from('admin_actions')
        .insert({
          admin_id: (await supabase.auth.getUser()).data.user.id,
          action_type: 'delete_seller',
          target_id: selectedSeller.id,
          target_type: 'seller',
          action_details: { action: 'deleted', reason: 'Admin decision' }
        })

      setShowDeleteModal(false)
      setSelectedSeller(null)
      loadSellers()
    } catch (error) {
      console.error('Error deleting seller:', error)
    } finally {
      setDeleting(false)
    }
  }

  const getRatingColor = (rating) => {
    if (rating >= 4) return 'text-green-600'
    if (rating >= 3) return 'text-yellow-600'
    return 'text-red-600'
  }

  const columns = [
    { 
      key: 'seller_info', 
      header: 'Seller',
      render: (seller) => (
        <div className="flex items-center">
          {seller.cover_image_url ? (
            <img 
              src={seller.cover_image_url} 
              alt={seller.farm_name}
              className="w-10 h-10 rounded-full object-cover mr-3"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
              <span className="text-gray-500 text-lg">
                {seller.full_name?.charAt(0) || '?'}
              </span>
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">{seller.full_name}</div>
            <div className="text-sm text-gray-500">{seller.farm_name}</div>
          </div>
        </div>
      )
    },
    { 
      key: 'contact', 
      header: 'Contact',
      render: (seller) => (
        <div className="space-y-1">
          <div className="text-sm text-gray-900">{seller.email}</div>
          {seller.phone && (
            <div className="text-sm text-gray-500">{seller.phone}</div>
          )}
          {seller.address && (
            <div className="text-xs text-gray-500 truncate max-w-xs">{seller.address}</div>
          )}
        </div>
      )
    },
    { 
      key: 'stats', 
      header: 'Stats',
      render: (seller) => (
        <div className="space-y-1">
          <div className="flex items-center">
            <span className="text-yellow-500">★</span>
            <span className="ml-1 text-sm">
              {seller.rating ? `${seller.rating.toFixed(1)} (${seller.total_reviews})` : 'No ratings'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Joined: {new Date(seller.created_at).toLocaleDateString()}
          </div>
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (seller) => (
        <div className="flex space-x-2">
          <Link
            href={`/admin/sellers/${seller.id}`}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            title="View Seller Details"
          >
            View
          </Link>
        </div>
      )
    }
  ]

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
              <h1 className="text-2xl font-bold text-gray-900">Manage Sellers</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{sellers.length}</div>
              <div className="text-sm text-gray-600">Total Sellers</div>
            </div>
          </div>
        </div>

        {/* Sellers List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Seller Profiles</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sellers.map((seller) => (
                  <tr key={seller.id} className="hover:bg-gray-50">
                    {columns.map((column) => (
                      <td key={`${seller.id}-${column.key}`} className="px-6 py-4 whitespace-nowrap">
                        {column.render ? column.render(seller) : seller[column.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
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
              <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Seller</h3>
              <div className="mt-2 px-7">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete {selectedSeller?.full_name}? This action cannot be undone.
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
                  onClick={handleDeleteSeller}
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
