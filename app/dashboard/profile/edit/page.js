 'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function EditBuyerProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)
  const [form, setForm] = useState({
    full_name: '',
    username: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    preferences_input: '',
    avatar_url: ''
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
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
      const { data } = await supabase
        .from('profiles')
        .select('full_name, username, phone, address, city, state, postal_code, avatar_url')
        .eq('id', user.id)
        .single()
      const { data: b } = await supabase
        .from('buyer_profiles')
        .select('preferences')
        .eq('id', user.id)
        .single()
      setForm({
        full_name: data?.full_name || user.user_metadata?.full_name || '',
        username: data?.username || '',
        phone: data?.phone || '',
        address: data?.address || '',
        city: data?.city || '',
        state: data?.state || '',
        postal_code: data?.postal_code || '',
        preferences_input: (b?.preferences || []).join(', '),
        avatar_url: data?.avatar_url || ''
      })
      setAvatarPreview(data?.avatar_url || '')
      setLoading(false)
    }
    load()
  }, [router])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File size must be less than 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const save = async (e) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    
    try {
      let avatarUrl = form.avatar_url
      
      // Upload avatar if a new file is selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile)
        
        if (uploadError) {
          alert('Error uploading avatar: ' + uploadError.message)
          setSaving(false)
          return
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)
        
        avatarUrl = urlData.publicUrl
      }
      
      // Update profiles table
      const { error: pErr } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: form.full_name,
          username: form.username || null,
          phone: form.phone || null,
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
          postal_code: form.postal_code || null,
          avatar_url: avatarUrl,
          role: 'buyer'
        })
      
      if (pErr) {
        console.error('Profile update error:', pErr)
        alert('Error updating profile: ' + pErr.message)
        setSaving(false)
        return
      }
      
      // Update buyer_profiles table
      const prefs = form.preferences_input
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      
      const { error: bErr } = await supabase
        .from('buyer_profiles')
        .upsert({ 
          id: user.id, 
          preferences: prefs 
        })
      
      if (bErr) {
        console.error('Buyer profile update error:', bErr)
        alert('Error updating buyer profile: ' + bErr.message)
        setSaving(false)
        return
      }
      
      // Success - redirect to profile page
      alert('Profile updated successfully!')
      router.push('/dashboard/profile')
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
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-semibold text-gray-900">Edit Profile</h1>
            <button onClick={() => router.push('/dashboard/profile')} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Cancel</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={save} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Avatar Upload */}
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 border-2 border-gray-300">
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              <p className="mt-1 text-xs text-gray-500">JPG, PNG or GIF. Max 5MB.</p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input name="full_name" value={form.full_name} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input name="username" value={form.username} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postal code</label>
              <input name="postal_code" value={form.postal_code} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input name="address" value={form.address} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input name="city" value={form.city} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input name="state" value={form.state} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferences (comma-separated)</label>
            <input name="preferences_input" value={form.preferences_input} onChange={handleChange} placeholder="e.g. Organic, Leafy greens, Fast delivery" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
          </div>
          <button disabled={saving} type="submit" className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </main>
    </div>
  )
}

