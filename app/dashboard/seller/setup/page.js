'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function SellerSetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    farm_name: '',
    bio: '',
    years_farming: '',
    certifications: '',
    cover_image_url: ''
  })

  // ✅ Make sure seller is logged in and load any existing values
  useEffect(() => {
    (async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/auth')
        return
      }

      const { data, error: profileError } = await supabase
        .from('seller_profiles')
        .select('farm_name, bio, years_farming, certifications, cover_image_url')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        setError(profileError.message)
      } else if (data) {
        setForm({
          farm_name: data.farm_name || '',
          bio: data.bio || '',
          years_farming: data.years_farming || '',
          certifications: data.certifications ? data.certifications.join(', ') : '',
          cover_image_url: data.cover_image_url || ''
        })
      }
      setLoading(false)
    })()
  }, [router])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth')
      return
    }

    const updates = {
      farm_name: form.farm_name,
      bio: form.bio,
      years_farming: form.years_farming ? parseInt(form.years_farming, 10) : null,
      certifications: form.certifications
        ? form.certifications.split(',').map(c => c.trim())
        : [],
      cover_image_url: form.cover_image_url
    }

    const { error: updateError } = await supabase
      .from('seller_profiles')
      .update(updates)
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      // ✅ Redirect to seller public profile after saving
      router.push(`/seller/${user.id}`)
    }
    setSaving(false)
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Complete Your Seller Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="farm_name"
          placeholder="Farm Name"
          value={form.farm_name}
          onChange={handleChange}
          required
          className="border p-2 w-full rounded"
        />
        <textarea
          name="bio"
          placeholder="Short Bio"
          value={form.bio}
          onChange={handleChange}
          required
          className="border p-2 w-full rounded"
        />
        <input
          type="number"
          name="years_farming"
          placeholder="Years of Farming Experience"
          value={form.years_farming}
          onChange={handleChange}
          className="border p-2 w-full rounded"
        />
        <input
          type="text"
          name="certifications"
          placeholder="Certifications (comma separated)"
          value={form.certifications}
          onChange={handleChange}
          className="border p-2 w-full rounded"
        />
        <input
          type="text"
          name="cover_image_url"
          placeholder="Cover Image URL"
          value={form.cover_image_url}
          onChange={handleChange}
          className="border p-2 w-full rounded"
        />
        {error && <p className="text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="bg-green-700 text-white px-4 py-2 rounded"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </main>
  )
}
