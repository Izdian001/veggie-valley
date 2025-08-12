import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'

export const revalidate = 60 // ISR - refresh every 60s

export default async function ProductsPage() {
  // Fetch all approved products with seller_id from Supabase
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      price,
      images,
      seller_id
    `)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching products:', error.message)
    throw new Error(error.message)
  }

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">All Products</h1>

      {/* No products available */}
      {(!products || products.length === 0) && (
        <p className="text-gray-500">No products available at the moment.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products?.map((product) => (
          <div
            key={product.id}
            className="border rounded-lg p-4 shadow hover:shadow-lg transition"
          >
            {/* Product Image */}
            {product.images?.length > 0 && (
              <Image
                src={product.images[0]}
                alt={product.name}
                width={300}
                height={200}
                className="rounded-md object-cover"
              />
            )}

            {/* Product name and description */}
            <h2 className="text-xl font-bold mt-3">{product.name}</h2>
            <p className="mt-1 text-gray-700">{product.description}</p>

            {/* Price */}
            <p className="mt-2 font-semibold text-green-700">
              ${product.price.toFixed(2)}
            </p>

            {/* 🔗 Seller profile link */}
            <Link
              href={`/seller/${product.seller_id}`}
              className="text-green-700 hover:underline block mt-2"
            >
              View Seller Profile
            </Link>
          </div>
        ))}
      </div>
    </main>
  )
}
