import { supabase } from '@/lib/supabaseClient'

export async function getUserProfile() {
  // 1. Get the current logged-in user
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) return null // no session

  // 2. Fetch the user's profile + role-specific data
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(`
      *,
      buyer_profiles (*),
      seller_profiles (*),
      admin_profiles (*)
    `)
    .eq('id', user.id)
    .single()

  if (profileError) throw profileError

  return profile
}
