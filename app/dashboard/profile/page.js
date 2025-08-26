'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function BuyerProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [buyerExtra, setBuyerExtra] = useState(null)

  useEffect(() => {
    const load = async () => {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      if (user.user_metadata?.role === 'seller') {
        router.push('/seller/dashboard')
        return
      }
      if (user.user_metadata?.role === 'admin') {
        router.push('/admin/dashboard')
        return
      }
      setUser(user)
      const { data: p, error: perr } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, phone, address, city, state, postal_code')
        .eq('id', user.id)
        .single()
      if (!perr) setProfile(p)

      const { data: b, error: berr } = await supabase
        .from('buyer_profiles')
        .select('preferences, loyalty_points')
        .eq('id', user.id)
        .single()
      if (!berr) setBuyerExtra(b)
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <button
            onClick={() => router.push('/dashboard/profile/edit')}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
          >
            Edit Profile
          </button>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-green-100 flex items-center justify-center text-2xl">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-green-600 font-semibold">
                  {user?.user_metadata?.full_name?.[0]?.toUpperCase() || '😊'}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <h2 className="text-xl font-semibold text-gray-900">
                {profile?.full_name || user?.user_metadata?.full_name || 'Unnamed Buyer'}
              </h2>
              {profile?.username && (
                <p className="text-sm text-gray-600">@{profile.username}</p>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="text-gray-800">{profile?.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p className="text-gray-800">
                {[profile?.address, profile?.city, profile?.state, profile?.postal_code]
                  .filter(Boolean)
                  .join(', ') || '-'}
              </p>
            </div>
          </div>

          <div className="mt-6 border-t pt-6">
            <p className="text-sm text-gray-500 mb-2">Preferences</p>
            {buyerExtra?.preferences?.length ? (
              <div className="flex flex-wrap gap-2">
                {buyerExtra.preferences.map((p) => (
                  <span key={p} className="px-2 py-1 text-xs rounded-full bg-green-50 text-green-700 border border-green-200">{p}</span>
                ))}
              </div>
            ) : (
              <p className="text-gray-800">-</p>
            )}

            <div className="mt-4">
              <p className="text-sm text-gray-500">Loyalty points</p>
              <p className="text-gray-800">{buyerExtra?.loyalty_points ?? 0}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


