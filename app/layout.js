import './globals.css'
import Link from 'next/link'
import SignOutControl from '@/components/auth/SignOutControl'

export const metadata = {
  title: 'Online Vegetable Vendor',
  description: 'Connect farmers with fresh produce lovers',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex items-center justify-between py-4">
              <Link href="/" className="text-lg font-semibold text-green-700">Veggie Valley</Link>
              <div className="flex items-center gap-4 text-sm">
                <Link href="/wishlist" className="text-gray-700 hover:text-gray-900">Wishlist</Link>
                <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">Dashboard</Link>
                <span className="h-5 w-px bg-gray-200" />
                <SignOutControl />
              </div>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}
