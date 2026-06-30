import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, BellOff, Plane, UtensilsCrossed, Wallet, Package, CalendarDays, Info, Plus, Trash2, Clock, X, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import { Skeleton } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import toast from 'react-hot-toast'

const CATEGORY_META = [
  { key: 'tripReminder',    icon: CalendarDays,    i18nKey: 'notifications.cat.tripReminder' },
  { key: 'activityUpdate',  icon: UtensilsCrossed, i18nKey: 'notifications.cat.activityUpdate' },
  { key: 'flightAlert',     icon: Plane,           i18nKey: 'notifications.cat.flightAlert' },
  { key: 'expenseUpdate',   icon: Wallet,          i18nKey: 'notifications.cat.expenseUpdate' },
  { key: 'packingReminder', icon: Package,         i18nKey: 'notifications.cat.packingReminder' },
]

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:opacity-50"
      style={{ background: checked ? 'var(--accent)' : 'var(--mini-border)' }}
    >
      <span
        className="inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: checked ? 'translateX(22px)' : 'translateX(4px)' }}
      />
    </button>
  )
}

const pad = (value) => String(value).padStart(2, '0')

const toLocalInputValue = (date) => (
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
)

const parseNotifyDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return isNaN(date) ? null : date
}

function ReminderDatePicker({ value, onChange, lang }) {
  const selected = parseNotifyDate(value)
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => selected || new Date())
  const isZh = lang === 'zh-TW'
  const weekLabels = isZh ? ['日', '一', '二', '三', '四', '五', '六'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  const calendarDays = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
    const start = new Date(first)
    start.setDate(first.getDate() - first.getDay())

    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      return date
    })
  }, [viewDate])

  const setDatePart = (date) => {
    const next = selected ? new Date(selected) : new Date()
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())
    onChange(toLocalInputValue(next))
    setOpen(false)
  }

  const shiftMonth = (amount) => {
    setViewDate(current => new Date(current.getFullYear(), current.getMonth() + amount, 1))
  }

  const chooseToday = () => {
    const now = new Date()
    setViewDate(now)
    setDatePart(now)
  }

  const displayValue = selected
    ? selected.toLocaleString(isZh ? 'zh-TW' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : isZh ? '選擇日期' : 'Select date'

  return (
    <div className="space-y-1">
      <label className="text-secondary text-sm">{isZh ? '日期' : 'Date'}</label>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm text-left"
        style={{
          background: 'rgba(255,255,255,0.38)',
          border: `0.5px solid ${open ? 'var(--accent)' : 'var(--mini-border)'}`,
          boxShadow: open ? '0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent)' : 'none',
          color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}
      >
        <span className="flex items-center gap-2 min-w-0">
          <CalendarDays size={15} className="text-secondary flex-shrink-0" />
          <span className="truncate">{displayValue}</span>
        </span>
        <ChevronDown
          size={15}
          className="text-secondary flex-shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 bottom-full z-50 mb-2 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.97)',
            border: '0.5px solid var(--glass-border)',
            boxShadow: '0 14px 30px rgba(30,61,79,0.16)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'var(--mini-border)' }}>
            <button type="button" onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg text-secondary">
              <ChevronLeft size={17} />
            </button>
            <div className="flex items-center gap-4 text-primary text-sm font-semibold">
              <span>{viewDate.getFullYear()}{isZh ? '年' : ''}</span>
              <span>{isZh ? `${viewDate.getMonth() + 1}月` : viewDate.toLocaleString('en-US', { month: 'short' })}</span>
            </div>
            <button type="button" onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg text-secondary">
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="px-4 pt-2">
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-secondary mb-1">
              {weekLabels.map(label => <span key={label}>{label}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map(date => {
                const isCurrentMonth = date.getMonth() === viewDate.getMonth()
                const isSelected = selected
                  && date.getFullYear() === selected.getFullYear()
                  && date.getMonth() === selected.getMonth()
                  && date.getDate() === selected.getDate()
                const isToday = date.toDateString() === new Date().toDateString()

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => setDatePart(date)}
                    className="h-8 rounded-full text-sm transition-colors"
                    style={{
                      color: isSelected ? 'white' : isCurrentMonth ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: isSelected ? 'var(--accent)' : 'transparent',
                      border: isToday && !isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                      opacity: isCurrentMonth ? 1 : 0.55,
                    }}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="px-4 py-2.5">
            <button
              type="button"
              onClick={chooseToday}
              className="w-full py-1.5 text-sm font-medium"
              style={{ color: 'var(--accent)' }}
            >
              {isZh ? '今天' : 'Today'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ReminderTimeField({ hour, minute, onChange, lang }) {
  const isZh = lang === 'zh-TW'

  const clampOnBlur = (raw, max) => {
    if (raw === '') return ''
    return pad(Math.min(max, Math.max(0, Number(raw) || 0)))
  }

  return (
    <div className="space-y-1">
      <label className="text-secondary text-sm">{isZh ? '時間' : 'Time'}</label>
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.38)', border: '0.5px solid var(--mini-border)' }}>
        <Clock size={15} className="text-secondary flex-shrink-0" />
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={hour}
          onChange={e => onChange({ hour: e.target.value.replace(/\D/g, '').slice(0, 2), minute })}
          onBlur={e => onChange({ hour: clampOnBlur(e.target.value, 23), minute })}
          className="rounded-lg py-1 text-center text-sm outline-none"
          style={{ width: 40, background: 'rgba(255,255,255,0.9)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
        />
        <span className="text-secondary font-semibold">:</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={minute}
          onChange={e => onChange({ hour, minute: e.target.value.replace(/\D/g, '').slice(0, 2) })}
          onBlur={e => onChange({ hour, minute: clampOnBlur(e.target.value, 59) })}
          className="rounded-lg py-1 text-center text-sm outline-none"
          style={{ width: 40, background: 'rgba(255,255,255,0.9)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
        />
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const { t, i18n } = useTranslation()
  const {
    prefs,
    reminders,
    loading,
    permissionStatus,
    toggleEnabled,
    toggleCategory,
    requestPermission,
    addReminder,
    updateReminder,
    deleteReminder,
  } = useNotifications()

  const [showForm, setShowForm] = useState(false)
  const [delId, setDelId] = useState(null)
  const [form, setForm] = useState({ title: '', date: '', hour: '', minute: '' })

  const isUnsupported = permissionStatus === 'unsupported'
  const isDenied = permissionStatus === 'denied'

  const handleAddReminder = async () => {
    if (!form.title.trim()) { toast.error(t('notifications.reminder.titleRequired')); return }
    if (!form.date) { toast.error('請選擇日期'); return }
    if (form.hour === '' || form.minute === '') { toast.error('請輸入完整時間'); return }
    if (isUnsupported) { toast.error('此裝置不支援推播通知'); return }
    if (!prefs.fcmToken) {
      if (isDenied) {
        toast.error('通知權限已被拒絕，請至系統設定開啟後再試一次')
        return
      }
      const result = await requestPermission()
      if (result !== 'granted') {
        toast.error('需要通知權限才能收到提醒')
        return
      }
    }
    const next = new Date(form.date)
    next.setHours(Number(form.hour), Number(form.minute), 0, 0)
    try {
      await addReminder({ title: form.title.trim(), notifyAt: toLocalInputValue(next) })
      setForm({ title: '', date: '', hour: '', minute: '' })
      setShowForm(false)
      toast.success(t('notifications.reminder.added'))
    } catch {
      toast.error(t('notifications.reminder.error'))
    }
  }

  const handleDelete = async () => {
    if (!delId) return
    try {
      await deleteReminder(delId)
      toast.success(t('common.delete'))
    } catch {
      toast.error(t('notifications.reminder.error'))
    }
    setDelId(null)
  }

  const handleToggleReminder = async (id, enabled) => {
    await updateReminder(id, { enabled })
  }

  const fmtTime = (dt) => {
    if (!dt) return ''
    const d = new Date(dt)
    if (isNaN(d)) return dt
    return d.toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const isPast = (dt) => {
    if (!dt) return false
    return new Date(dt) < new Date()
  }

  if (loading) {
    return (
      <div className="px-4 pb-36">
        <h2 className="text-primary font-medium text-xl py-4">{t('notifications.title')}</h2>
        <div className="glass-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-7 w-12 rounded-full" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-7 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pb-36">
      <h2 className="text-primary font-medium text-xl py-4">{t('notifications.title')}</h2>

      {/* Unsupported / Denied banner */}
      {(isUnsupported || isDenied) && (
        <div className="glass-mini p-4 mb-4 flex items-start gap-3">
          <Info size={20} className="text-accent flex-shrink-0 mt-0.5" />
          <p className="text-secondary text-sm">
            {isUnsupported
              ? t('notifications.unsupported')
              : t('notifications.denied')}
          </p>
        </div>
      )}

      {/* Main toggle */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {prefs.enabled ? <Bell size={20} className="text-accent" /> : <BellOff size={20} className="text-secondary" />}
            <span className="text-primary font-medium">{t('notifications.enable')}</span>
          </div>
          <Toggle
            checked={prefs.enabled}
            onChange={toggleEnabled}
            disabled={isUnsupported || isDenied}
          />
        </div>
        <p className="text-secondary text-xs mt-2 ml-8">
          {prefs.enabled ? t('notifications.enabledDesc') : t('notifications.disabledDesc')}
        </p>
      </div>

      {/* Diagnostics — helps debug why push notifications aren't arriving */}
      <div className="glass-mini p-3 mb-4 space-y-1">
        <p className="text-secondary text-xs font-medium mb-1">診斷資訊</p>
        <p className="text-secondary text-xs">瀏覽器權限：{permissionStatus}</p>
        <p className="text-secondary text-xs">
          已註冊裝置 token 數：{(prefs.fcmTokens?.length ?? (prefs.fcmToken ? 1 : 0))}
        </p>
        <p className="text-secondary text-xs break-all">
          目前 token：{prefs.fcmToken ? `${prefs.fcmToken.slice(0, 16)}…` : '無'}
        </p>
        {reminders.length > 0 && (
          <p className="text-secondary text-xs">
            最近一筆提醒狀態：{reminders[0].status || 'pending'}
            {reminders[0].sentAt && `（已於 ${new Date(reminders[0].sentAt.seconds ? reminders[0].sentAt.seconds * 1000 : reminders[0].sentAt).toLocaleString()} 發送）`}
          </p>
        )}
      </div>

      {/* Category toggles */}
      <div className="glass-card p-4 mb-4">
        <p className="text-primary font-medium mb-3">{t('notifications.categories')}</p>
        <div className="space-y-1">
          {CATEGORY_META.map(({ key, icon: Icon, i18nKey }) => (
            <div key={key} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <Icon size={18} className={prefs.enabled ? 'text-accent' : 'text-secondary'} />
                <span className="text-primary text-sm">{t(i18nKey)}</span>
              </div>
              <Toggle
                checked={prefs.categories[key]}
                onChange={(v) => toggleCategory(key, v)}
                disabled={!prefs.enabled || isUnsupported || isDenied}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Custom reminders */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-primary font-medium">{t('notifications.reminder.title')}</p>
          <button
            className="btn-primary"
            onClick={() => setShowForm(true)}
          >
            <Plus size={16} />
            {t('notifications.reminder.add')}
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="glass-mini p-4 mb-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-primary text-sm font-medium">{t('notifications.reminder.new')}</p>
              <button onClick={() => { setShowForm(false); setForm({ title: '', date: '', hour: '', minute: '' }) }} className="text-secondary">
                <X size={18} />
              </button>
            </div>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder={t('notifications.reminder.namePlaceholder')}
              className="w-full px-3 py-2.5 rounded-xl text-sm"
              style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
            />
            <div className="relative grid grid-cols-[1fr_auto] gap-2 items-start">
              <ReminderDatePicker
                value={form.date}
                onChange={date => setForm(f => ({ ...f, date }))}
                lang={i18n.language}
              />
              <ReminderTimeField
                hour={form.hour}
                minute={form.minute}
                onChange={({ hour, minute }) => setForm(f => ({ ...f, hour, minute }))}
                lang={i18n.language}
              />
            </div>
            <button className="btn-primary w-full justify-center" onClick={handleAddReminder}>
              {t('common.save')}
            </button>
          </div>
        )}

        {/* Reminder list */}
        {reminders.length === 0 && !showForm && (
          <p className="text-secondary text-sm text-center py-4">{t('notifications.reminder.empty')}</p>
        )}

        <div className="space-y-2">
          {reminders.map(r => (
            <div
              key={r.id}
              className="glass-mini p-3 flex items-center justify-between"
              style={{ opacity: isPast(r.notifyAt) ? 0.5 : 1 }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-primary text-sm font-medium truncate">{r.title}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock size={12} className="text-secondary flex-shrink-0" />
                  <span className="text-secondary text-xs">
                    {fmtTime(r.notifyAt)}
                    {isPast(r.notifyAt) && ` · ${t('notifications.reminder.past')}`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <Toggle
                  checked={r.enabled}
                  onChange={(v) => handleToggleReminder(r.id, v)}
                  disabled={isPast(r.notifyAt)}
                />
                <button
                  className="text-secondary p-1.5 rounded-lg transition-colors"
                  style={{ minWidth: 32, minHeight: 32 }}
                  onClick={() => setDelId(r.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {delId && <ConfirmDialog onConfirm={handleDelete} onCancel={() => setDelId(null)} />}
    </div>
  )
}
