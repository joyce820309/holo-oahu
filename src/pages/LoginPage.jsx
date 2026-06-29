import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { LogIn, Mail, KeyRound, UserRound, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const { t } = useTranslation()
  const { loginWithEmail, signupWithEmail, resetPassword } = useAuth()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const mapAuthError = (error) => {
    const code = error?.code || ''
    if (code === 'auth/email-already-in-use') return t('auth.error.emailInUse')
    if (code === 'auth/invalid-email') return t('auth.error.invalidEmail')
    if (code === 'auth/invalid-credential') return t('auth.error.invalidCredential')
    if (code === 'auth/weak-password') return t('auth.error.weakPassword')
    if (code === 'auth/too-many-requests') return t('auth.error.tooManyRequests')
    if (code === 'auth/user-not-found') return t('auth.error.userNotFound')
    return t('auth.error.generic')
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast.error(t('auth.error.missingFields'))
      return
    }

    setLoading(true)
    try {
      if (mode === 'signup') {
        await signupWithEmail(email.trim(), password, name)
        toast.success(t('auth.success.signup'))
      } else {
        await loginWithEmail(email.trim(), password)
        toast.success(t('auth.success.login'))
      }
    } catch (error) {
      toast.error(mapAuthError(error))
    } finally {
      setLoading(false)
    }
  }

  const onForgotPassword = async () => {
    if (!email.trim()) {
      toast.error(t('auth.error.enterEmailFirst'))
      return
    }

    try {
      await resetPassword(email.trim())
      toast.success(t('auth.success.resetSent'))
    } catch (error) {
      toast.error(mapAuthError(error))
    }
  }

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

        <div className="w-full flex gap-2 glass-mini p-1 rounded-full">
          <button
            type="button"
            className="flex-1 rounded-full py-2 text-sm font-medium"
            style={{
              background: mode === 'login' ? 'var(--accent)' : 'transparent',
              color: mode === 'login' ? 'white' : 'var(--text-primary)',
            }}
            onClick={() => setMode('login')}
          >
            {t('auth.login')}
          </button>
          <button
            type="button"
            className="flex-1 rounded-full py-2 text-sm font-medium"
            style={{
              background: mode === 'signup' ? 'var(--accent)' : 'transparent',
              color: mode === 'signup' ? 'white' : 'var(--text-primary)',
            }}
            onClick={() => setMode('signup')}
          >
            {t('auth.signup')}
          </button>
        </div>

        <form className="w-full flex flex-col gap-3" onSubmit={onSubmit}>
          {mode === 'signup' && (
            <label className="flex items-center gap-2 glass-mini px-3 py-2.5 rounded-xl">
              <UserRound size={16} className="text-accent" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('auth.displayNameOptional')}
                className="w-full bg-transparent border-0 text-sm text-primary"
              />
            </label>
          )}

          <label className="flex items-center gap-2 glass-mini px-3 py-2.5 rounded-xl">
            <Mail size={16} className="text-accent" />
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('auth.email')}
              className="w-full bg-transparent border-0 text-sm text-primary"
            />
          </label>

          <label className="flex items-center gap-2 glass-mini px-3 py-2.5 rounded-xl">
            <KeyRound size={16} className="text-accent" />
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('auth.password')}
              className="w-full bg-transparent border-0 text-sm text-primary"
            />
            <button type="button" onClick={() => setShowPassword(v => !v)} className="text-secondary hover:text-primary">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </label>

          <button className="btn-primary w-full justify-center gap-2" type="submit" disabled={loading}>
            <LogIn size={18} />
            {loading
              ? t('common.loading')
              : mode === 'signup' ? t('auth.signupWithEmail') : t('auth.loginWithEmail')}
          </button>
        </form>

        {mode === 'login' && (
          <button
            type="button"
            className="btn-ghost w-full justify-center"
            onClick={onForgotPassword}
          >
            {t('auth.forgotPassword')}
          </button>
        )}

      </div>
    </div>
  )
}
