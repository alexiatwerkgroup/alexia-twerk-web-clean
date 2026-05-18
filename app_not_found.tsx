// src/app/not-found.tsx
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md"
      >
        <div className="mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-8xl mb-4 inline-block"
          >
            🔍
          </motion.div>
        </div>

        <h1 className="text-5xl font-bold text-white mb-3">404</h1>
        <h2 className="text-2xl font-semibold text-primary mb-4">Page Not Found</h2>

        <p className="text-text-muted mb-8 text-lg">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        <div className="space-y-4">
          <Link
            href="/portals"
            className="block w-full px-6 py-3 bg-primary hover:shadow-glow text-white font-semibold rounded-lg transition"
          >
            Back to Portals
          </Link>

          <Link
            href="/"
            className="block w-full px-6 py-3 bg-surface border border-border hover:border-primary text-white font-semibold rounded-lg transition"
          >
            Home
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-text-muted text-sm mb-4">Quick Links</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/pricing" className="text-primary hover:text-secondary transition text-sm">
              Pricing
            </Link>
            <span className="text-border">•</span>
            <Link href="/profile" className="text-primary hover:text-secondary transition text-sm">
              Profile
            </Link>
            <span className="text-border">•</span>
            <Link href="/auth/login" className="text-primary hover:text-secondary transition text-sm">
              Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
