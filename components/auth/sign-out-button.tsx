'use client'

import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <Button
      onClick={handleSignOut}
      variant="ghost"
      size="icon"
      className="text-gray-400 hover:text-white cursor-pointer"
    >
      <LogOut className="h-5 w-5" />
    </Button>
  )
}