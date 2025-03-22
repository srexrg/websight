'use client'

import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

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
      variant="outline"
      className="mt-4 cursor-pointer"
      size="lg"
    >
      Sign out
    </Button>
  )
}