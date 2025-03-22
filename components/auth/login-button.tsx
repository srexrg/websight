'use client'

import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button' 
import { FaGoogle } from 'react-icons/fa'
import { useEffect, useState } from 'react'

export default function LoginButton() {
  const supabase = createClient()
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/api/auth/callback`,
      },
    });

    if (error) {
      console.error('Error:', error.message)
    }
  }

  return (
    <Button
      onClick={handleGoogleLogin}
      className="w-full cursor-pointer"
    >
      <FaGoogle className="mr-2" />  <p className="font-text ">Sign in with Google</p>
    </Button>
  )
}