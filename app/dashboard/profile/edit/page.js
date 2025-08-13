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
    preferences_input: ''
  })

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
        .select('full_name, username, phone, address, city, state, postal_code')
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
        preferences_input: (b?.preferences || []).join(', ')
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
          postal_code: form.postal_code || null
        })
      
      let bErr = null
      if (!pErr) {
        const prefs = form.preferences_input
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        const { error } = await supabase
          .from('buyer_profiles')
          .upsert({ id: user.id, preferences: prefs })
        bErr = error
      }
      
      if (pErr || bErr) {
        alert((pErr || bErr).message)
        return
      }
      
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

