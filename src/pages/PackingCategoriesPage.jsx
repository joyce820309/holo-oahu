import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FolderPlus, Pencil, Trash2, X } from 'lucide-react'
import { usePacking } from '../hooks/usePacking'
import { useAuth } from '../contexts/AuthContext'
import ConfirmDialog from '../components/ConfirmDialog'
import toast from 'react-hot-toast'

function bi(field, lang) {
  if (!field) return ''
  if (typeof field === 'string') return field
  return field[lang === 'zh-TW' ? 'zh' : 'en'] || field.zh || field.en || ''
}

function CategoryForm({ initial, lang, onSave, onCancel }) {
  const [inputLang, setInputLang] = useState('zh')
  const [name, setName] = useState(initial?.name || { zh: '', en: '' })

  return (
    <div className="glass-card p-4 mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-primary font-medium text-sm">{initial ? '編輯類別' : '新增類別'}</p>
        <button className="text-secondary p-1 rounded-lg" onClick={onCancel}><X size={17} /></button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-secondary text-sm">類別名稱</label>
          <div className="flex items-center gap-1">
            {['zh', 'en'].map(l => (
              <button key={l} type="button" onClick={() => setInputLang(l)}
                className="px-2.5 py-0.5 rounded-md text-xs font-medium"
                style={{
                  background: inputLang === l ? 'var(--accent)' : 'var(--mini-bg)',
                  color:      inputLang === l ? 'white'         : 'var(--text-secondary)',
                  border:     `0.5px solid ${inputLang === l ? 'var(--accent)' : 'var(--mini-border)'}`,
                }}
              >{l === 'zh' ? '中' : 'EN'}</button>
            ))}
          </div>
        </div>
        <input
          value={inputLang === 'zh' ? name.zh : name.en}
          onChange={e => setName(n => ({ ...n, [inputLang]: e.target.value }))}
          placeholder={lang === 'zh-TW' ? '例如：衣物' : 'e.g. Clothing'}
          className="w-full glass-mini px-3 py-2.5 text-primary text-base outline-none rounded-xl"
          style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button className="btn-ghost flex-1 justify-center" onClick={onCancel}>取消</button>
        <button className="btn-primary flex-1 justify-center" onClick={() => onSave(name)}>儲存</button>
      </div>
    </div>
  )
}

export default function PackingCategoriesPage() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const { canEditGeneral } = useAuth()
  const { categories, items, addCategory, updateCategory, deleteCategory } = usePacking()

  const [showForm, setShowForm]       = useState(false)
  const [editingCat, setEditingCat]   = useState(null)
  const [delTarget, setDelTarget]     = useState(null)
  const lang = i18n.language

  const openAdd  = () => { setEditingCat(null); setShowForm(true) }
  const openEdit = (cat) => { setEditingCat(cat); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditingCat(null) }

  const saveCategory = async (name) => {
    if (!name.zh && !name.en) { toast.error('請輸入類別名稱'); return }
    try {
      if (editingCat) {
        await updateCategory(editingCat.id, { name })
      } else {
        await addCategory({ name, order: categories.length })
      }
      closeForm()
      toast.success('已儲存')
    } catch { toast.error('儲存失敗') }
  }

  const requestDelete = (cat) => {
    const count = items.filter(i => (i.categoryId || i.category) === cat.id).length
    if (count > 0) {
      toast.error(`請先移除此類別下的 ${count} 個項目`)
      return
    }
    setDelTarget(cat)
  }

  return (
    <div className="px-4 pb-24">
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-xl text-secondary" onClick={() => navigate('/trip/packing')}>
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-primary font-medium text-xl">管理類別</h2>
        </div>
        {canEditGeneral && (
          <button className="btn-primary" onClick={openAdd}>
            <FolderPlus size={17} />新增類別
          </button>
        )}
      </div>

      {showForm && (
        <CategoryForm
          initial={editingCat}
          lang={lang}
          onSave={saveCategory}
          onCancel={closeForm}
        />
      )}

      {categories.length === 0 && (
        <p className="text-secondary text-center py-8">尚無類別</p>
      )}

      <div className="space-y-2">
        {categories.map(cat => {
          const count = items.filter(i => (i.categoryId || i.category) === cat.id).length
          return (
            <div key={cat.id} className="glass-card p-4 flex items-center justify-between">
              <div>
                <p className="text-primary font-medium">{bi(cat.name, lang)}</p>
                <p className="text-secondary text-xs mt-0.5">{count} 個項目</p>
              </div>
              {canEditGeneral && (
                <div className="flex gap-1">
                  <button className="p-2 rounded-lg text-secondary" onClick={() => openEdit(cat)}>
                    <Pencil size={16} />
                  </button>
                  <button className="p-2 rounded-lg text-secondary" onClick={() => requestDelete(cat)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {delTarget && (
        <ConfirmDialog
          onConfirm={async () => {
            try { await deleteCategory(delTarget.id); toast.success('已刪除') }
            catch { toast.error('刪除失敗') }
            setDelTarget(null)
          }}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </div>
  )
}
