'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function EditSellerProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({
    farm_name: '',
    bio: '',
    years_farming: '',
    phone: '',
    location: ''
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      if (user.user_metadata?.role !== 'seller') {
        router.push('/dashboard')
        return
      }
      setUser(user)
      
      // Load existing profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      const { data: sellerProfile } = await supabase
        .from('seller_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setForm({
        farm_name: sellerProfile?.farm_name || '',
        bio: sellerProfile?.bio || '',
        years_farming: sellerProfile?.years_farming?.toString() || '',
        phone: profile?.phone || '',
        location: profile?.address || ''
      })
      setLoading(false)
    }
    load()
  }, [router])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const save = async (e) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)

    try {
      // Update base profile first
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name,
          phone: form.phone || null,
          address: form.location || null,
          role: 'seller'
        })

      if (profileError) {
        console.error('Profile update error:', profileError)
        alert('Error updating profile: ' + profileError.message)
        setSaving(false)
        return
      }

      // Update seller profile
      const { error: sellerError } = await supabase
        .from('seller_profiles')
        .upsert({
          id: user.id,
          farm_name: form.farm_name,
          bio: form.bio,
          years_farming: parseInt(form.years_farming) || 0,
          is_approved: true // Auto-approve sellers
        })

      if (sellerError) {
        console.error('Seller profile update error:', sellerError)
        alert('Error updating seller profile: ' + sellerError.message)
        setSaving(false)
        return
      }

      // Success - redirect to dashboard
      alert('Profile updated successfully!')
      router.push('/seller/dashboard')
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Error saving profile. Please try again.')
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-semibold text-gray-900">Edit Seller Profile</h1>
            <button onClick={() => router.push('/seller/dashboard')} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Cancel</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={save} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Farm/Shop Name</label>
            <input 
              name="farm_name" 
              value={form.farm_name} 
              onChange={handleChange} 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio/Description</label>
            <textarea 
              name="bio" 
              value={form.bio} 
              onChange={handleChange} 
              rows="4"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none" 
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Years of Farming</label>
              <input 
                name="years_farming" 
                type="number"
                min="0"
                value={form.years_farming} 
                onChange={handleChange} 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input 
                name="phone" 
                value={form.phone} 
                onChange={handleChange} 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" 
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input 
              name="location" 
              value={form.location} 
              onChange={handleChange} 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" 
            />
          </div>
          
          <button 
            disabled={saving} 
            type="submit" 
            className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </main>
    </div>
  )
}
