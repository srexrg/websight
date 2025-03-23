'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { GlobeIcon, PlusIcon, TrashIcon, AlertCircleIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Domain {
  id: string;
  domain: string;
  created_at: string;
}

export default function DomainManager({ 
  userId, 
  initialDomains 
}: { 
  userId: string;
  initialDomains: Domain[];
}) {
  const [domains, setDomains] = useState<Domain[]>(initialDomains)
  const [newDomain, setNewDomain] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  function normalizeDomain(domain: string): string {
    return domain.replace(/^www\./i, '');
  }


  function validateAndParseDomain(input: string): { isValid: boolean; domain: string; normalizedDomain: string; error: string | null } {
    input = input.trim()
    
    if (!input) {
      return { isValid: false, domain: '', normalizedDomain: '', error: 'Domain cannot be empty' }
    }
    

    if (input.includes('://')) {
      return { 
        isValid: false, 
        domain: '',
        normalizedDomain: '',
        error: 'Please enter only the domain name without http:// or https://' 
      }
    }
    

    if (input.startsWith('http') || input.startsWith('https')) {
      return { 
        isValid: false,
        domain: '',
        normalizedDomain: '',
        error: 'Please enter only the domain name without http or https' 
      }
    }
    
   
    if (input.includes('/')) {
      return { 
        isValid: false,
        domain: '',
        normalizedDomain: '',
        error: 'Please enter only the domain name without any paths (e.g., example.com instead of example.com/page)' 
      }
    }
    
    if (input.includes('?') || input.includes('#')) {
      return { 
        isValid: false,
        domain: '',
        normalizedDomain: '',
        error: 'Please enter only the domain name without query parameters or fragments' 
      }
    }
    

    if (input.includes(':')) {
      return { 
        isValid: false,
        domain: '',
        normalizedDomain: '',
        error: 'Please enter only the domain name without port numbers' 
      }
    }

    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i
    if (!domainRegex.test(input)) {
      return { 
        isValid: false,
        domain: '',
        normalizedDomain: '',
        error: 'Please enter a valid domain name (e.g., example.com)' 
      }
    }

    const normalizedDomain = normalizeDomain(input);
    
    return { 
      isValid: true, 
      domain: input, 
      normalizedDomain: normalizedDomain, 
      error: null 
    }
  }

  async function addDomain(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    
    const validation = validateAndParseDomain(newDomain)
    
    if (!validation.isValid) {
      setError(validation.error)
      return
    }
    
    setIsSubmitting(true)
    

    const { data: existingDomain, error: checkError } = await supabase
      .from('domains')
      .select('id, user_id, domain')
      .eq('domain', validation.normalizedDomain)
      .single()
      
    if (checkError && checkError.code !== 'PGRST116') {

      console.error('Error checking domain:', checkError)
      setError('Error checking domain availability. Please try again.')
      setIsSubmitting(false)
      return
    }
    
    if (existingDomain) {
  
      if (existingDomain.user_id === userId) {
        const enteredWithWWW = validation.domain.startsWith('www.');
        const storedWithWWW = existingDomain.domain.startsWith('www.');
        
        if (enteredWithWWW !== storedWithWWW) {
          setError(`You've already registered this domain as "${existingDomain.domain}"`);
        } else {
          setError('You have already added this domain');
        }
      } else {
        setError('This domain has already been registered by another user');
      }
      setIsSubmitting(false)
      return
    }
    

    const { data: newDomainData, error: insertError } = await supabase
      .from('domains')
      .insert({
        user_id: userId,
        domain: validation.normalizedDomain,
        created_at: new Date().toISOString()
      })
      .select()
    
    setIsSubmitting(false)
    
    if (insertError) {
      console.error('Error adding domain:', insertError)
      setError('Failed to add domain. Please try again.')
      return
    }
    

    setNewDomain('')
    
  
    if (newDomainData && newDomainData[0]) {
      setDomains([newDomainData[0], ...domains]);
    } else {
      const tempId = Date.now().toString();
      const newDomainObj = {
        id: tempId,
        domain: validation.normalizedDomain,
        created_at: new Date().toISOString()
      }
      setDomains([newDomainObj, ...domains]);
    }
    
    router.refresh()
  }
  
  async function removeDomain(domainId: string) {
    const { error } = await supabase
      .from('domains')
      .delete()
      .eq('id', domainId)
      .eq('user_id', userId) // Security check
    
    if (error) {
      console.error('Error removing domain:', error)
      return
    }
    
    setDomains(domains.filter(domain => domain.id !== domainId))
    
    router.refresh()
  }

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="text-2xl">Your Domains</CardTitle>
        <CardDescription>
          Add your website domains to start tracking analytics data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={addDomain} className="flex gap-2 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Enter your domain (e.g., example.com)"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="w-full"
            />
            {error && (
              <div className="flex items-start gap-1.5 text-destructive text-sm mt-2">
                <AlertCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
            <p className="text-muted-foreground text-xs mt-2">
              Enter only the domain name without http:// or other parts. Example: example.com <br />
              Note: Domains with or without "www." are treated as the same domain (e.g., example.com and www.example.com).
            </p>
          </div>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="flex items-center gap-1 cursor-pointer"
          >
            <PlusIcon className="h-4 w-4" />
            Add Domain
          </Button>
        </form>
        
        <div className="space-y-3">
          {domains.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GlobeIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>You haven't added any domains yet.</p>
              <p className="text-sm">Add your first domain above to get started.</p>
            </div>
          ) : (
            domains.map((domain) => (
              <div 
                key={domain.id}
                className="flex items-center justify-between p-3 rounded-md border bg-card"
              >
                <div className="flex items-center gap-2">
                  <GlobeIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{domain.domain}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDomain(domain.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground border-t pt-6">
        <div>
          <p>Need help setting up tracking on your website?</p>
          <p>Check our <a href="#" className="text-primary hover:underline">documentation</a> for easy integration steps.</p>
        </div>
      </CardFooter>
    </Card>
  )
}