import { useTranslation } from 'react-i18next'

export default function ConfirmDialog({ onConfirm, onCancel }) {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
      <div className="glass-card p-6 mx-4 max-w-sm w-full">
        <p className="text-base text-primary mb-6">{t('common.confirm')}</p>
        <div className="flex gap-3 justify-end">
          <button className="btn-ghost" onClick={onCancel}>{t('common.cancel')}</button>
          <button
            className="btn-primary"
            style={{ background: '#c0392b', transition: 'background 0.15s, filter 0.15s' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#a93226'
              e.currentTarget.style.filter = 'brightness(1.02)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#c0392b'
              e.currentTarget.style.filter = 'none'
            }}
            onClick={onConfirm}
          >{t('common.delete')}</button>
        </div>
      </div>
    </div>
  )
}
