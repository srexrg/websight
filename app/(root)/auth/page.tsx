'use client';
import LoginButton from '@/components/auth/login-button'
import { motion } from 'framer-motion'
import { BarChart3 } from 'lucide-react'
export default function AuthPage() {
  return (
    <div className="flex min-h-screen bg-gray-950 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_200px,#2563eb10,transparent)]" />
      <div className="flex flex-1 flex-col justify-center items-center px-4 sm:px-6 lg:px-20 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-md"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col items-center space-y-6 mb-10"
          >
            <div className="flex items-center justify-center p-3 bg-blue-600/20 border border-blue-500/20 rounded-xl">
              <BarChart3 className="w-10 h-10 text-blue-500" />
            </div>
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Welcome to WebSight
              </h1>
              <p className="text-gray-400">
                Sign in to access your analytics dashboard
              </p>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-gradient-to-r from-blue-600/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-8 shadow-xl"
          >
            <LoginButton />
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}