import LoginButton from '@/components/auth/login-button'
import { ImageIcon } from 'lucide-react'

export default function AuthPage() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-black via-black/95 to-blue-950/20">
      {/* Left side - Main Content */}
      <div className="flex flex-1 flex-col justify-center items-center px-4 sm:px-6 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          {/* Logo and Header */}
          <div className="flex flex-col items-center space-y-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-white/10 rounded-xl">
                <ImageIcon className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Welcome to WebSight
              </h1>
              <p className="text-sm text-gray-400 font-text">
                Sign in to start creating amazing images
              </p>
            </div>
          </div>

          {/* Auth Button and Terms */}
          <div className="mt-10 space-y-8">
            <LoginButton />
            
            <p className="text-xs text-gray-400 text-center px-8 font-text">
              By continuing, you agree to our{' '}
              <a 
                href="/terms" 
                className="text-white hover:text-gray-300 transition-colors"
                tabIndex={0}
                aria-label="Terms of Service"
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a 
                href="/privacy" 
                className="text-white hover:text-gray-300 transition-colors"
                tabIndex={0}
                aria-label="Privacy Policy"
              >
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}