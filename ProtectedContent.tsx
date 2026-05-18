// src/components/ProtectedContent.tsx
'use client'

import React, { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Lock, AlertCircle, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type SubscriptionLevel = 'free' | 'basic' | 'medium' | 'full'

interface ProtectedContentProps {
  children: ReactNode
  requiredLevel: SubscriptionLevel
  userLevel: SubscriptionLevel
  title: string
  description?: string
  onUpgradeClick?: () => void
}

const levelHierarchy: Record<SubscriptionLevel, number> = {
  free: 0,
  basic: 1,
  medium: 2,
  full: 3,
}

const levelInfo: Record<SubscriptionLevel, { name: string; features: string[] }> = {
  free: {
    name: 'Free',
    features: ['Free Portals Only', 'Limited to 1 Device', 'Standard Quality'],
  },
  basic: {
    name: 'Basic',
    features: ['Free + Private Portals', 'Up to 2 Devices', 'HD Quality', '$4.99/month'],
  },
  medium: {
    name: 'Medium',
    features: ['Basic + Playlist Portals', 'Up to 4 Devices', 'Full HD Quality', '$9.99/month'],
  },
  full: {
    name: 'Premium',
    features: ['All Portals', 'Up to 5 Devices', '4K Quality', 'Priority Support', '$19.99/month'],
  },
}

export const ProtectedContent: React.FC<ProtectedContentProps> = ({
  children,
  requiredLevel,
  userLevel,
  title,
  description,
  onUpgradeClick,
}) => {
  const isAllowed = levelHierarchy[userLevel] >= levelHierarchy[requiredLevel]

  if (isAllowed) {
    return <>{children}</>
  }

  return (
    <motion.div
      className="relative w-full rounded-xl overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Blurred Content Background */}
      <div className="blur-sm pointer-events-none">{children}</div>

      {/* Lock Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/80 backdrop-blur-sm flex items-center justify-center">
        <motion.div
          className="text-center max-w-sm mx-auto px-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          {/* Lock Icon */}
          <motion.div
            className="flex justify-center mb-6"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="bg-gradient-to-br from-[#FF006E] to-[#FF006E]/60 p-4 rounded-full">
              <Lock className="text-white" size={48} />
            </div>
          </motion.div>

          {/* Title */}
          <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>

          {/* Description */}
          {description && <p className="text-gray-300 mb-4 text-sm">{description}</p>}

          {/* Required Level Info */}
          <motion.div
            className="bg-black/40 border border-[#FF006E]/30 rounded-lg p-4 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="text-[#FF006E] flex-shrink-0 mt-1" size={20} />
              <div className="text-left">
                <p className="text-sm text-gray-300">
                  This content requires <span className="font-bold text-[#FF006E]">{levelInfo[requiredLevel].name}</span> subscription
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  You currently have: <span className="font-semibold text-[#00D9FF]">{levelInfo[userLevel].name}</span>
                </p>
              </div>
            </div>

            {/* Comparison */}
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-600">
                <div>
                  <p className="text-gray-400 font-semibold mb-2">Your Plan</p>
                  <ul className="space-y-1">
                    {levelInfo[userLevel].features.map((feature, idx) => (
                      <li key={idx} className="text-gray-300 flex items-start gap-2">
                        <span className="text-[#00D9FF]">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-gray-200 font-semibold mb-2">{levelInfo[requiredLevel].name}</p>
                  <ul className="space-y-1">
                    {levelInfo[requiredLevel].features.map((feature, idx) => (
                      <li key={idx} className="text-gray-200 flex items-start gap-2">
                        <span className="text-[#FF006E]">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <button
              onClick={onUpgradeClick}
              className="w-full bg-gradient-to-r from-[#FF006E] to-[#00D9FF] hover:from-[#FF006E]/80 hover:to-[#00D9FF]/80 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 group"
            >
              <span>Upgrade Now</span>
              <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <Link
              href="/pricing"
              className="w-full bg-black/40 border border-[#00D9FF]/50 hover:border-[#00D9FF] text-[#00D9FF] font-semibold py-3 rounded-lg transition-all"
            >
              View All Plans
            </Link>
          </motion.div>

          {/* Extra Info */}
          <motion.p
            className="text-xs text-gray-400 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Get instant access when you upgrade to {levelInfo[requiredLevel].name}
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  )
}

// Convenience component for checking access without rendering children
export const AccessChecker: React.FC<{
  requiredLevel: SubscriptionLevel
  userLevel: SubscriptionLevel
  children: (hasAccess: boolean) => ReactNode
}> = ({ requiredLevel, userLevel, children }) => {
  const hasAccess = levelHierarchy[userLevel] >= levelHierarchy[requiredLevel]
  return <>{children(hasAccess)}</>
}
