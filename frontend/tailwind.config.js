export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: {
          primary: 'var(--color-background-primary)',
          secondary: 'var(--color-background-secondary)',
          tertiary: 'var(--color-background-tertiary)',
          info: 'var(--color-background-info)',
          success: 'var(--color-background-success)',
          warning: 'var(--color-background-warning)',
          danger: 'var(--color-background-danger)',
        },
        border: {
          primary: 'var(--color-border-primary)',
          secondary: 'var(--color-border-secondary)',
          tertiary: 'var(--color-border-tertiary)',
          info: 'var(--color-border-info)',
          success: 'var(--color-border-success)',
          warning: 'var(--color-border-warning)',
          danger: 'var(--color-border-danger)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          info: 'var(--color-text-info)',
          success: 'var(--color-text-success)',
          warning: 'var(--color-text-warning)',
          danger: 'var(--color-text-danger)',
        }
      },
      borderRadius: {
        md: 'var(--border-radius-md)',
        lg: 'var(--border-radius-lg)',
        xl: 'var(--border-radius-xl)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        // No heavy drop shadows allowed per design system, only focus rings.
        ring: '0 0 0 2px var(--color-border-info)',
      }
    },
  },
  plugins: [],
};
