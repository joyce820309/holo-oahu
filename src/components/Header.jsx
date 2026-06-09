import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import { Languages, Sun, Waves } from 'lucide-react'

export default function Header() {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()

  const toggleLang = () => {
    const next = i18n.language === 'zh-TW' ? 'en' : 'zh-TW'
    i18n.changeLanguage(next)
    localStorage.setItem('holo_lang', next)
  }

  const isZh = i18n.language === 'zh-TW'

  return (
    <header className="glass-mini sticky top-0 z-50 flex items-center justify-between px-4 py-2.5 mx-2 mt-2">
      <div className="flex items-center gap-1.5">
        <Waves size={18} style={{ color: 'var(--accent)' }} />
        <span className="font-medium text-primary text-base">{t('appName')}</span>
        <span className="text-secondary text-xs ml-1 hidden sm:inline">{t('appSubtitle')}</span>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Language toggle — icon + short label */}
        <button
          onClick={toggleLang}
          className="glass-mini flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
          style={{ minHeight: 34, minWidth: 44 }}
          aria-label="toggle language"
        >
          <Languages size={14} style={{ color: 'var(--text-secondary)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
            {isZh ? '中' : 'EN'}
          </span>
        </button>

        {/* Theme toggle — sun/waves icon */}
        <button
          onClick={toggleTheme}
          className="glass-mini flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
          style={{ minHeight: 34, minWidth: 44 }}
          aria-label="toggle theme"
        >
          {theme === 'dusk'
            ? <Sun size={15} style={{ color: 'var(--accent)' }} />
            : <Waves size={15} style={{ color: 'var(--accent)' }} />
          }
        </button>
      </div>
    </header>
  )
}
