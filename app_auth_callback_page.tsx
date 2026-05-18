// src/app/auth/callback/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

export default function CallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from URL (Supabase sends this after OAuth)
        const code = searchParams.get('code')
        const redirect = searchParams.get('redirect') || '/portals'

        if (code) {
          // Exchange code for session
          const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

          if (sessionError) {
            setError('Failed to complete authentication')
            setLoading(false)
            return
          }
        }

        // Verify user is authenticated
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          setError('Authentication failed')
          setLoading(false)
          return
        }

        // Check if user profile exists
        const { data: profile, error: profileError } = await supabase
          .from('users_profile')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          // PGRST116 means no rows found, which is expected for new users
          setError('Failed to load user profile')
          setLoading(false)
          return
        }

        if (!profile) {
          // Profile doesn't exist yet, trigger user creation via trigger
          // The trigger should create it, but we can manually create if needed
          console.log('Profile will be created by database trigger')
        }

        // Give a brief moment to ensure everything is settled
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Redirect to intended page
        router.push(redirect)
      } catch (err: any) {
        console.error('Callback error:', err)
        setError(err.message || 'An error occurred')
        setLoading(false)
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-6"
      >
        {error ? (
          <>
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl">⚠️</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Authentication Error</h1>
              <p className="text-text-muted max-w-md mx-auto">{error}</p>
              <div className="mt-6 space-x-4">
                <button
                  onClick={() => window.history.back()}
                  className="px-6 py-3 bg-surface2 hover:bg-surface border border-border rounded-lg text-white font-semibold transition"
                >
                  Go Back
                </button>
                <button
                  onClick={() => window.location.href = '/auth/login'}
                  className="px-6 py-3 bg-primary hover:shadow-glow text-white font-semibold rounded-lg transition"
                >
                  Try Again
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center mx-auto">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="text-3xl"
              >
                ⚡
              </motion.span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Completing Sign In</h1>
              <p className="text-text-muted">Please wait while we set up your account...</p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
