import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { Sun, Waves } from 'lucide-react'

export default function Header() {
  const { t, i18n } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()

  const toggleLang = () => {
    const next = i18n.language === 'zh-TW' ? 'en' : 'zh-TW'
    i18n.changeLanguage(next)
    localStorage.setItem('holo_lang', next)
  }

  const isZh = i18n.language === 'zh-TW'

  return (
    <header
      className="glass-mini sticky top-0 flex items-center justify-between px-4 py-2.5 mx-2 holo-header"
      style={{ zIndex: 2147483647, marginTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
    >
      <div className="flex items-center gap-1.5">
        <Waves size={18} style={{ color: 'var(--accent)' }} />
        <span className="font-medium text-primary text-base">{t('appName')}</span>
        {user?.displayName && (
          <span className="text-secondary text-xs ml-1">{user.displayName}</span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {/* Language toggle — icon + short label */}
        <button
          onClick={toggleLang}
          className="glass-mini inline-flex h-9 w-11 items-center justify-center rounded-full p-0"
          aria-label="toggle language"
        >
          <span className="block text-xs font-medium leading-none" style={{ color: 'var(--accent)' }}>
            {isZh ? '中' : 'EN'}
          </span>
        </button>

        {/* Theme toggle — sun/waves icon */}
        <button
          onClick={toggleTheme}
          className="glass-mini inline-flex h-9 w-11 items-center justify-center rounded-full p-0"
          aria-label="toggle theme"
        >
          {theme === 'dusk'
            ? <Sun size={15} className="block" style={{ color: 'var(--accent)' }} />
            : <Waves size={15} className="block" style={{ color: 'var(--accent)' }} />
          }
        </button>
      </div>
    </header>
  )
}
