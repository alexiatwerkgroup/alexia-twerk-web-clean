import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF006E',
        secondary: '#00D9FF',
        dark: '#0D0D0D',
        surface: '#1A1A1A',
        surface2: '#252525',
        border: '#333333',
        text: '#FFFFFF',
        'text-muted': '#A0A0A0',
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#FFFFFF',
            'a': {
              color: '#FF006E',
            },
          },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-custom': 'pulseCustom 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseCustom: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(255, 0, 110, 0.3)',
        'glow-lg': '0 0 40px rgba(255, 0, 110, 0.5)',
      },
    },
  },
  plugins: [],
}

export default config
