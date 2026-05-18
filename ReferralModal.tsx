// src/components/ReferralModal.tsx
'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check, Share2, Mail, Twitter, Facebook, Linkedin } from 'lucide-react'

interface ReferralModalProps {
  isOpen: boolean
  onClose: () => void
  referralCode: string
  referralUrl: string
  referralsCompleted: number
  tokensEarned: number
  onShare?: (platform: string) => void
}

export const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  referralCode,
  referralUrl,
  referralsCompleted,
  tokensEarned,
  onShare,
}) => {
  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef<NodeJS.Timeout>()

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode)
    setCopied(true)
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = (platform: string) => {
    onShare?.(platform)

    const encodeUrl = encodeURIComponent(referralUrl)
    const message = encodeURIComponent(`Join TWERKHUB and earn tokens! Use my referral code: ${referralCode}`)

    let shareUrl = ''
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeUrl}&text=${message}`
        break
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeUrl}`
        break
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeUrl}`
        break
      case 'email':
        shareUrl = `mailto:?subject=Join TWERKHUB&body=${encodeURIComponent(
          `Check out TWERKHUB! Use my referral code "${referralCode}" to join: ${referralUrl}`
        )}`
        break
      default:
        return
    }

    if (platform === 'email') {
      window.location.href = shareUrl
    } else {
      window.open(shareUrl, '_blank', 'width=600,height=400')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] rounded-xl border border-[#FF006E]/20 shadow-2xl p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Share2 className="text-[#FF006E]" size={28} />
                  <h2 className="text-2xl font-bold text-white">Share & Earn</h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label="Close modal"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Stats Section */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <motion.div
                  className="bg-black/30 rounded-lg p-4 border border-[#FF006E]/20"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <p className="text-gray-400 text-sm">Referrals Completed</p>
                  <p className="text-3xl font-bold text-[#FF006E] mt-1">{referralsCompleted}</p>
                </motion.div>
                <motion.div
                  className="bg-black/30 rounded-lg p-4 border border-[#00D9FF]/20"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="text-gray-400 text-sm">Tokens Earned</p>
                  <p className="text-3xl font-bold text-[#00D9FF] mt-1">{tokensEarned}</p>
                </motion.div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-[#FF006E] to-transparent mb-6" />

              {/* Referral Code Section */}
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label className="text-gray-300 text-sm font-semibold mb-2 block">Your Referral Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={referralCode}
                    readOnly
                    className="flex-1 bg-black/40 border border-[#FF006E]/30 rounded-lg px-4 py-3 text-white font-mono text-center text-lg hover:border-[#FF006E]/60 transition-colors cursor-pointer"
                  />
                  <button
                    onClick={handleCopyCode}
                    className="bg-gradient-to-r from-[#FF006E] to-[#FF006E]/80 hover:from-[#FF006E]/80 hover:to-[#FF006E]/60 text-white px-4 py-3 rounded-lg font-semibold transition-all flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check size={20} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={20} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Referral URL Section */}
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label className="text-gray-300 text-sm font-semibold mb-2 block">Your Referral Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={referralUrl}
                    readOnly
                    className="flex-1 bg-black/40 border border-[#00D9FF]/30 rounded-lg px-4 py-3 text-white text-sm hover:border-[#00D9FF]/60 transition-colors cursor-pointer overflow-x-auto"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="bg-gradient-to-r from-[#00D9FF] to-[#00D9FF]/80 hover:from-[#00D9FF]/80 hover:to-[#00D9FF]/60 text-black px-4 py-3 rounded-lg font-semibold transition-all flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check size={20} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={20} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-[#00D9FF] to-transparent mb-6" />

              {/* Share Options */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-gray-300 text-sm font-semibold mb-4">Share on Social Media</p>
                <div className="grid grid-cols-4 gap-3">
                  <button
                    onClick={() => handleShare('twitter')}
                    className="bg-black/40 hover:bg-[#1DA1F2]/20 border border-[#1DA1F2]/50 hover:border-[#1DA1F2] text-[#1DA1F2] rounded-lg p-3 transition-all flex items-center justify-center"
                    aria-label="Share on Twitter"
                  >
                    <Twitter size={24} />
                  </button>
                  <button
                    onClick={() => handleShare('facebook')}
                    className="bg-black/40 hover:bg-[#1877F2]/20 border border-[#1877F2]/50 hover:border-[#1877F2] text-[#1877F2] rounded-lg p-3 transition-all flex items-center justify-center"
                    aria-label="Share on Facebook"
                  >
                    <Facebook size={24} />
                  </button>
                  <button
                    onClick={() => handleShare('linkedin')}
                    className="bg-black/40 hover:bg-[#0A66C2]/20 border border-[#0A66C2]/50 hover:border-[#0A66C2] text-[#0A66C2] rounded-lg p-3 transition-all flex items-center justify-center"
                    aria-label="Share on LinkedIn"
                  >
                    <Linkedin size={24} />
                  </button>
                  <button
                    onClick={() => handleShare('email')}
                    className="bg-black/40 hover:bg-[#FF006E]/20 border border-[#FF006E]/50 hover:border-[#FF006E] text-[#FF006E] rounded-lg p-3 transition-all flex items-center justify-center"
                    aria-label="Share via Email"
                  >
                    <Mail size={24} />
                  </button>
                </div>
              </motion.div>

              {/* Info Box */}
              <motion.div
                className="mt-6 bg-[#FF006E]/10 border border-[#FF006E]/30 rounded-lg p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <p className="text-sm text-gray-300">
                  <span className="font-semibold text-[#FF006E]">How it works:</span> When someone signs up using your code or link, you earn <span className="font-bold text-[#FF006E]">100 tokens</span> when they complete their first subscription purchase.
                </p>
              </motion.div>

              {/* Close Button */}
              <motion.button
                onClick={onClose}
                className="w-full mt-6 bg-gradient-to-r from-[#FF006E] to-[#00D9FF] hover:from-[#FF006E]/80 hover:to-[#00D9FF]/80 text-white font-bold py-3 rounded-lg transition-all"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
