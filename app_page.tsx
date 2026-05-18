// src/app/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { PortalCard } from '@/components'
import { UserProfile, SubscriptionLevel } from '@/lib/types'

const PORTALS = [
  {
    id: 'free',
    title: 'Free Portal',
    description: 'Discover exclusive content available to everyone',
    icon: '🎉',
    color: 'cyan',
    requiredLevel: 'free' as SubscriptionLevel,
  },
  {
    id: 'private',
    title: 'Private Portal',
    description: 'Premium exclusive content for subscribers',
    icon: '🔐',
    color: 'pink',
    requiredLevel: 'basic' as SubscriptionLevel,
  },
  {
    id: 'playlist',
    title: 'Playlist Portal',
    description: 'Curated collections and advanced features',
    icon: '⭐',
    color: 'purple',
    requiredLevel: 'full' as SubscriptionLevel,
  },
]

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      setUser(authUser)

      if (authUser) {
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
  }, [])

  return (
    <div className="min-h-screen bg-dark">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 opacity-30" />
          <motion.div
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%'],
            }}
            transition={{ duration: 20, repeat: Infinity, repeatType: 'reverse' }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"
            style={{ backgroundSize: '200% 200%' }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32 text-center">
          {/* Main headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <h1 className="text-6xl sm:text-7xl font-bold tracking-tight">
              <span className="text-white">Premium Content,</span>
              <br />
              <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                Token-Powered
              </span>
            </h1>

            <p className="text-xl text-text-muted max-w-2xl mx-auto">
              Experience exclusive content with our token economy system. Earn rewards, collect points, and unlock premium portals.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              {user ? (
                <>
                  <Link
                    href="/portals"
                    className="px-8 py-4 bg-primary hover:shadow-glow text-white font-bold rounded-lg transition"
                  >
                    Explore Portals
                  </Link>
                  <Link
                    href="/profile"
                    className="px-8 py-4 bg-surface2 border border-border hover:border-primary text-white font-bold rounded-lg transition"
                  >
                    View Profile
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/register"
                    className="px-8 py-4 bg-primary hover:shadow-glow text-white font-bold rounded-lg transition"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    href="/auth/login"
                    className="px-8 py-4 bg-surface2 border border-border hover:border-primary text-white font-bold rounded-lg transition"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-8 pt-8 border-t border-border/30 mt-8">
              <div>
                <div className="text-2xl font-bold text-secondary">10K+</div>
                <div className="text-sm text-text-muted">Active Members</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-secondary">50K+</div>
                <div className="text-sm text-text-muted">Hours of Content</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-secondary">100%</div>
                <div className="text-sm text-text-muted">Secure & Private</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Portals Section */}
      <section className="relative py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-white mb-4">Explore Portals</h2>
            <p className="text-text-muted max-w-2xl mx-auto">
              Choose your content experience with our multi-tier portal system
            </p>
          </motion.div>

          {/* Portal Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PORTALS.map((portal, index) => (
              <motion.div
                key={portal.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <PortalCard
                  {...portal}
                  userLevel={profile?.subscription_level || 'free'}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Token System Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl font-bold text-white mb-6">Token System</h2>
              <div className="space-y-4 text-text-muted">
                <p className="flex gap-3">
                  <span className="text-secondary text-xl">◆</span>
                  <span>Earn tokens daily through login bonuses</span>
                </p>
                <p className="flex gap-3">
                  <span className="text-secondary text-xl">◆</span>
                  <span>Get rewards for watching content and engagement</span>
                </p>
                <p className="flex gap-3">
                  <span className="text-secondary text-xl">◆</span>
                  <span>Refer friends and earn 100 tokens per signup</span>
                </p>
                <p className="flex gap-3">
                  <span className="text-secondary text-xl">◆</span>
                  <span>Use tokens to unlock premium features</span>
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 rounded-2xl p-8"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-surface2 rounded-lg border border-border">
                  <span className="text-text-muted">Daily Login</span>
                  <span className="font-bold text-secondary">+10 ◆</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-surface2 rounded-lg border border-border">
                  <span className="text-text-muted">Watch Hour</span>
                  <span className="font-bold text-secondary">+60 ◆</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-surface2 rounded-lg border border-border">
                  <span className="text-text-muted">Referral</span>
                  <span className="font-bold text-secondary">+100 ◆</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-20 bg-gradient-to-r from-primary/20 to-secondary/20 border-y border-border">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
            <h2 className="text-4xl font-bold text-white">Ready to Join?</h2>
            <p className="text-lg text-text-muted">
              Get started free today and unlock your first portal
            </p>
            <Link
              href="/auth/register"
              className="inline-block px-8 py-4 bg-primary hover:shadow-glow text-white font-bold rounded-lg transition"
            >
              Create Free Account
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
