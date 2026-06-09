import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { useExpenses } from '../hooks/useExpenses'
import { useAuth } from '../contexts/AuthContext'
import { useTrip } from '../hooks/useTrip'
import ConfirmDialog from '../components/ConfirmDialog'
import toast from 'react-hot-toast'

const CATEGORIES = ['food', 'transport', 'accommodation', 'activity', 'shopping', 'other']
const CURRENCIES  = ['USD', 'KRW', 'TWD']

const CAT_COLORS = {
  food:          '#e67e22',
  transport:     '#2980b9',
  accommodation: '#8e44ad',
  activity:      '#27ae60',
  shopping:      '#c0392b',
  other:         '#7f8c8d',
}

const emptyForm = () => ({
  title: '', amount: '', currency: 'USD', category: 'food',
  date: new Date().toISOString().slice(0,10), paidBy: '',
})

export default function ExpensesPage() {
  const { t }                   = useTranslation()
  const { user }                = useAuth()
  const { trip }                = useTrip()
  const { expenses, loading, toTWD, addExpense, updateExpense, deleteExpense } = useExpenses()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]     = useState(null)
  const [delId, setDelId]       = useState(null)
  const [form, setForm]         = useState(emptyForm())
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.title || !form.amount) { toast.error('請填寫標題和金額'); return }
    const data = { ...form, amount: parseFloat(form.amount), paidBy: form.paidBy || user?.uid || '' }
    try {
      if (editId) { await updateExpense(editId, data); setEditId(null) }
      else        { await addExpense(data); setShowForm(false); setForm(emptyForm()) }
      toast.success(t('common.save'))
    } catch { toast.error('儲存失敗') }
  }

  const startEdit = (exp) => {
    setForm({ ...exp, amount: String(exp.amount) })
    setEditId(exp.id)
    setShowForm(false)
  }

  // Totals per currency
  const totals = CURRENCIES.reduce((acc, cur) => {
    acc[cur] = expenses.filter(e => e.currency === cur).reduce((s, e) => s + e.amount, 0)
    return acc
  }, {})
  const twdTotal = expenses.reduce((s, e) => s + toTWD(e.amount, e.currency), 0)

  const byDate = expenses.reduce((acc, e) => {
    acc[e.date] = acc[e.date] || []
    acc[e.date].push(e)
    return acc
  }, {})

  const memberName = (uid) => {
    const m = trip?.members?.find(m => m.uid === uid)
    return m?.displayName || uid || '-'
  }

  const Input = ({ label, value, onChange, type = 'text' }) => (
    <div className="space-y-1">
      <label className="text-secondary text-sm">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full glass-mini px-3 py-2.5 text-primary text-base outline-none rounded-xl"
        style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
      />
    </div>
  )

  const ExpenseForm = () => (
    <div className="glass-card p-4 mb-4 space-y-3">
      <Input label={t('expenses.fields.title')}  value={form.title}  onChange={v => set('title', v)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label={t('expenses.fields.amount')} value={form.amount} onChange={v => set('amount', v)} type="number" />
        <div className="space-y-1">
          <label className="text-secondary text-sm">{t('expenses.fields.currency')}</label>
          <div className="flex gap-1">
            {CURRENCIES.map(c => (
              <button key={c} onClick={() => set('currency', c)}
                className="flex-1 py-2.5 rounded-xl text-sm border"
                style={{
                  background: form.currency === c ? 'var(--accent)' : 'var(--mini-bg)',
                  color:      form.currency === c ? 'white'         : 'var(--text-secondary)',
                  borderColor: form.currency === c ? 'var(--accent)' : 'var(--mini-border)',
                }}>{c}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => set('category', c)}
            className="px-3 py-1.5 rounded-full text-sm border"
            style={{
              background: form.category === c ? 'var(--accent)' : 'var(--mini-bg)',
              color:      form.category === c ? 'white'         : 'var(--text-secondary)',
              borderColor: form.category === c ? 'var(--accent)' : 'var(--mini-border)',
            }}>{t(`expenses.categories.${c}`)}</button>
        ))}
      </div>
      <Input label={t('expenses.fields.date')} value={form.date} onChange={v => set('date', v)} type="date" />
      <div className="flex gap-3 pt-2">
        <button className="btn-ghost flex-1 justify-center" onClick={() => { setShowForm(false); setEditId(null) }}>{t('common.cancel')}</button>
        <button className="btn-primary flex-1 justify-center" onClick={handleSave}>{t('common.save')}</button>
      </div>
    </div>
  )

  return (
    <div className="px-4 pb-24">
      <div className="flex items-center justify-between py-4">
        <h2 className="text-primary font-medium text-xl">{t('expenses.title')}</h2>
        <button className="btn-primary" onClick={() => { setShowForm(s => !s); setEditId(null) }}>
          <Plus size={18} />{t('expenses.new')}
        </button>
      </div>

      {/* Totals */}
      <div className="glass-card p-4 mb-4">
        <div className="grid grid-cols-3 gap-3 mb-3">
          {CURRENCIES.map(c => (
            <div key={c} className="glass-mini p-3 text-center">
              <p className="text-secondary text-xs">{c}</p>
              <p className="text-primary font-medium text-sm">
                {totals[c].toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          ))}
        </div>
        <div className="glass-mini p-3 text-center">
          <p className="text-secondary text-xs">{t('expenses.twdTotal')}</p>
          <p className="text-primary font-medium text-lg">
            TWD {Math.round(twdTotal).toLocaleString()}
          </p>
        </div>
      </div>

      {(showForm || editId) && <ExpenseForm />}

      {loading && <p className="text-secondary text-center py-8">{t('common.loading')}</p>}
      {!loading && expenses.length === 0 && !showForm && (
        <p className="text-secondary text-center py-8">{t('expenses.noData')}</p>
      )}

      {Object.entries(byDate).sort(([a],[b]) => b.localeCompare(a)).map(([date, dayItems]) => (
        <div key={date} className="mb-5">
          <p className="text-secondary text-sm font-medium mb-2">{date}</p>
          <div className="space-y-2">
            {dayItems.map(exp => (
              <div key={exp.id} className="glass-mini p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: CAT_COLORS[exp.category] || '#999' }} />
                  <div>
                    <p className="text-primary text-sm font-medium">{exp.title}</p>
                    <p className="text-secondary text-xs">{t(`expenses.categories.${exp.category}`)} · {memberName(exp.paidBy)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-primary font-medium text-sm">
                      {exp.currency} {exp.amount.toLocaleString()}
                    </p>
                    {exp.currency !== 'TWD' && (
                      <p className="text-secondary text-xs">
                        ≈ TWD {Math.round(toTWD(exp.amount, exp.currency)).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button className="text-secondary text-xs p-2" onClick={() => startEdit(exp)}>{t('common.edit')}</button>
                  <button className="text-secondary text-xs p-2" onClick={() => setDelId(exp.id)}>{t('common.delete')}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {delId && (
        <ConfirmDialog
          onConfirm={() => { deleteExpense(delId); setDelId(null) }}
          onCancel={() => setDelId(null)}
        />
      )}
    </div>
  )
}
