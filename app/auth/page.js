import  AuthForm  from '@/components/auth/auth-form'

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-100 to-amber-100 relative overflow-hidden">
      {/* SVG vegetable background */}
      <VegetableBg />
      <div className="max-w-md w-full z-10 rounded-xl shadow-xl bg-white/95 py-8 px-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-green-800 mb-2 flex items-center justify-center gap-2">
            Login
          </h1>
          <p className="text-lg text-green-700 font-semibold mb-6">Online Vegetable Vendor</p>
        </div>
        <AuthForm />
      </div>
    </div>
  )
}

// SVG backgrounds for demo vegetable look
function VegetableBg() {
  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-0">
      {/* Top left - green lettuce/circle */}
      <svg className="absolute top-5 left-6 w-12 h-12" viewBox="0 0 40 40">
        <circle cx="18" cy="18" r="15" fill="#B9F881" />
        <ellipse cx="25" cy="18" rx="7" ry="12" fill="#90DA5A" />
      </svg>
      {/* Mid left - small green oval */}
      <svg className="absolute top-1/3 left-2 w-4 h-8" viewBox="0 0 16 32">
        <ellipse cx="8" cy="16" rx="4" ry="8" fill="#CDEFC2" />
      </svg>
      {/* Bottom left - flat green oval */}
      <svg className="absolute bottom-6 left-5 w-16 h-8" viewBox="0 0 32 16">
        <ellipse cx="16" cy="8" rx="14" ry="7" fill="#8BD58A" />
      </svg>
      {/* Top right - carrot (replica) */}
      <svg className="absolute top-5 right-5 w-10 h-20" viewBox="0 0 30 60">
        <rect x="13" y="25" width="4" height="25" rx="2.5" fill="#FACC15" />
        <rect x="17" y="29" width="2" height="21" rx="1" fill="#F59E42" />
        {/* Green stalks */}
        <line x1="15" y1="25" x2="28" y2="8" stroke="#6DB35A" strokeWidth="2"/>
        <line x1="15" y1="25" x2="2" y2="4" stroke="#6DB35A" strokeWidth="2"/>
      </svg>
      {/* Bottom right - tomato */}
      <svg className="absolute bottom-5 right-7 w-12 h-12" viewBox="0 0 40 40">
        <circle cx="18" cy="18" r="13" fill="#F62C25" />
        <ellipse cx="18" cy="13" rx="8" ry="3" fill="#57A849" />
        {/* Small green stem */}
        <rect x="15" y="8" width="6" height="3" rx="1" fill="#57A849" />
      </svg>
      {/* Floating green oval (bottom center) */}
      <svg className="absolute bottom-2 left-1/2 -translate-x-1/2 w-7 h-5" viewBox="0 0 14 10">
        <ellipse cx="7" cy="5" rx="7" ry="5" fill="#9FE189" />
      </svg>
    </div>
  )
}

