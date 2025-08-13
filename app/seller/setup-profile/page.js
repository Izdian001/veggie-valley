'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function SellerProfileSetup() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [user, setUser] = useState(null)
  const [profileData, setProfileData] = useState(null)

  useEffect(() => {
    checkUserAndSetup()
  }, [])

  const checkUserAndSetup = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.user_metadata?.role !== 'seller') {
        router.push('/auth')
        return
      }

      setUser(user)
      
      // Check if seller profile already exists
      const { data: existingProfile } = await supabase
        .from('seller_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (existingProfile) {
        // Profile already exists, redirect to dashboard
        router.push('/seller/dashboard')
        return
      }

      // Get profile data from user metadata
      const metadata = user.user_metadata
      if (metadata.seller_profile) {
        setProfileData(metadata.seller_profile)
        console.log('Found seller profile data in metadata:', metadata.seller_profile)
      } else {
        // No profile data found, redirect to setup
        router.push('/seller/setup')
        return
      }

      setLoading(false)
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/auth')
    }
  }

  const createProfiles = async () => {
    if (!user || !profileData) return

    setSaving(true)
    setErrorMsg('')

    try {
      console.log('Creating profiles for user:', user.id)
      console.log('Profile data:', profileData)

      // First, create/update the base profile
      const { error: baseProfileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata.full_name,
          phone: profileData.phone,
          address: profileData.location
        })

      if (baseProfileError) {
        throw new Error(`Base profile error: ${baseProfileError.message}`)
      }

      // Then, create the seller profile
      const { error: sellerProfileError } = await supabase
        .from('seller_profiles')
        .upsert({
          id: user.id,
          farm_name: profileData.farm_name,
          bio: profileData.bio,
          years_farming: profileData.years_farming
        })

      if (sellerProfileError) {
        throw new Error(`Seller profile error: ${sellerProfileError.message}`)
      }

      console.log('✅ Both profiles created successfully!')
      
      // Redirect to seller dashboard
      router.push('/seller/dashboard')
    } catch (error) {
      console.error('Profile creation error:', error)
      setErrorMsg(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-600">No profile data found</p>
          <button
            onClick={() => router.push('/seller/setup')}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Go to Setup
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-4">🌾</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
            <p className="text-gray-600">
              We found your profile information from signup. Let's create your seller profile now.
            </p>
          </div>

          {/* Profile Data Preview */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Profile Information</h2>
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">Farm/Shop Name:</span>
                <span className="ml-2 text-gray-900">{profileData.farm_name}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Bio:</span>
                <span className="ml-2 text-gray-900">{profileData.bio}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Years of Farming:</span>
                <span className="ml-2 text-gray-900">{profileData.years_farming}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Phone:</span>
                <span className="ml-2 text-gray-900">{profileData.phone}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Location:</span>
                <span className="ml-2 text-gray-900">{profileData.location}</span>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
              <p className="text-red-600 text-sm">{errorMsg}</p>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              onClick={createProfiles}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              {saving ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Profile...
                </span>
              ) : (
                'Create My Profile'
              )}
            </button>
            
            <button
              onClick={() => router.push('/seller/setup')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
            >
              Edit Info
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
