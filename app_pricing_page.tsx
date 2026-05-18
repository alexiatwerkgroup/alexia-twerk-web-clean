// src/app/pricing/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase, createCheckoutSession, getCurrentUser } from '@/lib/supabase'
import { SubscriptionLevel } from '@/lib/types'

interface PricingTier {
  id: string
  level: SubscriptionLevel
  name: string
  price: number
  description: string
  features: string[]
  cta: string
  popular?: boolean
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    level: 'free',
    name: 'Free',
    price: 0,
    description: 'Get started with exclusive free content',
    features: [
      'Free Portal access',
      'Daily login bonus (10 tokens)',
      'Watch rewards (1 token per hour)',
      'Referral bonuses',
      '1 HD video at a time',
    ],
    cta: 'Get Started',
  },
  {
    id: 'basic',
    level: 'basic',
    name: 'Basic',
    price: 4.99,
    description: 'Unlock premium content and features',
    features: [
      'Everything in Free',
      'Private Portal access',
      '2x watch rewards',
      'Offline downloads',
      'Priority support',
      '2 HD videos at a time',
    ],
    cta: 'Subscribe Now',
    popular: true,
  },
  {
    id: 'full',
    level: 'full',
    name: 'Premium',
    price: 19.99,
    description: 'Ultimate access to all content and features',
    features: [
      'Everything in Basic',
      'Playlist Portal access',
      '3x watch rewards',
      'Ad-free experience',
      'Early access to new content',
      'Custom recommendations',
      'Unlimited downloads',
      '4K video streaming',
    ],
    cta: 'Go Premium',
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
        setLoading(false)
      } catch (err) {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleCheckout = async (level: SubscriptionLevel) => {
    if (level === 'free') {
      router.push('/portals')
      return
    }

    if (!user) {
      router.push('/auth/register')
      return
    }

    setCheckingOut(level)
    setError('')

    try {
      const session = await createCheckoutSession(user.id, level)

      if (session?.url) {
        window.location.href = session.url
      } else {
        setError('Failed to create checkout session')
        setCheckingOut(null)
      }
    } catch (err: any) {
      console.error('Checkout error:', err)
      setError(err.message || 'An error occurred during checkout')
      setCheckingOut(null)
    }
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
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-text-muted max-w-2xl mx-auto">
            Choose the perfect plan for your content needs. All plans include our token rewards system.
          </p>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto mb-8 bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400"
          >
            {error}
          </motion.div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {PRICING_TIERS.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-2xl transition ${
                tier.popular
                  ? 'md:scale-105 bg-surface border-2 border-primary shadow-xl'
                  : 'bg-surface border border-border'
              }`}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-bold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-8 h-full flex flex-col">
                {/* Tier Info */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                  <p className="text-text-muted text-sm mb-4">{tier.description}</p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold text-white">${tier.price}</span>
                      <span className="text-text-muted">/month</span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleCheckout(tier.level)}
                    disabled={checkingOut === tier.level}
                    className={`w-full py-3 rounded-lg font-semibold transition mb-8 ${
                      tier.popular
                        ? 'bg-primary hover:shadow-glow text-white disabled:opacity-50'
                        : 'bg-surface2 border border-border hover:border-primary text-white disabled:opacity-50'
                    }`}
                  >
                    {checkingOut === tier.level ? 'Processing...' : tier.cta}
                  </button>
                </div>

                {/* Features */}
                <div className="space-y-3 flex-1">
                  {tier.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="text-secondary text-lg mt-0.5">✓</span>
                      <span className="text-sm text-text">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Frequently Asked Questions</h2>

          <div className="space-y-6">
            {[
              {
                q: 'Can I change my plan anytime?',
                a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.',
              },
              {
                q: 'What happens if I cancel?',
                a: "Your subscription will remain active until the end of your billing period. No refunds are issued for partial months.",
              },
              {
                q: 'Do you offer refunds?',
                a: 'We offer a 7-day money-back guarantee. If you are not satisfied, contact our support team.',
              },
              {
                q: 'Is there a free trial?',
                a: 'The Free plan gives you unlimited access to free content with token rewards. Upgrade anytime to unlock premium portals.',
              },
              {
                q: 'Can I use one account on multiple devices?',
                a: 'Yes! Your subscription works on all devices. You can stream on up to 2 devices simultaneously.',
              },
              {
                q: 'How do tokens work?',
                a: 'You earn tokens by logging in daily, watching content, and referring friends. Use tokens to unlock premium features and rewards.',
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-surface border border-border rounded-lg p-6"
              >
                <h3 className="font-bold text-white mb-2">{item.q}</h3>
                <p className="text-text-muted">{item.a}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-20 text-center"
        >
          <div className="bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
            <p className="text-text-muted mb-8 max-w-2xl mx-auto">
              {user
                ? 'Choose a plan above to upgrade your account'
                : 'Create a free account to start earning tokens and accessing exclusive content'}
            </p>
            {!user && (
              <Link
                href="/auth/register"
                className="inline-block px-8 py-4 bg-primary hover:shadow-glow text-white font-bold rounded-lg transition"
              >
                Create Free Account
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
