import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WifiOff } from 'lucide-react'

export default function OfflineBanner() {
  const { t } = useTranslation()
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const on  = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  if (!offline) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm"
      style={{ background: 'rgba(255,160,80,0.25)', color: 'var(--text-primary)' }}>
      <WifiOff size={16} />
      <span>{t('common.offline')}</span>
    </div>
  )
}
