'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthForm() {
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'buyer'
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    if (isSignUp) {
      // --- SIGN UP ---
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.name,
            role: form.role,
            farm_name: form.role === 'seller' ? form.name : null
          }
        }
      })

      if (error) {
        setErrorMsg(error.message)
      } else {
        alert('Sign up successful! Please check your email to confirm.')
      }

    } else {
      // --- LOGIN ---
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password
      })

      if (error) {
        setErrorMsg(error.message)
      } else {
        // Role-based redirect after login
        const { data: { user } } = await supabase.auth.getUser()

        if (user?.user_metadata?.role === 'seller') {
          // Check if seller profile is complete
          const { data: sp } = await supabase
            .from('seller_profiles')
            .select('farm_name, bio')
            .eq('id', user.id)
            .single()

          if (!sp?.farm_name || !sp?.bio) {
            router.push('/dashboard/seller/setup')
          } else {
            router.push(`/seller/${user.id}`)
          }
        } else {
          // Buyer or Admin
          router.push('/')
        }
      }
    }

    // ✅ Always stop loading after operation
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">
        {isSignUp ? 'Sign Up' : 'Log In'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <>
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              required
              value={form.name}
              onChange={handleChange}
              className="border p-2 w-full rounded"
            />
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="border p-2 w-full rounded"
              required
            >
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="admin">Admin</option>
            </select>
          </>
        )}

        <input
          type="email"
          name="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={handleChange}
          className="border p-2 w-full rounded"
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          required
          value={form.password}
          onChange={handleChange}
          className="border p-2 w-full rounded"
        />

        {errorMsg && <p className="text-red-600">{errorMsg}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full p-2 bg-green-700 text-white rounded"
        >
          {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Log In'}
        </button>
      </form>

      <p className="mt-4 text-center">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          className="text-green-700 hover:underline"
          onClick={() => {
            setIsSignUp(!isSignUp)
            setErrorMsg('')
          }}
        >
          {isSignUp ? 'Log In' : 'Sign Up'}
        </button>
      </p>
    </div>
  )
}
