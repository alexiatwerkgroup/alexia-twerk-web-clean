// src/components/ErrorBoundary.tsx
'use client'

import React, { ReactNode, ReactElement } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface Props {
  children: ReactNode
  fallback?: ReactElement
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  public constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen bg-dark flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-md"
            >
              <div className="mb-8">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-6xl mb-4 inline-block"
                >
                  ⚠️
                </motion.div>
              </div>

              <h1 className="text-3xl font-bold text-white mb-3">Something went wrong</h1>

              <p className="text-text-muted mb-6">
                We encountered an unexpected error. Our team has been notified. Please try refreshing the page or go back to the home screen.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-surface border border-border rounded-lg p-4 mb-6 text-left">
                  <p className="text-xs text-text-muted font-mono overflow-auto max-h-32">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <button
                  onClick={() => window.location.reload()}
                  className="block w-full px-6 py-3 bg-primary hover:shadow-glow text-white font-semibold rounded-lg transition"
                >
                  Refresh Page
                </button>

                <Link
                  href="/portals"
                  className="block w-full px-6 py-3 bg-surface border border-border hover:border-primary text-white font-semibold rounded-lg transition text-center"
                >
                  Back to Portals
                </Link>
              </div>

              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-text-muted text-sm mb-2">Need help?</p>
                <a
                  href="mailto:support@twerkhub.com"
                  className="text-primary hover:text-secondary transition text-sm"
                >
                  Contact Support
                </a>
              </div>
            </motion.div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
