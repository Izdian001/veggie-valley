'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function AdminSellerView() {
  const router = useRouter()
  const params = useParams()
  const [seller, setSeller] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadSellerData = async () => {
      try {
        setLoading(true)
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', params.sellerID)
          .single()

        if (profileError) throw profileError
        if (!profileData) throw new Error('Seller not found')

        const { data: sellerProfile, error: sellerError } = await supabase
          .from('seller_profiles')
          .select('*')
          .eq('id', params.sellerID)
          .single()

        if (sellerError && sellerError.code !== 'PGRST116') throw sellerError

        setSeller({
          ...profileData,
          ...(sellerProfile || {})
        })
      } catch (err) {
        console.error('Error loading seller:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (params.sellerID) {
      loadSellerData()
    }
  }, [params.sellerID])

  const handleDelete = async () => {
    if (!seller) return
    
    setDeleting(true)
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Call server action to handle deletion
      const response = await fetch('/api/admin/delete-seller', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ sellerId: seller.id })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete seller')
      }

      // Redirect back to sellers list
      router.push('/admin/sellers')
    } catch (err) {
      console.error('Error deleting seller:', err)
      setError('Failed to delete seller. ' + (err.message || 'Please try again.'))
      setShowDeleteModal(false)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (error || !seller) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error || 'Seller not found'}
        </div>
        <Link 
          href="/admin/sellers" 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Sellers
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link 
          href="/admin/sellers" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Sellers
        </Link>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Seller Details</h1>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Seller'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">Full Name</p>
              <p className="font-medium">{seller.full_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-600">Email</p>
              <p className="font-medium">{seller.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-600">Phone</p>
              <p className="font-medium">{seller.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-600">Farm Name</p>
              <p className="font-medium">{seller.farm_name || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Additional Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">Address</p>
              <p className="font-medium">{seller.address || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-600">Years Farming</p>
              <p className="font-medium">{seller.years_farming || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <p className="mb-6">Are you sure you want to delete {seller.full_name || 'this seller'}? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}