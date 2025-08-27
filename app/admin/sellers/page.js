'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

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
      // First get all profiles that have seller_profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          address,
          created_at,
          updated_at,
          seller_profiles (
            id,
            farm_name,
            bio,
            years_farming,
            certifications,
            cover_image_url,
            rating,
            total_reviews,
            is_approved,
            approved_by,
            approved_at,
            created_at,
            updated_at
          )
        `)
        .not('seller_profiles', 'is', null)
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // Transform the data to match the expected format
      const sellersWithStats = profiles.map(profile => {
        const sellerProfile = profile.seller_profiles?.[0] || {}
        
        return {
          id: sellerProfile.id,
          profiles: {
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            address: profile.address
          },
          farm_name: sellerProfile.farm_name,
          bio: sellerProfile.bio,
          years_farming: sellerProfile.years_farming,
          certifications: sellerProfile.certifications,
          cover_image_url: sellerProfile.cover_image_url,
          rating: sellerProfile.rating || 0,
          total_reviews: sellerProfile.total_reviews || 0,
          is_approved: sellerProfile.is_approved || false,
          approved_by: sellerProfile.approved_by,
          approved_at: sellerProfile.approved_at,
          created_at: sellerProfile.created_at,
          updated_at: sellerProfile.updated_at,
          avgRating: sellerProfile.rating || 0,
          totalReviews: sellerProfile.total_reviews || 0,
          flaggedReviews: 0 // We'll add this later if needed
        }
      })

      setSellers(sellersWithStats)
      setLoading(false)
    } catch (error) {
      console.error('Error loading sellers:', error)
      setLoading(false)
    }
  }

  const handleApproveSeller = async (sellerId) => {
    try {
      const { error } = await supabase
        .from('seller_profiles')
        .update({ 
          is_approved: true, 
          approval_date: new Date().toISOString() 
        })
        .eq('id', sellerId)

      if (error) throw error

      // Log admin action
      await supabase
        .from('admin_actions')
        .insert({
          admin_id: (await supabase.auth.getUser()).data.user.id,
          action_type: 'approve_seller',
          target_id: sellerId,
          target_type: 'seller',
          action_details: { action: 'approved' }
        })

      loadSellers() // Refresh the list
    } catch (error) {
      console.error('Error approving seller:', error)
    }
  }

  const handleRejectSeller = async (sellerId, reason) => {
    try {
      const { error } = await supabase
        .from('seller_profiles')
        .update({ 
          is_approved: false, 
          admin_notes: reason 
        })
        .eq('id', sellerId)

      if (error) throw error

      // Log admin action
      await supabase
        .from('admin_actions')
        .insert({
          admin_id: (await supabase.auth.getUser()).data.user.id,
          action_type: 'reject_seller',
          target_id: sellerId,
          target_type: 'seller',
          action_details: { action: 'rejected', reason }
        })

      loadSellers() // Refresh the list
    } catch (error) {
      console.error('Error rejecting seller:', error)
    }
  }

  const handleDeleteSeller = async () => {
    if (!selectedSeller) return

    setDeleting(true)
    try {
      // Delete seller profile (this will cascade to related data)
      const { error } = await supabase
        .from('seller_profiles')
        .delete()
        .eq('id', selectedSeller.id)

      if (error) throw error

      // Log admin action
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
      loadSellers() // Refresh the list
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

  const getStatusColor = (isApproved) => {
    return isApproved ? 'text-green-600' : 'text-red-600'
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
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {sellers.filter(s => s.is_approved).length}
              </div>
              <div className="text-sm text-gray-600">Approved</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {sellers.filter(s => !s.is_approved).length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {sellers.filter(s => s.flaggedReviews > 0).length}
              </div>
              <div className="text-sm text-gray-600">Flagged</div>
            </div>
          </div>
        </div>

        {/* Sellers List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Seller Profiles</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {sellers.map((seller) => (
              <div key={seller.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-lg font-semibold text-green-600">
                            {seller.profiles?.full_name?.charAt(0) || 'S'}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {seller.profiles?.full_name || 'Unknown'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {seller.profiles?.email || 'No email'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Farm: {seller.farm_name || 'No farm name'}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className={`text-sm font-medium ${getStatusColor(seller.is_approved)}`}>
                            {seller.is_approved ? 'Approved' : 'Pending Approval'}
                          </span>
                          <span className="text-sm text-gray-600">
                            Rating: <span className={getRatingColor(seller.avgRating)}>{seller.avgRating}/5</span> ({seller.totalReviews} reviews)
                          </span>
                          {seller.flaggedReviews > 0 && (
                            <span className="text-sm text-red-600">
                              ⚠️ {seller.flaggedReviews} flagged reviews
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!seller.is_approved ? (
                      <>
                        <button
                          onClick={() => handleApproveSeller(seller.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectSeller(seller.id, 'Admin decision')}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedSeller(seller)
                          setShowDeleteModal(true)
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Reviews Section */}
                {seller.seller_reviews && seller.seller_reviews.length > 0 && (
                  <div className="mt-4 pl-16">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Reviews:</h4>
                    <div className="space-y-2">
                      {seller.seller_reviews.slice(0, 3).map((review) => (
                        <div key={review.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">
                                {review.rating} ⭐
                              </span>
                              <span className="text-sm text-gray-900">
                                {review.review_text}
                              </span>
                            </div>
                            {review.is_flagged && (
                              <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                                Flagged: {review.flag_reason}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
              <h3 className="text-lg font-medium text-gray-900 mt-4">Delete Seller</h3>
              <div className="mt-2 px-7">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete {selectedSeller?.profiles?.full_name}? This action cannot be undone.
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
