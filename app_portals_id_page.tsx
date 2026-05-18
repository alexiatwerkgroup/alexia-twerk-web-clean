// src/app/portals/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase, getUserProfile, getContent } from '@/lib/supabase'
import { UserProfile, Content, SubscriptionLevel } from '@/lib/types'

interface ContentItem {
  id: string
  title: string
  description: string
  duration_seconds: number
  thumbnail_url: string
  slug: string
  required_level: SubscriptionLevel
  views_count: number
  watch_time_seconds: number
}

const PORTAL_INFO = {
  free: {
    title: 'Free Portal',
    description: 'Exclusive content available to everyone',
    icon: '🎉',
    color: 'from-cyan-500/20 to-blue-500/20',
    borderColor: 'border-cyan-500/30',
    requiredLevel: 'free' as SubscriptionLevel,
  },
  private: {
    title: 'Private Portal',
    description: 'Premium exclusive content for subscribers',
    icon: '🔐',
    color: 'from-pink-500/20 to-red-500/20',
    borderColor: 'border-pink-500/30',
    requiredLevel: 'basic' as SubscriptionLevel,
  },
  playlist: {
    title: 'Playlist Portal',
    description: 'Curated collections and advanced features',
    icon: '⭐',
    color: 'from-purple-500/20 to-pink-500/20',
    borderColor: 'border-purple-500/30',
    requiredLevel: 'full' as SubscriptionLevel,
  },
}

export default function PortalPage() {
  const router = useRouter()
  const params = useParams()
  const portalId = params?.id as string

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'watched' | 'unwatched'>('all')

  const portalInfo = PORTAL_INFO[portalId as keyof typeof PORTAL_INFO]

  useEffect(() => {
    const loadPortalContent = async () => {
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

        // Check access
        if (profileData) {
          const levelHierarchy = {
            free: 0,
            basic: 1,
            medium: 2,
            full: 3,
          }

          const userLevel = levelHierarchy[profileData.subscription_level]
          const requiredLevel = levelHierarchy[portalInfo?.requiredLevel || 'free']

          if (userLevel < requiredLevel) {
            router.push('/pricing')
            return
          }
        }

        // Fetch content
        const contentData = await getContent(portalId)
        setContent(contentData || [])
        setLoading(false)
      } catch (err) {
        console.error('Error loading portal:', err)
        setLoading(false)
      }
    }

    if (portalInfo) {
      loadPortalContent()
    }
  }, [router, portalId, portalInfo])

  if (!portalInfo) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Portal not found</h1>
          <Link href="/portals" className="text-primary hover:text-secondary transition">
            ← Back to portals
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }} className="text-4xl">
          ⚡
        </motion.div>
      </div>
    )
  }

  const filteredContent = content.filter((item) => {
    if (filter === 'watched') return item.watch_time_seconds > 0
    if (filter === 'unwatched') return item.watch_time_seconds === 0
    return true
  })

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-dark py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <Link href="/portals" className="text-primary hover:text-secondary transition text-sm mb-6 inline-block">
            ← Back to portals
          </Link>

          <div className={`bg-gradient-to-r ${portalInfo.color} border ${portalInfo.borderColor} rounded-2xl p-8 mb-8`}>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl">{portalInfo.icon}</span>
              <div>
                <h1 className="text-4xl font-bold text-white">{portalInfo.title}</h1>
                <p className="text-text-muted">{portalInfo.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-text-muted">{content.length} videos</span>
              <span className="text-text-muted">•</span>
              <span className="text-text-muted">
                {Math.floor(
                  content.reduce((sum, item) => sum + item.duration_seconds, 0) / 3600
                )}{' '}
                hours
              </span>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex gap-3 mb-8"
        >
          {(['all', 'watched', 'unwatched'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-border text-text-muted hover:border-primary'
              }`}
            >
              {f === 'all' && 'All Videos'}
              {f === 'watched' && 'Watched'}
              {f === 'unwatched' && 'Unwatched'}
            </button>
          ))}
        </motion.div>

        {/* Content Grid */}
        {filteredContent.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContent.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <Link href={`/watch/${item.slug}`}>
                  <div className="group relative overflow-hidden rounded-xl bg-surface border border-border hover:border-primary transition cursor-pointer">
                    {/* Thumbnail */}
                    <div className="aspect-video bg-surface2 overflow-hidden relative">
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <span className="text-4xl">▶️</span>
                      </div>

                      {/* Progress Bar */}
                      {item.watch_time_seconds > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${Math.min((item.watch_time_seconds / item.duration_seconds) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-white mb-2 line-clamp-2 group-hover:text-primary transition">
                        {item.title}
                      </h3>

                      <div className="flex items-center justify-between text-xs text-text-muted">
                        <span>{formatDuration(item.duration_seconds)}</span>
                        <span>{item.views_count.toLocaleString()} views</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-surface border border-border rounded-2xl">
            <p className="text-text-muted text-lg mb-4">No videos found with this filter</p>
            <button
              onClick={() => setFilter('all')}
              className="text-primary hover:text-secondary transition"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
