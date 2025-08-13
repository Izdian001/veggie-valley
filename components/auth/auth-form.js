'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthForm() {
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'buyer',
    // Seller specific fields
    farmName: '',
    bio: '',
    yearsFarming: '',
    location: '',
    phone: ''
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleRoleChange = (role) => {
    setForm({ ...form, role })
    setCurrentStep(1)
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
        // For sellers, we need to store the profile data in user metadata for later use
        if (form.role === 'seller' && data.user) {
          try {
            console.log('Storing seller profile data in user metadata for user:', data.user.id)
            console.log('Form data:', {
              farmName: form.farmName,
              bio: form.bio,
              yearsFarming: form.yearsFarming,
              phone: form.phone,
              location: form.location
            })

            // Store the profile data in user metadata so it can be used later
            const { error: updateError } = await supabase.auth.updateUser({
              data: {
                full_name: form.name,
                role: form.role,
                // Store seller profile data for later use
                seller_profile: {
                  farm_name: form.farmName,
                  bio: form.bio,
                  years_farming: parseInt(form.yearsFarming) || 0,
                  phone: form.phone,
                  location: form.location
                }
              }
            })

            if (updateError) {
              console.error('User metadata update error:', updateError)
              setErrorMsg(`Profile data storage error: ${updateError.message}`)
            } else {
              console.log('✅ Seller profile data stored in user metadata successfully!')
            }
          } catch (profileError) {
            console.error('Profile data storage error:', profileError)
            setErrorMsg(`Profile data storage failed: ${profileError.message}`)
          }
        }

        alert('Sign up successful! Please check your email to confirm your account.')
        setIsSignUp(false)
        setForm({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'buyer',
          farmName: '',
          bio: '',
          yearsFarming: '',
          location: '',
          phone: ''
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
        
        if (user?.user_metadata?.role === 'seller') {
          router.push('/seller/dashboard')
        } else if (user?.user_metadata?.role === 'admin') {
          router.push('/admin/dashboard')
        } else {
          router.push('/dashboard')
        }
      }
    }

    setLoading(false)
  }

  const nextStep = () => {
    if (currentStep === 1 && form.role === 'seller') {
      setCurrentStep(2)
    } else {
      handleSubmit(new Event('submit'))
    }
  }

  const prevStep = () => {
    setCurrentStep(1)
  }

  return (
    <div className="w-full">
      {/* Role Selection for Sign Up */}
      {isSignUp && currentStep === 1 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">Choose Your Role</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { role: 'buyer', title: 'Buyer', icon: '🛒', desc: 'Purchase fresh vegetables' },
              { role: 'seller', title: 'Seller', icon: '🌾', desc: 'Sell your farm products' },
              { role: 'admin', title: 'Admin', icon: '⚙️', desc: 'Manage the platform' }
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
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <>
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
          </>
        )}

        {/* Step 2: Seller Profile */}
        {isSignUp && currentStep === 2 && form.role === 'seller' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Farm/Shop Name
              </label>
              <input
                type="text"
                name="farmName"
                placeholder="Enter your farm or shop name"
                required
                value={form.farmName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio/Description
              </label>
              <textarea
                name="bio"
                placeholder="Tell us about your farm and products..."
                required
                value={form.bio}
                onChange={handleChange}
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Years of Farming
                </label>
                <input
                  type="number"
                  name="yearsFarming"
                  placeholder="0"
                  min="0"
                  value={form.yearsFarming}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Enter phone number"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                name="location"
                placeholder="Enter your farm location"
                required
                value={form.location}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>
          </>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{errorMsg}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {isSignUp && currentStep === 2 && (
            <button
              type="button"
              onClick={prevStep}
              className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
            >
              Back
            </button>
          )}

          <button
            type={currentStep === 1 && isSignUp && form.role === 'seller' ? 'button' : 'submit'}
            onClick={currentStep === 1 && isSignUp && form.role === 'seller' ? nextStep : undefined}
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
              currentStep === 1 && isSignUp && form.role === 'seller' ? 'Next' : (isSignUp ? 'Create Account' : 'Sign In')
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
              setCurrentStep(1)
              setForm({
                name: '',
                email: '',
                password: '',
                confirmPassword: '',
                role: 'buyer',
                farmName: '',
                bio: '',
                yearsFarming: '',
                location: '',
                phone: ''
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
