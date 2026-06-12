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
  const hours = Array.from({ length: 24 }, (_, i) => pad(i))
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

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
  }

  const setTimePart = (part, nextValue) => {
    const next = selected ? new Date(selected) : new Date()
    if (part === 'hour') next.setHours(Number(nextValue))
    else next.setMinutes(Number(nextValue))
    next.setSeconds(0, 0)
    onChange(toLocalInputValue(next))
  }

  const shiftMonth = (amount) => {
    setViewDate(current => new Date(current.getFullYear(), current.getMonth() + amount, 1))
  }

  const chooseToday = () => {
    const now = new Date()
    setViewDate(now)
    onChange(toLocalInputValue(now))
  }

  const displayValue = selected
    ? selected.toLocaleString(isZh ? 'zh-TW' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : isZh ? '選擇日期與時間' : 'Select date and time'

  return (
    <div className="relative">
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
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.78)',
            border: '0.5px solid var(--glass-border)',
            boxShadow: '0 14px 30px rgba(30,61,79,0.16)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--mini-border)' }}>
            <button type="button" onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg text-secondary">
              <ChevronLeft size={17} />
            </button>
            <div className="flex items-center gap-4 text-primary text-sm font-semibold">
              <span className="inline-flex items-center gap-1">
                {viewDate.getFullYear()}{isZh ? '年' : ''}
                <ChevronDown size={13} className="text-secondary" />
              </span>
              <span className="inline-flex items-center gap-1">
                {isZh ? `${viewDate.getMonth() + 1}月` : viewDate.toLocaleString('en-US', { month: 'short' })}
                <ChevronDown size={13} className="text-secondary" />
              </span>
            </div>
            <button type="button" onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg text-secondary">
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="px-4 pt-3">
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-secondary mb-2">
              {weekLabels.map(label => <span key={label}>{label}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
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
                    className="h-9 rounded-full text-sm transition-colors"
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

          <div className="mx-4 my-3 border-t" style={{ borderColor: 'var(--mini-border)' }} />

          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <select
                value={selected ? pad(selected.getHours()) : pad(new Date().getHours())}
                onChange={e => setTimePart('hour', e.target.value)}
                className="rounded-xl px-3 py-2 text-center text-sm"
                style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
              >
                {hours.map(hour => <option key={hour} value={hour}>{hour}</option>)}
              </select>
              <span className="text-secondary font-semibold">:</span>
              <select
                value={selected ? pad(selected.getMinutes()) : '00'}
                onChange={e => setTimePart('minute', e.target.value)}
                className="rounded-xl px-3 py-2 text-center text-sm"
                style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
              >
                {minutes.map(minute => <option key={minute} value={minute}>{minute}</option>)}
              </select>
            </div>
            <button
              type="button"
              onClick={chooseToday}
              className="w-full py-2 text-sm font-medium"
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

export default function NotificationsPage() {
  const { t, i18n } = useTranslation()
  const {
    prefs,
    reminders,
    loading,
    permissionStatus,
    toggleEnabled,
    toggleCategory,
    addReminder,
    updateReminder,
    deleteReminder,
  } = useNotifications()

  const [showForm, setShowForm] = useState(false)
  const [delId, setDelId] = useState(null)
  const [form, setForm] = useState({ title: '', notifyAt: '' })

  const isUnsupported = permissionStatus === 'unsupported'
  const isDenied = permissionStatus === 'denied'

  const handleAddReminder = async () => {
    if (!form.title.trim()) { toast.error(t('notifications.reminder.titleRequired')); return }
    if (!form.notifyAt) { toast.error(t('notifications.reminder.timeRequired')); return }
    try {
      await addReminder({ title: form.title.trim(), notifyAt: form.notifyAt })
      setForm({ title: '', notifyAt: '' })
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
              <button onClick={() => setShowForm(false)} className="text-secondary">
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
            <ReminderDatePicker
              value={form.notifyAt}
              onChange={notifyAt => setForm(f => ({ ...f, notifyAt }))}
              lang={i18n.language}
            />
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
