import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function VerifyEmail() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-green-600 mb-4">Check Your Email</h1>
        <p className="text-gray-600 mb-6">
          We've sent you a verification link. Please check your email and click the link to verify your account.
        </p>
        <Link href="/auth">
          <Button>Back to Login</Button>
        </Link>
      </div>
    </div>
  )
}
