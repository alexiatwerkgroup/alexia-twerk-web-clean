// src/components/PortalCard.tsx
'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { SubscriptionLevel } from '@/lib/types'

interface PortalCardProps {
  id: string
  title: string
  description: string
  icon: string
  color: string
  requiredLevel: SubscriptionLevel
  userLevel: SubscriptionLevel
  contentCount?: number
}

export default function PortalCard({
  id,
  title,
  description,
  icon,
  color,
  requiredLevel,
  userLevel,
  contentCount = 0,
}: PortalCardProps) {
  const levelHierarchy = {
    free: 0,
    basic: 1,
    medium: 2,
    full: 3,
  }

  const hasAccess = levelHierarchy[userLevel] >= levelHierarchy[requiredLevel]

  const colorClasses = {
    pink: 'from-pink-500 to-red-500',
    cyan: 'from-cyan-400 to-blue-500',
    purple: 'from-purple-500 to-pink-500',
  }

  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3 }}
      className="relative group"
    >
      <Link href={hasAccess ? `/portals/${id}` : '/pricing'}>
        <div className="relative overflow-hidden rounded-2xl bg-surface2 border border-border hover:border-primary/50 transition-all h-80">
          {/* Background gradient */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses] || 'from-primary to-secondary'} opacity-10 group-hover:opacity-20 transition`}
          />

          {/* Icon */}
          <div className="absolute top-6 right-6 text-5xl opacity-50 group-hover:opacity-100 transition">
            {icon}
          </div>

          {/* Content */}
          <div className="relative h-full p-8 flex flex-col justify-between">
            {/* Lock badge for restricted access */}
            {!hasAccess && (
              <div className="absolute top-4 left-4 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                🔒 {requiredLevel.toUpperCase()}
              </div>
            )}

            <div>
              <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
              <p className="text-text-muted text-sm mb-4">{description}</p>
            </div>

            <div className="space-y-3">
              {/* Content count */}
              {contentCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <span className="text-secondary">▶</span>
                  {contentCount} {contentCount === 1 ? 'video' : 'videos'}
                </div>
              )}

              {/* CTA */}
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <span className="text-sm font-semibold text-primary">
                  {hasAccess ? 'Enter Portal' : 'Upgrade'}
                </span>
                <span className="text-lg group-hover:translate-x-1 transition">→</span>
              </div>
            </div>
          </div>

          {/* Hover border animation */}
          <div className="absolute inset-0 border-2 border-primary rounded-2xl opacity-0 group-hover:opacity-100 transition pointer-events-none" />
        </div>
      </Link>
    </motion.div>
  )
}
