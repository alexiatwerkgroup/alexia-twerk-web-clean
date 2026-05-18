// src/app/layout.tsx
import type { Metadata } from 'next'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import './globals.css'

export const metadata: Metadata = {
  title: 'TWERKHUB - Premium Video Platform',
  description: 'Watch exclusive content, earn tokens, and join our community. Stream premium videos with subscription plans starting from just $4.99/month.',
  keywords: ['video streaming', 'premium content', 'tokens', 'community'],
  authors: [{ name: 'TWERKHUB' }],
  creator: 'TWERKHUB',
  formatDetection: {
    email: false,
    telephone: false,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://twerkhub.com',
    siteName: 'TWERKHUB',
    title: 'TWERKHUB - Premium Video Platform',
    description: 'Watch exclusive content, earn tokens, and join our community.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TWERKHUB',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TWERKHUB - Premium Video Platform',
    description: 'Watch exclusive content, earn tokens, and join our community.',
    creator: '@twerkhub',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="x-ua-compatible" content="ie=edge" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#0d0d0d" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              })()
            `,
          }}
        />
      </head>
      <body className="bg-dark">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
}
