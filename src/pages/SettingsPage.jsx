import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { LogOut } from 'lucide-react'

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { user, logout }    = useAuth()

  const changeLang = (lang) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('holo_lang', lang)
  }

  return (
    <div className="px-4 pb-24">
      <h2 className="text-primary font-medium text-xl py-4">{t('settings.title')}</h2>

      {/* User info */}
      {user && (
        <div className="glass-card p-4 mb-4 flex items-center gap-3">
          {user.photoURL && <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full" />}
          <div className="flex-1">
            <p className="text-primary font-medium">{user.displayName}</p>
            <p className="text-secondary text-sm">{user.email}</p>
          </div>
          <button className="btn-ghost" onClick={logout}>
            <LogOut size={18} />{t('common.logout')}
          </button>
        </div>
      )}

      {/* Language */}
      <div className="glass-card p-4 mb-4">
        <p className="text-primary font-medium mb-3">{t('settings.language')}</p>
        <div className="flex gap-3">
          {[
            { code: 'zh-TW', label: '繁體中文' },
            { code: 'en',    label: 'English' },
          ].map(({ code, label }) => (
            <button
              key={code}
              onClick={() => changeLang(code)}
              className="flex-1 py-3 rounded-xl border font-medium"
              style={{
                background: i18n.language === code ? 'var(--accent)' : 'var(--mini-bg)',
                color:      i18n.language === code ? 'white'         : 'var(--text-secondary)',
                borderColor: i18n.language === code ? 'var(--accent)' : 'var(--mini-border)',
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="glass-card p-4 mb-4">
        <p className="text-primary font-medium mb-3">{t('settings.theme')}</p>
        <div className="flex gap-3">
          {[
            { id: 'dusk', label: t('theme.dusk'), from: '#e8d5c4', to: '#b8c8d8' },
            { id: 'blue', label: t('theme.blue'), from: '#c8dce8', to: '#e0ecd8' },
          ].map(({ id, label, from, to }) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className="flex-1 py-3 rounded-xl border font-medium"
              style={{
                background: theme === id
                  ? `linear-gradient(135deg, ${from}, ${to})`
                  : 'var(--mini-bg)',
                color: 'var(--text-primary)',
                borderColor: theme === id ? 'var(--accent)' : 'var(--mini-border)',
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      <div className="glass-mini p-4 text-center">
        <p className="text-secondary text-xs">Holo v2.0 · Oahu Journey 2026</p>
      </div>
    </div>
  )
}
