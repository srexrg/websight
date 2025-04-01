'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { GlobeIcon, PlusIcon, TrashIcon, AlertCircleIcon, ArrowRightIcon, BarChart3, BookOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

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

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  }

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
      .eq('user_id', userId) 
    
    if (error) {
      console.error('Error removing domain:', error)
      return
    }
    
    setDomains(domains.filter(domain => domain.id !== domainId))
    
    router.refresh()
  }

  function handleDomainClick(domain: string) {
    router.push(`/website/${encodeURIComponent(domain)}`);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full backdrop-blur-xl bg-zinc-900/40 border-zinc-800 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Your Domains</CardTitle>
          <CardDescription className="text-gray-400">
            Add your website domains to start tracking analytics data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addDomain} className="flex gap-3 mb-8">
            <div className="flex-1">
              <Input
                placeholder="Enter your domain (e.g., example.com)"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="w-full bg-zinc-900/60 border-zinc-700 text-white placeholder:text-gray-500 focus:border-violet-500 focus:ring-violet-500/20"
              />
              {error && (
                <motion.div 
                  className="flex items-start gap-1.5 text-red-400 text-sm mt-2"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <AlertCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}
              <p className="text-gray-500 text-xs mt-2">
                Enter only the domain name without http:// or other parts. Example: example.com <br />
                Note: Domains with or without "www." are treated as the same domain.
              </p>
            </div>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all duration-300"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Domain
            </Button>
          </form>
          
          {domains.length === 0 ? (
            <motion.div 
              className="text-center py-16 text-gray-400"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <GlobeIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg mb-2">You haven't added any domains yet.</p>
              <p className="text-sm text-gray-500">Add your first domain above to get started.</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {domains.map((domain, index) => (
                <motion.div
                  key={domain.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card 
                    className="group relative overflow-hidden transition-all border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 hover:border-violet-500/50"
                  >
                    <div 
                      className="p-5 cursor-pointer"
                      onClick={() => handleDomainClick(domain.domain)}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2.5 rounded-xl bg-violet-600/10 text-violet-500">
                          <BarChart3 className="h-5 w-5" />
                        </div>
                        <h3 className="font-medium text-lg text-white group-hover:text-violet-400 transition-colors">{domain.domain}</h3>
                      </div>
                      
                      <div className="text-sm text-gray-500 mb-4">
                        Added on {formatDate(domain.created_at)}
                      </div>
                      
                      <div className="flex items-center text-violet-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        View analytics
                        <ArrowRightIcon className="h-3.5 w-3.5 ml-1" />
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeDomain(domain.id);
                      }}
                      className="absolute top-3 right-3 h-8 w-8 p-0 rounded-lg opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
                      title="Remove domain"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="text-sm text-gray-400 border-t border-zinc-800 pt-6">
          <div className="w-full">
            <p className="mb-3">Need help setting up tracking on your website?</p>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                className="bg-zinc-900/80 hover:bg-zinc-800/90 text-gray-300 hover:text-white border-zinc-700 hover:border-violet-500/50 transition-all duration-300"
                onClick={() => router.push('/settings')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Get tracking code
              </Button>
              <Button 
                variant="ghost" 
                className="text-gray-400 hover:text-violet-400 hover:bg-violet-400/10"
                asChild
              >
                <a href="/docs" target="_blank" rel="noopener noreferrer">
                  <BookOpen className="h-4 w-4 mr-2" />
                  View documentation
                </a>
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  )
}