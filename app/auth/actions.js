'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signUp(formData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email'),
    password: formData.get('password'),
    options: {
      data: {
        full_name: formData.get('full_name'),
        role: formData.get('role') || 'buyer',
      },
    },
  }

  const { data: authData, error } = await supabase.auth.signUp(data)

  if (error) {
    console.error('Signup error:', error)
    redirect('/auth/error')
  }

  // If seller, create seller profile
  if (authData.user && formData.get('role') === 'seller') {
    const { error: profileError } = await supabase
      .from('seller_profiles')
      .insert({
        id: authData.user.id,
        farm_name: formData.get('farm_name') || '',
        bio: formData.get('bio') || '',
        experience_years: parseInt(formData.get('experience_years')) || 0,
        location: formData.get('location') || '',
        phone: formData.get('phone') || '',
        created_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
    }
  }

  revalidatePath('/', 'layout')
  redirect('/auth/verify-email')
}

export async function signIn(formData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    console.error('Signin error:', error)
    redirect('/auth/error')
  }

  // Get user to check role and redirect accordingly
  const { data: { user } } = await supabase.auth.getUser()
  
  revalidatePath('/', 'layout')
  
  if (user?.user_metadata?.role === 'seller') {
    redirect('/seller/dashboard')
  } else if (user?.user_metadata?.role === 'admin') {
    redirect('/admin/dashboard')
  } else {
    redirect('/dashboard')
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
