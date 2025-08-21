'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function ContentModeration() {
  const router = useRouter()
  const [flaggedContent, setFlaggedContent] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedContent, setSelectedContent] = useState(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    checkAdminAccess()
    loadFlaggedContent()
  }, [])

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'admin') {
      router.push('/auth')
      return
    }
  }

  const loadFlaggedContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content_flags')
        .select(`
          *,
          reporter:profiles!content_flags_reporter_id_fkey (
            full_name,
            email
          )
        `)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get additional content details based on content type
      const contentWithDetails = await Promise.all(
        data.map(async (flag) => {
          let contentDetails = null
          
          try {
            if (flag.content_type === 'review') {
              const { data: reviewData } = await supabase
                .from('seller_reviews')
                .select(`
                  *,
                  seller:profiles!seller_reviews_seller_id_fkey (
                    full_name
                  )
                `)
                .eq('id', flag.content_id)
                .single()
              
              if (reviewData) {
                contentDetails = {
                  type: 'review',
                  data: reviewData,
                  title: `Review by ${reviewData.reviewer_id ? 'User' : 'Anonymous'}`
                }
              }
            } else if (flag.content_type === 'product') {
              const { data: productData } = await supabase
                .from('products')
                .select(`
                  *,
                  profiles (
                    full_name
                  )
                `)
                .eq('id', flag.content_id)
                .single()
              
              if (productData) {
                contentDetails = {
                  type: 'product',
                  data: productData,
                  title: productData.name
                }
              }
            } else if (flag.content_type === 'profile') {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', flag.content_id)
                .single()
              
              if (profileData) {
                contentDetails = {
                  type: 'profile',
                  data: profileData,
                  title: profileData.full_name
                }
              }
            }
          } catch (contentError) {
            console.error(`Error loading content details for ${flag.content_type}:`, contentError)
          }

          return {
            ...flag,
            contentDetails
          }
        })
      )

      setFlaggedContent(contentWithDetails)
      setLoading(false)
    } catch (error) {
      console.error('Error loading flagged content:', error)
      setLoading(false)
    }
  }

  const handleResolveFlag = async () => {
    if (!selectedContent || !actionType) return

    setProcessing(true)
    try {
      // Update the flag as resolved
      const { error: flagError } = await supabase
        .from('content_flags')
        .update({ 
          is_resolved: true,
          admin_notes: adminNotes,
          resolved_at: new Date().toISOString()
        })
        .eq('id', selectedContent.id)

      if (flagError) throw flagError

      // Take action on the flagged content based on action type
      if (actionType === 'remove') {
        if (selectedContent.content_type === 'review') {
          await supabase
            .from('seller_reviews')
            .delete()
            .eq('id', selectedContent.content_id)
        } else if (selectedContent.content_type === 'product') {
          await supabase
            .from('products')
            .delete()
            .eq('id', selectedContent.content_id)
        }
        // Note: Profile deletion would require additional consideration
      } else if (actionType === 'warn') {
        // Could implement a warning system here
        console.log('Warning issued for:', selectedContent.content_id)
      }

      // Log admin action
      await supabase
        .from('admin_actions')
        .insert({
          admin_id: (await supabase.auth.getUser()).data.user.id,
          action_type: `moderate_${selectedContent.content_type}`,
          target_id: selectedContent.content_id,
          target_type: selectedContent.content_type,
          action_details: { 
            action: actionType, 
            reason: selectedContent.flag_reason,
            admin_notes: adminNotes 
          }
        })

      setShowActionModal(false)
      setSelectedContent(null)
      setActionType('')
      setAdminNotes('')
      loadFlaggedContent() // Refresh the list
    } catch (error) {
      console.error('Error resolving flag:', error)
    } finally {
      setProcessing(false)
    }
  }

  const getContentPreview = (content) => {
    if (!content) return null

    switch (content.type) {
      case 'review':
        return (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm">
              <span className="font-medium">Rating:</span> {content.data.rating} ⭐
            </div>
            <div className="text-sm mt-1">
              <span className="font-medium">Review:</span> {content.data.review_text}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Seller: {content.data.seller?.full_name || 'Unknown'}
            </div>
          </div>
        )
      case 'product':
        return (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm">
              <span className="font-medium">Product:</span> {content.data.name}
            </div>
            <div className="text-sm mt-1">
              <span className="font-medium">Description:</span> {content.data.description}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Seller: {content.data.profiles?.full_name || 'Unknown'}
            </div>
          </div>
        )
      case 'profile':
        return (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-sm">
              <span className="font-medium">Name:</span> {content.data.full_name}
            </div>
            <div className="text-sm mt-1">
              <span className="font-medium">Email:</span> {content.data.email}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Role: {content.data.role || 'Unknown'}
            </div>
          </div>
        )
      default:
        return <div className="text-gray-500">Content preview not available</div>
    }
  }

  const getFlagIcon = (contentType) => {
    switch (contentType) {
      case 'review':
        return '⭐'
      case 'product':
        return '📦'
      case 'profile':
        return '👤'
      default:
        return '🚫'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
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
              <h1 className="text-2xl font-bold text-gray-900">Content Moderation</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{flaggedContent.length}</div>
              <div className="text-sm text-gray-600">Pending Flags</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {flaggedContent.filter(f => f.content_type === 'review').length}
              </div>
              <div className="text-sm text-gray-600">Flagged Reviews</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {flaggedContent.filter(f => f.content_type === 'product').length}
              </div>
              <div className="text-sm text-gray-600">Flagged Products</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {flaggedContent.filter(f => f.content_type === 'profile').length}
              </div>
              <div className="text-sm text-gray-600">Flagged Profiles</div>
            </div>
          </div>
        </div>

        {/* Flagged Content List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Flagged Content</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {flaggedContent.length > 0 ? (
              flaggedContent.map((flag) => (
                <div key={flag.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="text-2xl">{getFlagIcon(flag.content_type)}</div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {flag.content_type.charAt(0).toUpperCase() + flag.content_type.slice(1)} Flagged
                          </h3>
                          <p className="text-sm text-gray-600">
                            Reported by {flag.reporter?.full_name || 'Anonymous'} on {new Date(flag.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-700">Reason:</span>
                        <span className="ml-2 text-sm text-gray-900">{flag.flag_reason}</span>
                      </div>

                      {/* Content Preview */}
                      {flag.contentDetails && (
                        <div className="mb-4">
                          <span className="text-sm font-medium text-gray-700">Content Preview:</span>
                          <div className="mt-2">
                            {getContentPreview(flag.contentDetails)}
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        Flag ID: {flag.id} • Content ID: {flag.content_id}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => {
                          setSelectedContent(flag)
                          setActionType('warn')
                          setShowActionModal(true)
                        }}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all"
                      >
                        Issue Warning
                      </button>
                      <button
                        onClick={() => {
                          setSelectedContent(flag)
                          setActionType('remove')
                          setShowActionModal(true)
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                      >
                        Remove Content
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center">
                <div className="text-4xl mb-4">🎉</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Flags</h3>
                <p className="text-gray-600">All flagged content has been reviewed and resolved.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {showActionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4 text-center">
                {actionType === 'remove' ? 'Remove Content' : 'Issue Warning'}
              </h3>
              <div className="mt-2 px-7">
                <p className="text-sm text-gray-500 text-center">
                  {actionType === 'remove' 
                    ? 'Are you sure you want to remove this content? This action cannot be undone.'
                    : 'Issue a warning for this flagged content.'
                  }
                </p>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes (optional):
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Add notes about this action..."
                  />
                </div>
              </div>
              <div className="flex items-center justify-center space-x-4 mt-6">
                <button
                  onClick={() => {
                    setShowActionModal(false)
                    setSelectedContent(null)
                    setActionType('')
                    setAdminNotes('')
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveFlag}
                  disabled={processing}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all"
                >
                  {processing ? 'Processing...' : (actionType === 'remove' ? 'Remove' : 'Issue Warning')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
