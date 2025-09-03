import { createClient } from '@supabase/supabase-js'

// Initialize the Supabase client with service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  // Set CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  try {
    const { sellerId } = await request.json()
    console.log('Received request to delete seller:', sellerId)
    
    if (!sellerId) {
      console.error('No sellerId provided')
      return new Response(JSON.stringify({ error: 'Seller ID is required' }), {
        status: 400,
        headers
      })
    }

    // Get the authorization token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      console.error('No authorization token provided')
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers
      })
    }

    // Verify the current user is an admin
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Authentication error:', userError?.message || 'No user found')
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers
      })
    }

    // Check if user is admin
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (adminError || adminData?.role !== 'admin') {
      console.error('User is not admin:', user.id)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers
      })
    }

    console.log(`Deleting seller with ID: ${sellerId} by admin: ${user.id}`)

    // Delete the user using the admin client
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(sellerId)
    
    if (deleteError) {
      console.error('Error deleting auth user:', deleteError)
      throw deleteError
    }

    // Delete from seller_profiles
    const { error: profileError } = await supabaseAdmin
      .from('seller_profiles')
      .delete()
      .eq('id', sellerId)

    if (profileError) {
      console.error('Error deleting seller profile:', profileError)
      throw profileError
    }

    // Log the admin action
    const { error: logError } = await supabaseAdmin
      .from('admin_actions')
      .insert({
        admin_id: user.id,
        action_type: 'delete_seller',
        target_id: sellerId,
        target_type: 'seller',
        action_details: { action: 'deleted', reason: 'Admin action' }
      })

    if (logError) {
      console.error('Error logging admin action:', logError)
      // Don't fail the request if logging fails
    }

    console.log(`Successfully deleted seller: ${sellerId}`)
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Error in delete-seller API:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
