// src/app/privacy/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

export default function PrivacyPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      setUser(authUser)
      setLoading(false)
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }} className="text-4xl">
          ⚡
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
          <Link href={user ? '/portals' : '/auth/login'} className="text-primary hover:text-secondary transition text-sm">
            ← Back
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Privacy Policy</h1>
          <p className="text-text-muted">Last updated: April 2026</p>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-8"
        >
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Introduction</h2>
            <p className="text-text-muted leading-relaxed">
              TWERKHUB ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">1. Information We Collect</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-secondary mb-2">Personal Information</h3>
                <p className="text-text-muted leading-relaxed">
                  We collect information you provide directly to us, such as when you create an account. This includes your name, email address, password, and any other information you choose to provide.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary mb-2">Subscription Information</h3>
                <p className="text-text-muted leading-relaxed">
                  When you subscribe to our paid plans, we collect billing information including payment method details. This information is processed securely through our payment provider (Stripe) and is never stored directly by TWERKHUB.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary mb-2">Usage Information</h3>
                <p className="text-text-muted leading-relaxed">
                  We automatically collect certain information about your interactions with our Service, including watch history, watch time, content viewed, tokens earned, and other usage patterns.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">2. How We Use Your Information</h2>
            <p className="text-text-muted leading-relaxed mb-3">We use the information we collect for various purposes, including:</p>
            <ul className="text-text-muted space-y-2 pl-4">
              <li>• Providing, maintaining, and improving our Service</li>
              <li>• Processing transactions and sending related information</li>
              <li>• Sending promotional communications (with your consent)</li>
              <li>• Responding to your inquiries and providing customer support</li>
              <li>• Analyzing usage patterns to enhance user experience</li>
              <li>• Detecting and preventing fraudulent transactions</li>
              <li>• Complying with legal obligations</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">3. Information Sharing</h2>
            <p className="text-text-muted leading-relaxed">
              We do not sell, trade, or rent your personal information. We may share your information with trusted third parties who assist us in operating our website and conducting our business, subject to strict confidentiality agreements. These include payment processors, analytics providers, and hosting services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">4. Data Security</h2>
            <p className="text-text-muted leading-relaxed">
              TWERKHUB implements appropriate technical and organizational measures to protect your personal information. We use encryption, secure socket layer (SSL) technology, and other safeguards. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">5. Your Privacy Rights</h2>
            <p className="text-text-muted leading-relaxed mb-3">Depending on your location, you may have the following rights:</p>
            <ul className="text-text-muted space-y-2 pl-4">
              <li>• Right to access your personal information</li>
              <li>• Right to correct or update your information</li>
              <li>• Right to request deletion of your data</li>
              <li>• Right to opt-out of marketing communications</li>
              <li>• Right to data portability</li>
            </ul>
            <p className="text-text-muted leading-relaxed mt-4">
              To exercise these rights, please contact us at privacy@twerkhub.com
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">6. Cookies and Tracking</h2>
            <p className="text-text-muted leading-relaxed">
              TWERKHUB uses cookies and similar tracking technologies to enhance your experience. You can control cookie settings through your browser. Note that disabling cookies may affect some features of our Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">7. Children's Privacy</h2>
            <p className="text-text-muted leading-relaxed">
              Our Service is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If we learn we have collected personal information from a child under 13, we will delete such information promptly.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">8. International Data Transfer</h2>
            <p className="text-text-muted leading-relaxed">
              Your information may be transferred to, stored in, and processed in countries other than your country of residence. These countries may have data protection laws different from your country of origin.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">9. Contact Us</h2>
            <p className="text-text-muted leading-relaxed">
              If you have questions about this Privacy Policy or our privacy practices, please contact us at privacy@twerkhub.com or through our website contact form.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">10. Policy Changes</h2>
            <p className="text-text-muted leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on our Service and updating the "Last updated" date above.
            </p>
          </section>
        </motion.div>

        {/* Footer Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-16 pt-8 border-t border-border flex justify-between items-center flex-wrap gap-4"
        >
          <Link href="/terms" className="text-primary hover:text-secondary transition">
            Terms of Service →
          </Link>
          <Link href={user ? '/portals' : '/auth/login'} className="text-primary hover:text-secondary transition">
            ← Back
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
