import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Check, Square } from 'lucide-react'
import { usePacking } from '../hooks/usePacking'
import { useAuth } from '../contexts/AuthContext'
import ConfirmDialog from '../components/ConfirmDialog'
import toast from 'react-hot-toast'

const CATEGORIES = ['clothing', 'documents', 'medicine', 'electronics', 'toiletries', 'other']

function bi(field, lang) {
  if (!field) return ''
  if (typeof field === 'string') return field
  return field[lang === 'zh-TW' ? 'zh' : 'en'] || field.zh || field.en || ''
}

export default function PackingPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { items, loading, addItem, updateItem, deleteItem } = usePacking()
  const [showForm, setShowForm] = useState(false)
  const [delId, setDelId]       = useState(null)
  const [filter, setFilter]     = useState('all')
  const lang = i18n.language

  const [form, setForm] = useState({ itemZh: '', itemEn: '', category: 'other', owner: 'shared' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleAdd = async () => {
    if (!form.itemZh && !form.itemEn) { toast.error('請輸入項目名稱'); return }
    try {
      await addItem({ item: { zh: form.itemZh, en: form.itemEn }, category: form.category, owner: form.owner, checked: false })
      setForm({ itemZh: '', itemEn: '', category: 'other', owner: 'shared' })
      setShowForm(false)
      toast.success('已新增')
    } catch { toast.error('新增失敗') }
  }

  const toggleCheck = (item) => updateItem(item.id, { checked: !item.checked })

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    const filtered = items.filter(i => i.category === cat && (filter === 'all' || i.category === filter))
    if (filtered.length > 0) acc[cat] = filtered
    return acc
  }, {})

  const checkedCount = items.filter(i => i.checked).length

  return (
    <div className="px-4 pb-24">
      <div className="flex items-center justify-between py-4">
        <div>
          <h2 className="text-primary font-medium text-xl">{t('packing.title')}</h2>
          <p className="text-secondary text-sm">{checkedCount}/{items.length}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(s => !s)}>
          <Plus size={18} />{t('packing.new')}
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-4 mb-4 space-y-3">
          {[
            { label: t('packing.fields.itemZh'), k: 'itemZh' },
            { label: t('packing.fields.itemEn'), k: 'itemEn' },
          ].map(({ label, k }) => (
            <div key={k} className="space-y-1">
              <label className="text-secondary text-sm">{label}</label>
              <input value={form[k]} onChange={e => set(k, e.target.value)}
                className="w-full glass-mini px-3 py-2.5 text-primary text-base outline-none rounded-xl"
                style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
              />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => set('category', c)}
                className="px-3 py-1.5 rounded-full text-sm border"
                style={{
                  background: form.category === c ? 'var(--accent)' : 'var(--mini-bg)',
                  color:      form.category === c ? 'white'         : 'var(--text-secondary)',
                  borderColor: form.category === c ? 'var(--accent)' : 'var(--mini-border)',
                }}>{t(`packing.categories.${c}`)}</button>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-ghost flex-1 justify-center" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
            <button className="btn-primary flex-1 justify-center" onClick={handleAdd}>{t('common.save')}</button>
          </div>
        </div>
      )}

      {loading && <p className="text-secondary text-center py-8">{t('common.loading')}</p>}
      {!loading && items.length === 0 && !showForm && (
        <p className="text-secondary text-center py-8">{t('packing.noData')}</p>
      )}

      {Object.entries(byCategory).map(([cat, catItems]) => (
        <div key={cat} className="mb-5">
          <p className="text-secondary text-sm font-medium mb-2">{t(`packing.categories.${cat}`)}</p>
          <div className="space-y-2">
            {catItems.map(item => (
              <div key={item.id} className={`glass-mini p-3 flex items-center justify-between ${item.checked ? 'opacity-60' : ''}`}>
                <button
                  className="flex items-center gap-3 flex-1 min-h-[44px]"
                  onClick={() => toggleCheck(item)}
                >
                  {item.checked
                    ? <Check size={20} style={{ color: 'var(--accent)' }} />
                    : <Square size={20} style={{ color: 'var(--text-secondary)' }} />
                  }
                  <span className={`text-base ${item.checked ? 'line-through text-secondary' : 'text-primary'}`}>
                    {bi(item.item, lang)}
                  </span>
                </button>
                <button className="text-secondary text-xs p-2 ml-2" onClick={() => setDelId(item.id)}>{t('common.delete')}</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {delId && (
        <ConfirmDialog
          onConfirm={() => { deleteItem(delId); setDelId(null) }}
          onCancel={() => setDelId(null)}
        />
      )}
    </div>
  )
}
