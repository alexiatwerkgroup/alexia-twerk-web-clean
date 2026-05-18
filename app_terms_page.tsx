// src/app/terms/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

export default function TermsPage() {
  const router = useRouter()
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
          <h1 className="text-5xl font-bold text-white mb-4">Terms of Service</h1>
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
            <h2 className="text-2xl font-bold text-white">1. Agreement to Terms</h2>
            <p className="text-text-muted leading-relaxed">
              By accessing and using the TWERKHUB platform ("Service"), you agree to be bound by these Terms of Service. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">2. Use License</h2>
            <p className="text-text-muted leading-relaxed">
              Permission is granted to temporarily download one copy of the materials (information or software) on TWERKHUB for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="text-text-muted space-y-2 pl-4">
              <li>• Modifying or copying the materials</li>
              <li>• Using the materials for any commercial purpose or for any public display</li>
              <li>• Attempting to decompile or reverse engineer any software contained on the Service</li>
              <li>• Removing any copyright or other proprietary notations from the materials</li>
              <li>• Transferring the materials to another person or "mirroring" the materials on any other server</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">3. Disclaimer</h2>
            <p className="text-text-muted leading-relaxed">
              The materials on TWERKHUB are provided on an 'as is' basis. TWERKHUB makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">4. Limitations</h2>
            <p className="text-text-muted leading-relaxed">
              In no event shall TWERKHUB or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on TWERKHUB, even if TWERKHUB or an authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">5. Accuracy of Materials</h2>
            <p className="text-text-muted leading-relaxed">
              The materials appearing on TWERKHUB could include technical, typographical, or photographic errors. TWERKHUB does not warrant that any of the materials on its Service are accurate, complete, or current. TWERKHUB may make changes to the materials contained on its Service at any time without notice.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">6. Materials and Content</h2>
            <p className="text-text-muted leading-relaxed">
              The materials on TWERKHUB are protected by applicable copyright and trademark law. Unauthorized use of the materials, including text, images, and video content, is prohibited. You may not reproduce, distribute, or transmit the content without express written permission.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">7. Links</h2>
            <p className="text-text-muted leading-relaxed">
              TWERKHUB has not reviewed all of the sites linked to its Service and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by TWERKHUB of the site. Use of any such linked website is at the user's own risk.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">8. Modifications</h2>
            <p className="text-text-muted leading-relaxed">
              TWERKHUB may revise these terms of service for its Service at any time without notice. By using this Service, you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">9. Governing Law</h2>
            <p className="text-text-muted leading-relaxed">
              These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which TWERKHUB operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">10. Contact Information</h2>
            <p className="text-text-muted leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at support@twerkhub.com
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
          <Link href="/privacy" className="text-primary hover:text-secondary transition">
            Privacy Policy →
          </Link>
          <Link href={user ? '/portals' : '/auth/login'} className="text-primary hover:text-secondary transition">
            ← Back
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
