/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dusk: {
          bgFrom:        '#e8d5c4',
          bgMid:         '#d4b8c7',
          bgTo:          '#b8c8d8',
          glass:         'rgba(255,248,244,0.45)',
          border:        'rgba(255,220,200,0.6)',
          mini:          'rgba(255,255,255,0.3)',
          accent:        '#c47a5a',
          textPrimary:   '#5c3d2e',
          textSecondary: '#8b6355',
        },
        blue: {
          bgFrom:        '#c8dce8',
          bgMid:         '#d4e8e0',
          bgTo:          '#e0ecd8',
          glass:         'rgba(240,250,255,0.45)',
          border:        'rgba(180,220,240,0.6)',
          mini:          'rgba(255,255,255,0.3)',
          accent:        '#2a7a9b',
          textPrimary:   '#1e3d4f',
          textSecondary: '#3d6478',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'sans-serif'],
      },
      borderWidth: { DEFAULT: '0.5px' },
      borderRadius: { card: '16px', mini: '12px', btn: '99px' },
    },
  },
  plugins: [],
}
