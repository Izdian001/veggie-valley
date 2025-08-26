'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function SignOutControl() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      const { data } = await supabase.auth.getUser()
      if (isMounted) {
        setUser(data?.user || null)
        setLoading(false)
      }
    }
    load()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      isMounted = false
      authListener?.subscription?.unsubscribe?.()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return null
  }

  if (!user) {
    return (
      <Link href="/auth" className="text-gray-700 hover:text-gray-900 text-sm">
        Sign In
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/dashboard/profile" className="text-gray-700 hover:text-gray-900 text-sm">
        Profile
      </Link>
      <span className="h-4 w-px bg-gray-200" />
      <button onClick={handleSignOut} className="text-gray-700 hover:text-gray-900 text-sm">
        Sign Out
      </button>
    </div>
  )
}
