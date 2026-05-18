// src/app/profile/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase, getUserProfile, getReferrals } from '@/lib/supabase'
import { UserProfile } from '@/lib/types'

interface ReferralData {
  id: string
  referral_code: string
  referrer_id: string
  referred_email: string
  status: string
  created_at: string
  claimed_at: string | null
  referred_user_id: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [referrals, setReferrals] = useState<ReferralData[]>([])
  const [loading, setLoading] = useState(true)
  const [copySuccess, setCopySuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'activity'>('overview')

  useEffect(() => {
    const loadData = async () => {
      try {
        // Check authentication
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
          router.push('/auth/login')
          return
        }

        setUser(authUser)

        // Load profile
        const profileData = await getUserProfile(authUser.id)
        setProfile(profileData)

        // Load referrals
        const referralData = await getReferrals(authUser.id)
        setReferrals(referralData || [])

        setLoading(false)
      } catch (err) {
        console.error('Error loading profile:', err)
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const handleCopyReferralCode = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/auth/register?ref=${code}`)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const successfulReferrals = referrals.filter((r) => r.status === 'completed').length
  const pendingReferrals = referrals.filter((r) => r.status === 'pending').length

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-4xl font-bold text-white">{profile.display_name?.charAt(0)}</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">{profile.display_name}</h1>
              <p className="text-text-muted">{user.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="px-3 py-1 bg-primary/20 border border-primary/30 rounded-full text-sm font-semibold text-primary capitalize">
                  {profile.subscription_level || 'free'} Plan
                </span>
              </div>
            </div>
          </div>

          {/* Token Balance */}
          <div className="bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 rounded-2xl p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted mb-2">Token Balance</p>
                <div className="flex items-center gap-3">
                  <span className="text-5xl font-bold text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text">
                    {profile.tokens_balance.toLocaleString()}
                  </span>
                  <span className="text-4xl">◆</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-text-muted mb-2">Lifetime Earned</p>
                <p className="text-2xl font-bold text-secondary">{(profile.total_tokens_earned || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex gap-4 mb-8 border-b border-border"
        >
          {(['overview', 'referrals', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-4 font-semibold transition border-b-2 ${
                activeTab === tab ? 'text-primary border-primary' : 'text-text-muted border-transparent hover:text-primary'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'referrals' && `Referrals (${successfulReferrals})`}
              {tab === 'activity' && 'Activity'}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-surface border border-border rounded-2xl p-6">
                  <p className="text-text-muted text-sm mb-2">Content Watched</p>
                  <div className="text-3xl font-bold text-white">12</div>
                  <p className="text-xs text-text-muted mt-2">+240 minutes</p>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-6">
                  <p className="text-text-muted text-sm mb-2">Tokens This Month</p>
                  <div className="text-3xl font-bold text-secondary">340</div>
                  <p className="text-xs text-text-muted mt-2">+60 pending</p>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-6">
                  <p className="text-text-muted text-sm mb-2">Active Referrals</p>
                  <div className="text-3xl font-bold text-secondary">{successfulReferrals}</div>
                  <p className="text-xs text-text-muted mt-2">{pendingReferrals} pending</p>
                </div>
              </div>

              {/* Actions */}
              <div className="grid md:grid-cols-2 gap-4">
                <Link
                  href="/pricing"
                  className="block p-6 bg-surface border border-border hover:border-primary rounded-2xl transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white mb-1">Upgrade Plan</h3>
                      <p className="text-sm text-text-muted">Get premium content access</p>
                    </div>
                    <span className="text-2xl">→</span>
                  </div>
                </Link>

                <Link
                  href="/portals"
                  className="block p-6 bg-surface border border-border hover:border-primary rounded-2xl transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white mb-1">Browse Content</h3>
                      <p className="text-sm text-text-muted">Explore available portals</p>
                    </div>
                    <span className="text-2xl">→</span>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Referrals Tab */}
          {activeTab === 'referrals' && (
            <div className="space-y-6">
              {/* Your Referral Link */}
              <div className="bg-surface border border-border rounded-2xl p-6">
                <h3 className="font-bold text-white mb-4">Your Referral Link</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/register?ref=${profile.referral_code}`}
                    className="flex-1 px-4 py-3 bg-surface2 border border-border rounded-lg text-text-muted text-sm"
                  />
                  <button
                    onClick={() => handleCopyReferralCode(profile.referral_code)}
                    className="px-6 py-3 bg-primary hover:shadow-glow text-white font-semibold rounded-lg transition"
                  >
                    {copySuccess ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-sm text-text-muted mt-3">
                  Share your link and earn 100 tokens for each successful referral!
                </p>
              </div>

              {/* Referral Stats */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-surface border border-border rounded-lg p-4">
                  <p className="text-text-muted text-xs mb-1">Completed</p>
                  <div className="text-2xl font-bold text-secondary">{successfulReferrals}</div>
                </div>
                <div className="bg-surface border border-border rounded-lg p-4">
                  <p className="text-text-muted text-xs mb-1">Pending</p>
                  <div className="text-2xl font-bold text-primary">{pendingReferrals}</div>
                </div>
                <div className="bg-surface border border-border rounded-lg p-4">
                  <p className="text-text-muted text-xs mb-1">Tokens Earned</p>
                  <div className="text-2xl font-bold text-secondary">{successfulReferrals * 100}</div>
                </div>
              </div>

              {/* Referral List */}
              {referrals.length > 0 ? (
                <div className="space-y-3">
                  {referrals.map((referral) => (
                    <div key={referral.id} className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">{referral.referred_email}</p>
                        <p className="text-xs text-text-muted">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {referral.status === 'completed' ? (
                          <>
                            <span className="text-xs font-semibold text-secondary bg-secondary/20 px-3 py-1 rounded-full">
                              ✓ Completed
                            </span>
                            <span className="text-secondary font-bold">+100◆</span>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-primary bg-primary/20 px-3 py-1 rounded-full">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-surface border border-border rounded-2xl">
                  <p className="text-text-muted mb-4">No referrals yet</p>
                  <p className="text-sm text-text-muted">Share your referral link to start earning tokens!</p>
                </div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="text-center py-12 bg-surface border border-border rounded-2xl">
              <p className="text-text-muted mb-4">Activity tracking coming soon</p>
              <p className="text-sm text-text-muted">View your watch history and token transactions here</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
