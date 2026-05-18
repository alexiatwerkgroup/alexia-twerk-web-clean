// src/app/portals/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase, getUserProfile } from '@/lib/supabase'
import { PortalCard } from '@/components'
import { UserProfile, SubscriptionLevel } from '@/lib/types'

interface Portal {
  id: string
  title: string
  description: string
  icon: string
  color: 'cyan' | 'pink' | 'purple'
  requiredLevel: SubscriptionLevel
  contentCount: number
  featured?: boolean
}

const PORTALS: Portal[] = [
  {
    id: 'free',
    title: 'Free Portal',
    description: 'Discover exclusive content available to everyone',
    icon: '🎉',
    color: 'cyan',
    requiredLevel: 'free',
    contentCount: 24,
  },
  {
    id: 'private',
    title: 'Private Portal',
    description: 'Premium exclusive content for subscribers',
    icon: '🔐',
    color: 'pink',
    requiredLevel: 'basic',
    contentCount: 48,
    featured: true,
  },
  {
    id: 'playlist',
    title: 'Playlist Portal',
    description: 'Curated collections and advanced features',
    icon: '⭐',
    color: 'purple',
    requiredLevel: 'full',
    contentCount: 96,
  },
]

export default function PortalsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
          router.push('/auth/login')
          return
        }

        setUser(authUser)

        const profileData = await getUserProfile(authUser.id)
        setProfile(profileData)
        setLoading(false)
      } catch (err) {
        console.error('Error loading portals:', err)
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }} className="text-4xl">
          ⚡
        </motion.div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Not logged in</h1>
          <Link href="/auth/login" className="px-6 py-3 bg-primary hover:shadow-glow text-white rounded-lg font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4">Explore Portals</h1>
          <p className="text-xl text-text-muted max-w-2xl mx-auto">
            Choose your content experience with our multi-tier portal system. Your current plan:{' '}
            <span className="text-primary font-semibold capitalize">{profile.subscription_level || 'free'}</span>
          </p>
        </motion.div>

        {/* Portal Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {PORTALS.map((portal, index) => (
            <motion.div
              key={portal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <PortalCard
                {...portal}
                userLevel={profile?.subscription_level || 'free'}
              />
            </motion.div>
          ))}
        </div>

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-surface border border-border rounded-2xl p-12 mb-12"
        >
          <h2 className="text-3xl font-bold text-white mb-8 text-center">How It Works</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/20 border border-primary/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📺</span>
              </div>
              <h3 className="font-bold text-white mb-2">Browse Content</h3>
              <p className="text-text-muted text-sm">
                Explore thousands of videos across our portals. Filter by category, duration, and popularity.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-secondary/20 border border-secondary/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">▶️</span>
              </div>
              <h3 className="font-bold text-white mb-2">Watch & Earn</h3>
              <p className="text-text-muted text-sm">
                Watch videos and earn tokens automatically. 1 token per 60 seconds watched.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/20 border border-primary/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">◆</span>
              </div>
              <h3 className="font-bold text-white mb-2">Redeem Rewards</h3>
              <p className="text-text-muted text-sm">
                Use tokens to unlock premium features, exclusive content, and special rewards.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Portal Access Guide */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 rounded-2xl p-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6">Portal Access Guide</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400 font-bold">🎉</span>
              </div>
              <div>
                <h3 className="font-bold text-white">Free Portal (Public)</h3>
                <p className="text-text-muted text-sm">
                  Available to all users. Features curated free content, community picks, and introductory material.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-pink-500/20 border border-pink-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-pink-400 font-bold">🔐</span>
              </div>
              <div>
                <h3 className="font-bold text-white">Private Portal (Basic+)</h3>
                <p className="text-text-muted text-sm">
                  Requires Basic subscription or higher. Unlock exclusive creator content, early releases, and member-only benefits.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-400 font-bold">⭐</span>
              </div>
              <div>
                <h3 className="font-bold text-white">Playlist Portal (Premium)</h3>
                <p className="text-text-muted text-sm">
                  Exclusive to Premium subscribers. Access VIP collections, director's cuts, and behind-the-scenes content.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Upgrade CTA */}
        {profile.subscription_level !== 'full' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-12 text-center"
          >
            <div className="bg-surface border border-border rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-white mb-2">Want unlimited access?</h3>
              <p className="text-text-muted mb-6">
                Upgrade to Premium to unlock all portals and get 3x watch rewards.
              </p>
              <Link
                href="/pricing"
                className="inline-block px-8 py-4 bg-primary hover:shadow-glow text-white font-bold rounded-lg transition"
              >
                View Plans
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
