// src/app/watch/[slug]/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase, getUserProfile, getContentBySlug, canAccessContent } from '@/lib/supabase'
import { UserProfile, Content } from '@/lib/types'

interface VideoData {
  id: string
  title: string
  description: string
  duration_seconds: number
  required_level: string
  views_count: number
  video_path: string
  slug: string
}

export default function WatchPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params?.slug as string

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [video, setVideo] = useState<VideoData | null>(null)
  const [signedUrl, setSignedUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [watchTime, setWatchTime] = useState(0)
  const [tokensEarned, setTokensEarned] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const loadVideo = async () => {
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

        // Get video metadata
        const videoData = await getContentBySlug(slug)

        if (!videoData) {
          setError('Video not found')
          setLoading(false)
          return
        }

        // Check access
        const hasAccess = await canAccessContent(authUser.id, videoData.id)

        if (!hasAccess) {
          router.push('/pricing')
          return
        }

        setVideo(videoData)

        // Get signed URL
        const response = await fetch(`/api/content/signed-url?slug=${slug}`)
        const data = await response.json()

        if (data.signed_url) {
          setSignedUrl(data.signed_url)
        } else {
          setError('Failed to load video')
        }

        setLoading(false)
      } catch (err: any) {
        console.error('Error loading video:', err)
        setError(err.message || 'An error occurred')
        setLoading(false)
      }
    }

    if (slug) {
      loadVideo()
    }
  }, [router, slug])

  // Track watch time and earn tokens
  const recordWatchTime = async (timeSeconds: number) => {
    if (!user || !video) return

    try {
      const response = await fetch('/api/content/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_id: video.id,
          watch_time_seconds: timeSeconds,
        }),
      })

      const data = await response.json()

      if (data.tokens_earned) {
        setTokensEarned(data.tokens_earned)
      }
    } catch (err) {
      console.error('Error recording watch time:', err)
    }
  }

  const handleVideoPlay = () => {
    setIsPlaying(true)
  }

  const handleVideoPause = () => {
    setIsPlaying(false)

    if (videoRef.current) {
      const currentTime = Math.floor(videoRef.current.currentTime)

      if (currentTime > watchTime) {
        const newWatchTime = currentTime
        const earnedTime = newWatchTime - watchTime
        setWatchTime(newWatchTime)

        // Record every 60 seconds watched
        if (earnedTime >= 60) {
          recordWatchTime(earnedTime)
        }
      }
    }
  }

  const handleVideoEnd = () => {
    setIsPlaying(false)

    if (videoRef.current) {
      const finalTime = Math.floor(videoRef.current.currentTime)
      const earnedTime = finalTime - watchTime

      if (earnedTime >= 60) {
        recordWatchTime(earnedTime)
      }
    }
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

  if (error || !video) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">{error || 'Video not found'}</h1>
          <Link href="/portals" className="text-primary hover:text-secondary transition">
            ← Back to portals
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back Link */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <Link href="/portals" className="text-primary hover:text-secondary transition text-sm">
            ← Back
          </Link>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Video Player */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2"
          >
            <div className="bg-black rounded-2xl overflow-hidden">
              {signedUrl ? (
                <video
                  ref={videoRef}
                  src={signedUrl}
                  controls
                  onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                  onEnded={handleVideoEnd}
                  className="w-full aspect-video"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="aspect-video bg-surface2 flex items-center justify-center">
                  <span className="text-text-muted">Loading video...</span>
                </div>
              )}
            </div>

            {/* Video Info */}
            <div className="mt-8 space-y-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-3">{video.title}</h1>
                <p className="text-text-muted">{video.description}</p>
              </div>

              <div className="flex items-center gap-8 text-sm text-text-muted border-t border-b border-border py-4">
                <span>{video.views_count.toLocaleString()} views</span>
                <span>•</span>
                <span>{Math.floor(video.duration_seconds / 60)} minutes</span>
                <span>•</span>
                <span className="capitalize">{video.required_level}</span>
              </div>

              {/* Tokens Earned Info */}
              {tokensEarned > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-secondary/10 border border-secondary/30 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-secondary">Tokens Earned!</p>
                    <p className="text-sm text-text-muted">
                      You earned {tokensEarned} tokens from this viewing session
                    </p>
                  </div>
                  <span className="text-3xl">◆</span>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-6"
          >
            {/* Token Tracker */}
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h3 className="font-bold text-white mb-4">Earnings</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-text-muted mb-2">Watch Time</p>
                  <p className="text-2xl font-bold text-white">
                    {Math.floor(watchTime / 60)}:{(watchTime % 60).toString().padStart(2, '0')}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-text-muted mb-2">Tokens Earned This Session</p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-secondary">{tokensEarned}</span>
                    <span className="text-2xl">◆</span>
                  </div>
                </div>

                <div className="bg-surface2 border border-border rounded-lg p-3">
                  <p className="text-xs text-text-muted">
                    You earn 1 token for every 60 seconds of content watched
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Card */}
            {profile && (
              <div className="bg-surface border border-border rounded-2xl p-6">
                <h3 className="font-bold text-white mb-4">Your Balance</h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Total Tokens</span>
                    <span className="font-bold text-secondary flex items-center gap-1">
                      {profile.tokens_balance}
                      <span>◆</span>
                    </span>
                  </div>

                  <Link
                    href="/profile"
                    className="block w-full py-2 text-center bg-primary hover:shadow-glow text-white font-semibold rounded-lg transition"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-primary/10 border border-primary/30 rounded-2xl p-6">
              <p className="font-semibold text-white mb-3">Pro Tips</p>

              <ul className="space-y-2 text-sm text-text-muted">
                <li>✓ Watch all content to earn maximum tokens</li>
                <li>✓ Your tokens never expire</li>
                <li>✓ Refer friends to earn bonus tokens</li>
                <li>✓ Check your profile for detailed stats</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
