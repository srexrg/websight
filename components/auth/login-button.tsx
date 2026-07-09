'use client'

import { createClient } from '@/utils/supabase/client'
import { useState } from 'react'

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.06 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.38Z" />
      <path fill="#34A853" d="M12 24c3.1 0 5.7-1.03 7.6-2.78l-3.72-2.89c-1.03.69-2.35 1.1-3.88 1.1-2.98 0-5.5-2.01-6.4-4.72H1.76v2.98A11.5 11.5 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.6 14.71a6.9 6.9 0 0 1 0-4.42V7.31H1.76a11.5 11.5 0 0 0 0 10.38l3.84-2.98Z" />
      <path fill="#EA4335" d="M12 4.77c1.68 0 3.19.58 4.38 1.72l3.28-3.28C17.7 1.2 15.1 0 12 0A11.5 11.5 0 0 0 1.76 6.31l3.84 2.98C6.5 6.78 9.02 4.77 12 4.77Z" />
    </svg>
  )
}

export default function LoginButton() {
  const supabase = createClient()
  const [origin] = useState(() => (typeof window !== 'undefined' ? window.location.origin : ''))
  const [pending, setPending] = useState(false)

  const handleGoogleLogin = async () => {
    setPending(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}/api/auth/callback` },
    })
    if (error) {
      console.error('Error:', error.message)
      setPending(false)
    }
  }

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={pending}
      className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-card px-4 py-3 text-[14px] font-semibold text-foreground shadow-[0_1px_2px_rgba(16,24,40,.05)] transition-all hover:border-brand/40 hover:shadow-[0_2px_10px_rgba(16,24,40,.08)] disabled:opacity-60"
    >
      <GoogleGlyph />
      {pending ? 'Redirecting…' : 'Continue with Google'}
    </button>
  )
}
