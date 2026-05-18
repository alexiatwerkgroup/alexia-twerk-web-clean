// src/components/Navbar.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/lib/types'
import { motion } from 'framer-motion'

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    // Check auth state
    const checkAuth = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      setUser(authUser)

      if (authUser) {
        // Fetch profile
        const { data: profileData } = await supabase
          .from('users_profile')
          .select('*')
          .eq('id', authUser.id)
          .single()

        setProfile(profileData)
      }

      setLoading(false)
    }

    checkAuth()

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        const { data: profileData } = await supabase
          .from('users_profile')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(profileData)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    router.push('/')
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-dark/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <span className="hidden sm:inline font-bold text-lg bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              TWERKHUB
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/portals" className="text-text-muted hover:text-primary transition">
              Portals
            </Link>
            <Link href="/pricing" className="text-text-muted hover:text-primary transition">
              Pricing
            </Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {!loading && (
              <>
                {user && profile ? (
                  <>
                    {/* Token Display */}
                    <motion.div
                      className="hidden sm:flex items-center gap-2 px-3 py-1 bg-surface2 border border-border rounded-full"
                      whileHover={{ scale: 1.05 }}
                    >
                      <span className="text-xs font-semibold text-secondary">◆</span>
                      <span className="font-bold text-sm text-white">
                        {profile.tokens_balance.toLocaleString()}
                      </span>
                    </motion.div>

                    {/* Profile Menu */}
                    <div className="relative group">
                      <button className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm hover:shadow-glow transition">
                        {profile.display_name?.charAt(0) || 'U'}
                      </button>

                      <div className="hidden group-hover:block absolute right-0 mt-2 w-48 bg-surface2 border border-border rounded-lg shadow-lg">
                        <Link
                          href="/profile"
                          className="block px-4 py-2 text-text hover:bg-surface text-sm border-b border-border"
                        >
                          Profile
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 text-text hover:bg-surface text-sm"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className="hidden sm:block text-text-muted hover:text-primary transition"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/auth/register"
                      className="px-4 py-2 bg-primary hover:shadow-glow text-white rounded-lg font-semibold transition"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-6 h-6 flex flex-col justify-center gap-1"
            >
              <span className="w-full h-0.5 bg-primary transition" />
              <span className="w-full h-0.5 bg-primary transition" />
              <span className="w-full h-0.5 bg-primary transition" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-border pb-4 space-y-3"
          >
            <Link href="/portals" className="block text-text hover:text-primary transition">
              Portals
            </Link>
            <Link href="/pricing" className="block text-text hover:text-primary transition">
              Pricing
            </Link>
            {user && profile && (
              <>
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <span className="text-secondary">◆</span>
                  {profile.tokens_balance.toLocaleString()} tokens
                </div>
                <Link href="/profile" className="block text-text hover:text-primary transition">
                  Profile
                </Link>
              </>
            )}
          </motion.div>
        )}
      </div>
    </nav>
  )
}
