import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/auth')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Welcome back, {profile.full_name || 'User'}!
            </h1>
            <p className="text-gray-600 capitalize">{profile.role} Dashboard</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">{profile.email}</span>
            <form action={signOut}>
              <Button type="submit" variant="outline">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
          <p className="text-gray-600">
            Welcome to your {profile.role} dashboard! This is where you'll manage your profile and activities.
          </p>
          
          {profile.role === 'admin' && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800">Admin Features</h3>
              <p className="text-blue-600">You have admin access to manage users and approve listings.</p>
            </div>
          )}
          
          {profile.role === 'seller' && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-800">Seller Features</h3>
              <p className="text-green-600">You can create farm profiles and list products for sale.</p>
            </div>
          )}
          
          {profile.role === 'buyer' && (
            <div className="mt-6 p-4 bg-orange-50 rounded-lg">
              <h3 className="font-medium text-orange-800">Buyer Features</h3>
              <p className="text-orange-600">You can browse and purchase fresh vegetables from local farmers.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
