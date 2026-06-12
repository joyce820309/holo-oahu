import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, Pencil, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { user, logout, updateDisplayName } = useAuth()
  const appVersion = import.meta.env.VITE_APP_VERSION || 'dev'
  const buildTimeRaw = import.meta.env.VITE_APP_BUILD_TIME
  const buildTime = buildTimeRaw
    ? new Date(buildTimeRaw).toLocaleString(i18n.language === 'zh-TW' ? 'zh-TW' : 'en-US', { hour12: false })
    : '-'

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput]     = useState('')
  const [savingName, setSavingName]   = useState(false)

  const startEdit = () => {
    setNameInput(user?.displayName || '')
    setEditingName(true)
  }

  const cancelEdit = () => setEditingName(false)

  const commitName = async () => {
    if (!nameInput.trim() || nameInput.trim() === user?.displayName) {
      cancelEdit()
      return
    }
    setSavingName(true)
    try {
      await updateDisplayName(nameInput)
      toast.success('暱稱已更新')
      setEditingName(false)
    } catch {
      toast.error('更新失敗')
    } finally {
      setSavingName(false)
    }
  }

  const changeLang = (lang) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('holo_lang', lang)
  }

  return (
    <div className="px-4 pb-36">
      <h2 className="text-primary font-medium text-xl py-4">{t('settings.title')}</h2>

      {/* User info */}
      {user && (
        <div className="glass-card p-4 mb-4 flex items-center gap-3">
          {user.photoURL
            ? <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full shrink-0" />
            : (
              <div
                className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-base font-semibold"
                style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent)' }}
              >
                {(user.displayName || user.email || '?')[0].toUpperCase()}
              </div>
            )
          }

          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1.5 mb-0.5">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') cancelEdit() }}
                  className="flex-1 min-w-0 text-primary font-medium outline-none rounded-lg px-2 py-1 text-sm"
                  style={{ background: 'var(--mini-bg)', border: '1px solid var(--accent)' }}
                />
                <button
                  onClick={commitName}
                  disabled={savingName}
                  className="p-1 rounded-lg shrink-0"
                  style={{ color: 'var(--accent)' }}
                >
                  <Check size={16} />
                </button>
                <button onClick={cancelEdit} className="p-1 rounded-lg text-secondary shrink-0">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-primary font-medium truncate">{user.displayName || '（未設定）'}</p>
                <button onClick={startEdit} className="text-secondary shrink-0" aria-label="編輯暱稱" style={{ transition: 'opacity 0.15s' }} onMouseEnter={e => e.currentTarget.style.opacity='0.5'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>
                  <Pencil size={14} />
                </button>
              </div>
            )}
            <p className="text-secondary text-sm truncate">{user.email}</p>
          </div>

          <button className="btn-ghost shrink-0" onClick={logout}>
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
            { code: 'en',    label: 'English'  },
          ].map(({ code, label }) => (
            <button
              key={code}
              onClick={() => changeLang(code)}
              className="flex-1 py-3 rounded-xl border font-medium"
              style={{
                background:  i18n.language === code ? 'var(--accent)' : 'var(--mini-bg)',
                color:       i18n.language === code ? 'white'         : 'var(--text-secondary)',
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
                background:  theme === id ? `linear-gradient(135deg, ${from}, ${to})` : 'var(--mini-bg)',
                color:       'var(--text-primary)',
                borderColor: theme === id ? 'var(--accent)' : 'var(--mini-border)',
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      <div className="glass-mini p-4 text-center space-y-1">
        <p className="text-secondary text-xs">{t('settings.versionLabel')}: v{appVersion}</p>
        <p className="text-secondary text-xs">{t('settings.buildLabel')}: {buildTime}</p>
      </div>
    </div>
  )
}
