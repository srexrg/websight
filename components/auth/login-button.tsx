'use client'

import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button' 
import { FaGoogle } from 'react-icons/fa'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

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
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Button
        onClick={handleGoogleLogin}
        className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-300 flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 cursor-pointer"
      >
        <FaGoogle className="text-xl" />
        <span className="text-base">Sign in with Google</span>
      </Button>
    </motion.div>
  )
}