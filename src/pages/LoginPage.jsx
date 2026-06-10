import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { LogIn } from 'lucide-react'

export default function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 px-6">
      <div className="text-center">
        <h1 className="text-4xl font-medium text-primary mb-2">Holo</h1>
        <p className="text-secondary text-lg">our Oahu journey</p>
      </div>

      <div className="glass-card p-8 w-full max-w-sm flex flex-col items-center gap-6">
        <div className="text-secondary text-sm text-center">
          7/18 – 7/26, 2026
        </div>
        <button className="btn-primary w-full justify-center gap-2" onClick={login}>
          <LogIn size={20} />
          {t('common.login')}
        </button>
      </div>
    </div>
  )
}
