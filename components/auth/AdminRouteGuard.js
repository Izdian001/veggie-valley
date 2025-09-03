'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AdminRouteGuard({ children }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkAdminStatus()
  }, [])

  const checkAdminStatus = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.log('No user found, redirecting to auth')
        window.location.href = '/auth'
        return
      }

      // Check if user has admin role in metadata
      const userRole = user.user_metadata?.role
      console.log('User role:', userRole)
      
      if (userRole !== 'admin') {
        console.log('User is not admin, redirecting based on role:', userRole)
        // Redirect based on actual role
        if (userRole === 'seller') {
          window.location.href = '/seller/dashboard'
        } else {
          window.location.href = '/dashboard'
        }
        return
      }

      // User is verified admin - allow access immediately
      console.log('User is admin, allowing access')
      setIsAdmin(true)
      setLoading(false)

    } catch (error) {
      console.error('Error checking admin status:', error)
      window.location.href = '/auth'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return <>{children}</>
}
