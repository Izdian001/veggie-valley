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
    confirmPassword: '',
    role: 'buyer'
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleRoleChange = (role) => {
    setForm({ ...form, role })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    if (isSignUp) {
      // Validation
      if (form.password !== form.confirmPassword) {
        setErrorMsg('Passwords do not match')
        setLoading(false)
        return
      }

      if (form.password.length < 6) {
        setErrorMsg('Password must be at least 6 characters')
        setLoading(false)
        return
      }

      // Sign up
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.name,
            role: form.role
          }
        }
      })

      if (error) {
        setErrorMsg(error.message)
      } else {
        alert('Sign up successful! Please check your email to confirm your account.')
        setIsSignUp(false)
        setForm({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'buyer'
        })
      }
    } else {
      // Login
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password
      })

      if (error) {
        setErrorMsg(error.message)
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        console.log('Login successful, user:', user)
        console.log('User metadata:', user?.user_metadata)
        console.log('User role:', user?.user_metadata?.role)
        
        // Force redirect with window.location for immediate effect
        if (user?.user_metadata?.role === 'seller') {
          console.log('Redirecting to seller dashboard')
          window.location.href = '/seller/dashboard'
        } else if (user?.user_metadata?.role === 'admin') {
          console.log('Redirecting to admin dashboard')
          window.location.href = '/admin/dashboard'
        } else {
          console.log('Redirecting to buyer dashboard')
          window.location.href = '/dashboard'
        }
      }
    }

    setLoading(false)
  }

  return (
    <div className="w-full">
      {/* Role Selection for Sign Up */}
      {isSignUp && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">Choose Your Role</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { role: 'buyer', title: 'Buyer', icon: '🛒', desc: 'Purchase fresh vegetables' },
              { role: 'seller', title: 'Seller', icon: '🌾', desc: 'Sell your farm products' }
            ].map(({ role, title, icon, desc }) => (
              <button
                key={role}
                onClick={() => handleRoleChange(role)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  form.role === role
                    ? 'border-green-500 bg-green-50 shadow-lg'
                    : 'border-gray-200 hover:border-green-300 hover:bg-green-25'
                }`}
              >
                <div className="text-3xl mb-2">{icon}</div>
                <h3 className="font-semibold text-gray-800">{title}</h3>
                <p className="text-sm text-gray-600">{desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              placeholder="Enter your full name"
              required
              value={form.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            name="password"
            placeholder="Enter your password"
            required
            value={form.password}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
          />
        </div>

        {isSignUp && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              required
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{errorMsg}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Please wait...
              </span>
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </button>
        </div>
      </form>

      {/* Toggle between Login/Signup */}
      <div className="mt-6 text-center">
        <p className="text-gray-600">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            className="text-green-600 hover:text-green-700 font-medium hover:underline transition-all"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setErrorMsg('')
              setForm({
                name: '',
                email: '',
                password: '',
                confirmPassword: '',
                role: 'buyer'
              })
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  )
}
