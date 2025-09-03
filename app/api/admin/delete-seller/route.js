import { createClient } from '@supabase/supabase-js'

// Initialize the Supabase client with your project URL and anon key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Make sure this is set in your .env.local file
)

export async function POST(request) {
  try {
    const { sellerId } = await request.json()
    
    if (!sellerId) {
      return new Response(JSON.stringify({ error: 'Seller ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // First, verify the current user is an admin
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      request.headers.get('authorization')?.replace('Bearer ', '')
    )
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Check if user is admin
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (adminError || adminData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Delete the user using the admin client
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(sellerId)
    
    if (deleteError) throw deleteError

    // Log the admin action
    await supabaseAdmin
      .from('admin_actions')
      .insert({
        admin_id: user.id,
        action_type: 'delete_seller',
        target_id: sellerId,
        target_type: 'seller',
        action_details: { action: 'deleted', reason: 'Admin action' }
      })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in delete-seller API:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
