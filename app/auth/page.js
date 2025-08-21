import AuthForm from '@/components/auth/auth-form'

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 relative overflow-hidden">
      <VegetableBg />
      
      <div className="max-w-lg w-full z-10 rounded-2xl shadow-2xl bg-white/95 backdrop-blur-sm py-10 px-8 mx-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Veggie Valley</h1>
          </div>
          <p className="text-lg text-gray-600 font-medium">Fresh from Farm to Table</p>
        </div>
        
        <AuthForm />
      </div>
    </div>
  )
}

function VegetableBg() {
  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-0">
      <div className="absolute top-10 left-10 w-16 h-16 animate-bounce">
        <svg viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="24" fill="#B9F881" opacity="0.8" />
          <ellipse cx="40" cy="32" rx="12" ry="20" fill="#90DA5A" opacity="0.6" />
        </svg>
      </div>
      
      <div className="absolute top-1/4 right-16 w-12 h-24 animate-pulse">
        <svg viewBox="0 0 48 96">
          <rect x="20" y="40" width="8" height="40" rx="4" fill="#FACC15" />
          <rect x="28" y="44" width="4" height="36" rx="2" fill="#F59E42" />
          <line x1="24" y1="40" x2="40" y2="16" stroke="#6DB35A" strokeWidth="3"/>
          <line x1="24" y1="40" x2="8" y2="8" stroke="#6DB35A" strokeWidth="3"/>
        </svg>
      </div>
      
      <div className="absolute bottom-20 left-1/4 w-14 h-14">
        <svg viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="20" fill="#F62C25" opacity="0.7" />
          <ellipse cx="28" cy="20" rx="12" ry="4" fill="#57A849" opacity="0.8" />
        </svg>
      </div>
    </div>
  )
}

