import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        'background-secondary': 'hsl(var(--background-secondary))',
        'background-tertiary': 'hsl(var(--background-tertiary))',
        foreground: 'hsl(var(--foreground))',
        'foreground-secondary': 'hsl(var(--foreground-secondary))',
        'foreground-muted': 'hsl(var(--foreground-muted))',
        border: 'hsl(var(--border))',
        'border-strong': 'hsl(var(--border-strong))',
        card: 'hsl(var(--card))',
        'card-hover': 'hsl(var(--card-hover))',
        primary: 'hsl(var(--primary))',
        'primary-hover': 'hsl(var(--primary-hover))',
        success: 'hsl(var(--success))',
        'success-bg': 'hsl(var(--success-bg))',
        warning: 'hsl(var(--warning))',
        'warning-bg': 'hsl(var(--warning-bg))',
        danger: 'hsl(var(--danger))',
        'danger-bg': 'hsl(var(--danger-bg))',
        info: 'hsl(var(--info))',
        'info-bg': 'hsl(var(--info-bg))',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      maxWidth: {
        'article': '720px',
        'container': '1400px',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '720px',
            fontSize: '19px',
            lineHeight: '1.7',
          },
        },
      },
    },
  },
  plugins: [],
}
export default config
