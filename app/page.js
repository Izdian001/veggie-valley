import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🥕 Online Vegetable Vendor
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Connect directly with local farmers and get the freshest vegetables delivered to your door. 
            Support local agriculture while enjoying farm-to-table freshness.
          </p>
          
          <div className="space-x-4">
            <Link href="/auth">
              <Button size="lg">Get Started</Button>
            </Link>
          </div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">🌾</div>
              <h3 className="font-semibold text-lg mb-2">For Farmers</h3>
              <p className="text-gray-600">List your fresh produce and connect directly with customers in your area.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">🛒</div>
              <h3 className="font-semibold text-lg mb-2">For Buyers</h3>
              <p className="text-gray-600">Browse fresh, local vegetables and support farmers in your community.</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-4">🚚</div>
              <h3 className="font-semibold text-lg mb-2">Fresh Delivery</h3>
              <p className="text-gray-600">Get farm-fresh vegetables delivered straight to your doorstep.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}