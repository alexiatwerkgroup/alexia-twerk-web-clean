// src/app/layout.tsx
import type { Metadata } from 'next'
import { Navbar } from '@/components'
import './globals.css'

export const metadata: Metadata = {
  title: 'TWERKHUB - Premium Content Platform',
  description: 'Exclusive content portal with token-based rewards and referral system',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-dark text-text antialiased">
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
        <footer className="border-t border-border bg-surface py-8 text-center text-text-muted text-sm">
          <div className="max-w-7xl mx-auto">
            <p>&copy; 2026 TWERKHUB. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  )
}
