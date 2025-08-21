'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function BuyerDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth')
      return
    }
    
    // Redirect sellers and admins to their respective dashboards
    if (user.user_metadata?.role === 'seller') {
      router.push('/seller/dashboard')
      return
    }
    if (user.user_metadata?.role === 'admin') {
      router.push('/admin/dashboard')
      return
    }
    
    setUser(user)
    
    // Load profile data including avatar
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single()
    
    setProfile(profileData)
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Veggie Valley</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/products')}
                className="px-4 py-2 text-sm font-medium text-green-600 hover:text-green-700"
              >
                Browse Products
              </button>
              <button
                onClick={() => router.push('/dashboard/profile')}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700"
              >
                Profile
              </button>
              <button
                onClick={() => router.push('/orders')}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700"
              >
                My Orders
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-green-100 rounded-full overflow-hidden flex items-center justify-center">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Welcome back, {user?.user_metadata?.full_name}!
              </h2>
              <p className="text-gray-600">
                Discover fresh vegetables from local farmers
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-4xl mb-4">🥬</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Fresh Vegetables</h3>
              <p className="text-gray-600 mb-4">Browse our selection of fresh, locally grown vegetables</p>
              <button
                onClick={() => router.push('/products')}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
              >
                Shop Now
              </button>
            </div>
          </div>



          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="text-4xl mb-4">📦</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Orders</h3>
              <p className="text-gray-600 mb-4">Check the status of your recent orders</p>
              <button
                onClick={() => router.push('/orders')}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
              >
                View Orders
              </button>
            </div>
          </div>
        </div>



        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-gray-600">No recent orders yet</p>
            <p className="text-sm text-gray-500">Start shopping to see your order history here</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import { supabase } from '@/lib/supabaseClient';
// import Link from 'next/link';

// export default function BuyerDashboard() {
//   const router = useRouter();
//   const [user, setUser] = useState(null);
//   const [profile, setProfile] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     checkUser();
//   }, []);

//   const checkUser = async () => {
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) {
//       router.push('/auth');
//       return;
//     }
    
//     // Redirect sellers and admins to their respective dashboards
//     if (user.user_metadata?.role === 'seller') {
//       router.push('/seller/dashboard');
//       return;
//     }
//     if (user.user_metadata?.role === 'admin') {
//       router.push('/admin/dashboard');
//       return;
//     }
    
//     setUser(user);
    
//     // Load profile data including avatar
//     const { data: profileData } = await supabase
//       .from('profiles')
//       .select('full_name, avatar_url')
//       .eq('id', user.id)
//       .single();
    
//     setProfile(profileData);
//     setLoading(false);
//   };

//   const handleSignOut = async () => {
//     await supabase.auth.signOut();
//     router.push('/');
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <header className="bg-white shadow-sm border-b">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex justify-between items-center py-4">
//             <div className="flex items-center">
//               <h1 className="text-2xl font-bold text-gray-900">Veggie Valley</h1>
//             </div>
//             <div className="flex items-center space-x-3">
//               <Link
//                 href="/products"
//                 className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
//               >
//                 Browse Products
//               </Link>
//               {!loading && user && user.user_metadata?.role === 'buyer' && (
//                 <Link
//                   href="/wishlist"
//                   className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
//                 >
//                   Wishlist
//                 </Link>
//               )}
//               <Link
//                 href="/dashboard"
//                 className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
//               >
//                 Dashboard
//               </Link>
//               <button
//                 onClick={handleSignOut}
//                 className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
//               >
//                 Sign Out
//               </button>
//             </div>
//           </div>
//         </div>
//       </header>

//       {/* Quick Actions */}
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
//           <div className="bg-white rounded-lg shadow p-6">
//             <div className="text-center">
//               <div className="text-4xl mb-4">🥬</div>
//               <h3 className="text-lg font-semibold text-gray-900 mb-2">Fresh Vegetables</h3>
//               <p className="text-gray-600 mb-4">Browse our selection of fresh, locally grown vegetables</p>
//               <button
//                 onClick={() => router.push('/products')}
//                 className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
//               >
//                 Shop Now
//               </button>
//             </div>
//           </div>

//           <div className="bg-white rounded-lg shadow p-6">
//             <div className="text-center">
//               <div className="text-4xl mb-4">📦</div>
//               <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Orders</h3>
//               <p className="text-gray-600 mb-4">Check the status of your recent orders</p>
//               <button
//                 onClick={() => router.push('/orders')}
//                 className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
//               >
//                 View Orders
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Recent Activity */}
//         <div className="bg-white rounded-lg shadow p-6">
//           <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
//           <div className="text-center py-8">
//             <div className="text-4xl mb-4">📋</div>
//             <p className="text-gray-600">No recent orders yet</p>
//             <p className="text-sm text-gray-500">Start shopping to see your order history here</p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }