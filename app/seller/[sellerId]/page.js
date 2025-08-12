import { supabase } from '@/lib/supabaseClient'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 60 // Regenerate page every 60 sec

function averageRating(reviews) {
  if (!reviews || reviews.length === 0) return 0
  const total = reviews.reduce((sum, r) => sum + r.rating, 0)
  return (total / reviews.length).toFixed(1)
}

function RatingStars({ rating }) {
  const fullStars = Math.floor(rating)
  const halfStar = rating - fullStars >= 0.5
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0)

  return (
    <div className="flex items-center text-yellow-400">
      {[...Array(fullStars)].map((_, i) => <StarIcon key={`full_${i}`} />)}
      {halfStar && <HalfStarIcon />}
      {[...Array(emptyStars)].map((_, i) => <StarIcon key={`empty_${i}`} empty />)}
      <span className="ml-2 text-gray-700 text-sm">{rating} / 5</span>
    </div>
  )
}

function StarIcon({ empty }) {
  return (
    <svg className={`w-5 h-5 ${empty ? 'text-gray-300' : 'text-yellow-400'}`} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.9 1.6-.9 1.9 0l1.286 3.897 4.084.374c.807.074 1.133 1.07.516 1.607l-3.042 2.815 1.058 3.93c.224.833-.657 1.513-1.376 1.07L10 13.347l-3.477 2.374c-.72.44-1.6-.236-1.377-1.07l1.057-3.93-3.042-2.815c-.616-.537-.29-1.533.516-1.607l4.083-.374 1.287-3.897z" />
    </svg>
  )
}

function HalfStarIcon() {
  return (
    <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
      <defs>
        <linearGradient id="halfGrad">
          <stop offset="50%" stopColor="currentColor" />
          <stop offset="50%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        fill="url(#halfGrad)"
        d="M9.049 2.927c.3-.9 1.6-.9 1.9 0l1.286 3.897 4.084.374c.807.074 1.133 1.07.516 1.607l-3.042 2.815 1.058 3.93c.224.833-.657 1.513-1.376 1.07L10 13.347l-3.477 2.374c-.72.44-1.6-.236-1.377-1.07l1.057-3.93-3.042-2.815c-.616-.537-.29-1.533.516-1.607l4.083-.374 1.287-3.897z"
      />
    </svg>
  )
}

export default async function SellerProfilePage({ params }) {
  const { sellerId } = params

  // Get logged-in user (for showing "Add Product" if owner)
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  // Seller profile with linked basic profile data
  const { data: seller, error: sellerError } = await supabase
    .from('seller_profiles')
    .select(`
      farm_name,
      bio,
      cover_image_url,
      profiles (
        full_name,
        avatar_url,
        email,
        phone,
        city,
        state
      )
    `)
    .eq('id', sellerId)
    .single()

  if (sellerError || !seller || !seller.profiles) {
    return notFound()
  }

  const isOwner = currentUser?.id === sellerId

  // Get all approved products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      price,
      images,
      status,
      reviews(rating)
    `)
    .eq('seller_id', sellerId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  if (productsError) {
    throw new Error(productsError.message)
  }

  return (
    <main className="max-w-6xl mx-auto p-6">
      <section className="flex items-center space-x-6 mb-10">
        {seller.cover_image_url && (
          <Image
            src={seller.cover_image_url}
            alt={`${seller.farm_name} cover`}
            width={150}
            height={150}
            className="rounded-lg object-cover shadow"
          />
        )}
        <div>
          <h1 className="text-4xl font-bold text-green-900">{seller.farm_name}</h1>
          {seller.bio && <p className="mt-2 text-gray-700 max-w-xl">{seller.bio}</p>}
          {seller.profiles.city && seller.profiles.state && (
            <p className="mt-1 text-gray-500">
              Located in {seller.profiles.city}, {seller.profiles.state}
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-semibold mb-6 text-green-800">Products</h2>
        
        {products.length === 0 ? (
          <div>
            <p className="text-gray-600">No products available from this seller yet.</p>
            {isOwner && (
              <Link href="/dashboard/seller/products/new" className="text-green-700 underline block mt-2">
                ➕ Add your first product
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {products.map((product) => {
              const ratings = product.reviews ?? []
              const avgRating = averageRating(ratings.map(r => r.rating))

              return (
                <div key={product.id} className="border rounded-lg shadow hover:shadow-lg transition p-4">
                  {product.images?.length > 0 && (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      width={300}
                      height={200}
                      className="rounded-md object-cover"
                    />
                  )}
                  <h3 className="text-xl font-bold mt-3">{product.name}</h3>
                  <p className="mt-1 text-gray-700">{product.description}</p>
                  <p className="mt-2 font-semibold text-green-700">
                    ${product.price.toFixed(2)}
                  </p>
                  <RatingStars rating={avgRating} />
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
