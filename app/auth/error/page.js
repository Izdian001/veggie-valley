import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function AuthError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
        <p className="text-gray-600 mb-6">
          There was an error with your authentication. Please try again.
        </p>
        <Link href="/auth">
          <Button>Back to Login</Button>
        </Link>
      </div>
    </div>
  )
}
