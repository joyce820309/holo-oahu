import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, FolderPlus, MoreHorizontal, PackagePlus, Pencil, Square, Trash2, X } from 'lucide-react'
import { usePacking } from '../hooks/usePacking'
import { useAuth } from '../contexts/AuthContext'
import ConfirmDialog from '../components/ConfirmDialog'
import { PackingSkeleton } from '../components/Skeleton'
import toast from 'react-hot-toast'

function bi(field, lang) {
  if (!field) return ''
  if (typeof field === 'string') return field
  return field[lang === 'zh-TW' ? 'zh' : 'en'] || field.zh || field.en || ''
}

function BilingualField({ label, inputLang, setInputLang, zhValue, enValue, onZhChange, onEnChange, placeholder }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-secondary text-sm">{label}</label>
        <div className="flex items-center gap-1">
          {['zh', 'en'].map(l => (
            <button key={l} type="button" onClick={() => setInputLang(l)}
              className="px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors"
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
        value={inputLang === 'zh' ? zhValue : enValue}
        onChange={e => inputLang === 'zh' ? onZhChange(e.target.value) : onEnChange(e.target.value)}
        placeholder={placeholder}
        className="w-full glass-mini px-3 py-2.5 text-primary text-base outline-none rounded-xl"
        style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
      />
    </div>
  )
}

// ── Swipeable item row ─────────────────────────────────────────────────────

const ACTION_W = 112  // total width of edit + delete buttons

function SwipeableItemRow({ item, lang, canEdit, onToggle, onEdit, onDelete }) {
  const [offset, setOffset] = useState(0)
  const startX  = useRef(null)
  const rowRef  = useRef(null)
  const isDragging = useRef(false)

  useEffect(() => {
    const el = rowRef.current
    if (!el || !canEdit) return

    const onStart = e => {
      startX.current  = e.touches[0].clientX
      isDragging.current = false
    }
    const onMove = e => {
      if (startX.current === null) return
      const dx = e.touches[0].clientX - startX.current
      if (!isDragging.current && Math.abs(dx) < 5) return
      isDragging.current = true
      e.preventDefault()
      const next = Math.max(-ACTION_W, Math.min(0, dx + offset))
      setOffset(next)
    }
    const onEnd = () => {
      if (!isDragging.current) { startX.current = null; return }
      setOffset(o => o < -ACTION_W / 2 ? -ACTION_W : 0)
      startX.current = null
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove',  onMove,  { passive: false })
    el.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onEnd)
    }
  }, [offset, canEdit])

  // close when another row opens (click outside)
  useEffect(() => {
    if (offset === 0) return
    const h = () => setOffset(0)
    document.addEventListener('touchstart', h, { passive: true })
    return () => document.removeEventListener('touchstart', h)
  }, [offset])

  return (
    <div ref={rowRef} style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
      {/* action buttons (behind) */}
      {canEdit && (
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: ACTION_W, display: 'flex',
        }}>
          <button
            className="flex-1 flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--accent) 90%, black)', color: 'white' }}
            onMouseDown={e => { e.stopPropagation(); setOffset(0); onEdit() }}
          >
            <Pencil size={16} />
          </button>
          <button
            className="flex-1 flex items-center justify-center"
            style={{ background: '#e05555', color: 'white', borderRadius: '0 12px 12px 0' }}
            onMouseDown={e => { e.stopPropagation(); setOffset(0); onDelete() }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {/* card (foreground) */}
      <div
        className={`glass-mini p-3 flex items-center justify-between ${item.checked ? 'opacity-60' : ''}`}
        style={{ transform: `translateX(${offset}px)`, transition: isDragging.current ? 'none' : 'transform 0.2s ease', position: 'relative', zIndex: 1 }}
      >
        <button className="flex items-center gap-3 flex-1 min-h-[44px] text-left" onClick={onToggle}>
          {item.checked
            ? <Check size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            : <Square size={20} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          }
          <span className={`text-base ${item.checked ? 'line-through text-secondary' : 'text-primary'}`}>
            {bi(item.item, lang)}
          </span>
        </button>
        {/* desktop edit/delete */}
        {canEdit && (
          <div className="hidden md:flex gap-1 ml-2">
            <button className="text-secondary p-1.5 rounded-lg" onClick={onEdit}><Pencil size={14} /></button>
            <button className="text-secondary p-1.5 rounded-lg" onClick={onDelete}><Trash2 size={14} /></button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Category ⋯ menu ────────────────────────────────────────────────────────

function CategoryMenu({ onAddItem, onEdit, onDelete }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    document.addEventListener('touchstart', h)
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h) }
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="text-secondary p-2 rounded-lg" onClick={() => setOpen(v => !v)}>
        <MoreHorizontal size={17} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 200,
          background: 'var(--glass-bg)', border: '0.5px solid var(--glass-border)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          minWidth: 140, overflow: 'hidden',
        }}>
          <button className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left"
            style={{ color: 'var(--text-primary)' }}
            onMouseDown={() => { setOpen(false); onAddItem() }}>
            <PackagePlus size={15} style={{ color: 'var(--accent)' }} />{t('packing.new')}
          </button>
          <button className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left"
            style={{ color: 'var(--text-primary)', borderTop: '0.5px solid var(--mini-border)' }}
            onMouseDown={() => { setOpen(false); onEdit() }}>
            <Pencil size={15} style={{ color: 'var(--text-secondary)' }} />{t('packing.editCategory')}
          </button>
          <button className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left"
            style={{ color: '#e05555', borderTop: '0.5px solid var(--mini-border)' }}
            onMouseDown={() => { setOpen(false); onDelete() }}>
            <Trash2 size={15} />{t('packing.deleteCategory')}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Inline form ────────────────────────────────────────────────────────────

function InlineForm({ title, onClose, children, onSave, onCancel, saveLabel = '儲存' }) {
  return (
    <div className="glass-card p-4 mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-primary font-medium text-sm">{title}</p>
        <button className="text-secondary p-1 rounded-lg" onClick={onClose}><X size={17} /></button>
      </div>
      {children}
      <div className="flex gap-3 pt-1">
        <button className="btn-ghost flex-1 justify-center" onClick={onCancel}>取消</button>
        <button className="btn-primary flex-1 justify-center" onClick={onSave}>{saveLabel}</button>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

const emptyCategoryForm = () => ({ name: { zh: '', en: '' } })
const emptyItemForm = (categoryId = '') => ({ item: { zh: '', en: '' }, categoryId, owner: 'shared' })

export default function PackingPage() {
  const { t, i18n } = useTranslation()
  const { canEditGeneral } = useAuth()
  const { items, categories, loading, addItem, updateItem, deleteItem, addCategory, updateCategory, deleteCategory } = usePacking()

  const [inputLang, setInputLang] = useState('zh')
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showItemForm, setShowItemForm]         = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editingItemId, setEditingItemId]         = useState(null)
  const [delTarget, setDelTarget]                 = useState(null)
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm())
  const [itemForm, setItemForm]         = useState(emptyItemForm())
  const lang = i18n.language

  const activeCategories = useMemo(() => categories, [categories])
  const defaultCategoryId = activeCategories[0]?.id || ''

  useEffect(() => {
    if (!itemForm.categoryId && defaultCategoryId) {
      setItemForm(f => ({ ...f, categoryId: defaultCategoryId }))
    }
  }, [defaultCategoryId, itemForm.categoryId])

  const checkedCount = items.filter(i => i.checked).length

  const resetCategoryForm = () => { setCategoryForm(emptyCategoryForm()); setEditingCategoryId(null); setShowCategoryForm(false) }
  const resetItemForm     = () => { setItemForm(emptyItemForm(defaultCategoryId)); setEditingItemId(null); setShowItemForm(false) }

  const openCategoryForm = (cat = null) => {
    setEditingCategoryId(cat?.id || null)
    setCategoryForm(cat ? { name: cat.name || { zh: '', en: '' } } : emptyCategoryForm())
    setShowItemForm(false)
    setShowCategoryForm(true)
  }

  const openItemForm = (categoryId = defaultCategoryId, item = null) => {
    setEditingItemId(item?.id || null)
    setItemForm(item
      ? { item: item.item || { zh: '', en: '' }, categoryId: item.categoryId || item.category || categoryId, owner: item.owner || 'shared' }
      : emptyItemForm(categoryId)
    )
    setShowCategoryForm(false)
    setShowItemForm(true)
  }

  const saveCategory = async () => {
    if (!categoryForm.name.zh && !categoryForm.name.en) { toast.error(t('common.save')); return }
    const data = { name: categoryForm.name, order: editingCategoryId ? activeCategories.find(c => c.id === editingCategoryId)?.order || 0 : activeCategories.length }
    try {
      if (editingCategoryId) await updateCategory(editingCategoryId, data)
      else await addCategory(data)
      resetCategoryForm(); toast.success(t('common.save'))
    } catch { toast.error(t('common.save')) }
  }

  const saveItem = async () => {
    if (!itemForm.item.zh && !itemForm.item.en) { toast.error(t('common.save')); return }
    if (!itemForm.categoryId) { toast.error(t('packing.selectCategory')); return }
    const data = {
      item: itemForm.item, categoryId: itemForm.categoryId, category: itemForm.categoryId,
      owner: itemForm.owner,
      checked: editingItemId ? (items.find(i => i.id === editingItemId)?.checked || false) : false,
    }
    try {
      if (editingItemId) await updateItem(editingItemId, data)
      else await addItem(data)
      resetItemForm(); toast.success(t('common.save'))
    } catch { toast.error(t('common.save')) }
  }

  const confirmDelete = async () => {
    if (!delTarget) return
    try {
      if (delTarget.type === 'category') await deleteCategory(delTarget.id)
      else await deleteItem(delTarget.id)
    } catch { toast.error(t('common.delete')) }
    setDelTarget(null)
  }

  const requestDeleteCategory = (cat) => {
    const count = items.filter(i => (i.categoryId || i.category) === cat.id).length
    if (count > 0) { toast.error(t('packing.deleteCategory')); return }
    setDelTarget({ type: 'category', id: cat.id })
  }

  if (loading) return (
    <div className="px-4 pb-24">
      <div className="py-4"><h2 className="text-primary font-medium text-xl">{t('packing.title')}</h2></div>
      <PackingSkeleton />
    </div>
  )

  return (
    <div className="px-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between py-4">
        <div>
          <h2 className="text-primary font-medium text-xl">{t('packing.title')}</h2>
          <p className="text-secondary text-sm">{checkedCount}/{items.length}</p>
        </div>
        {canEditGeneral && (
          <div className="flex gap-2">
            <button className="btn-ghost px-3" title={t('packing.newCategory')} onClick={() => openCategoryForm()}>
              <FolderPlus size={17} />
            </button>
            <button className="btn-primary" onClick={() => openItemForm()}>
              <PackagePlus size={18} />{t('packing.new')}
            </button>
          </div>
        )}
      </div>

      {/* Category form */}
      {showCategoryForm && (
        <InlineForm
          title={editingCategoryId ? t('packing.editCategory') : t('packing.newCategory')}
          onClose={resetCategoryForm} onCancel={resetCategoryForm} onSave={saveCategory}
        >
          <BilingualField
            label={t('packing.categoryName')}
            inputLang={inputLang} setInputLang={setInputLang}
            zhValue={categoryForm.name.zh} enValue={categoryForm.name.en}
            onZhChange={v => setCategoryForm(f => ({ ...f, name: { ...f.name, zh: v } }))}
            onEnChange={v => setCategoryForm(f => ({ ...f, name: { ...f.name, en: v } }))}
            placeholder={lang === 'zh-TW' ? '例如：衣物' : 'e.g. Clothing'}
          />
        </InlineForm>
      )}

      {/* Item form */}
      {showItemForm && (
        <InlineForm
          title={editingItemId ? t('packing.editItem') : t('packing.newItem')}
          onClose={resetItemForm} onCancel={resetItemForm} onSave={saveItem}
        >
          <BilingualField
            label={t('packing.itemName')}
            inputLang={inputLang} setInputLang={setInputLang}
            zhValue={itemForm.item.zh} enValue={itemForm.item.en}
            onZhChange={v => setItemForm(f => ({ ...f, item: { ...f.item, zh: v } }))}
            onEnChange={v => setItemForm(f => ({ ...f, item: { ...f.item, en: v } }))}
            placeholder={lang === 'zh-TW' ? '例如：泳衣' : 'e.g. Swimsuit'}
          />
          <div className="space-y-1">
            <label className="text-secondary text-sm">{t('packing.selectCategory')}</label>
            <div className="flex flex-wrap gap-2">
              {activeCategories.map(cat => (
                <button key={cat.id} type="button"
                  onClick={() => setItemForm(f => ({ ...f, categoryId: cat.id }))}
                  className="px-3 py-1.5 rounded-full text-sm border"
                  style={{
                    background:  itemForm.categoryId === cat.id ? 'var(--accent)' : 'var(--mini-bg)',
                    color:       itemForm.categoryId === cat.id ? 'white'         : 'var(--text-secondary)',
                    borderColor: itemForm.categoryId === cat.id ? 'var(--accent)' : 'var(--mini-border)',
                  }}
                >{bi(cat.name, lang)}</button>
              ))}
            </div>
          </div>
        </InlineForm>
      )}

      {items.length === 0 && activeCategories.length === 0 && (
        <p className="text-secondary text-center py-8">{t('packing.noData')}</p>
      )}

      {/* Category list */}
      <div className="space-y-5">
        {activeCategories.map(cat => {
          const catItems = items.filter(i => (i.categoryId || i.category) === cat.id)
          const catChecked = catItems.filter(i => i.checked).length
          return (
            <section key={cat.id}>
              {/* Category header */}
              <div className="flex items-center justify-between mb-2 px-1">
                <div>
                  <span className="text-primary font-medium text-sm">{bi(cat.name, lang)}</span>
                  <span className="text-secondary text-xs ml-2">{catChecked}/{catItems.length}</span>
                </div>
                {canEditGeneral && (
                  <CategoryMenu
                    onAddItem={() => openItemForm(cat.id)}
                    onEdit={() => openCategoryForm(cat)}
                    onDelete={() => requestDeleteCategory(cat)}
                  />
                )}
              </div>

              {/* Items */}
              <div className="space-y-2">
                {catItems.map(item => (
                  <SwipeableItemRow
                    key={item.id}
                    item={item}
                    lang={lang}
                    canEdit={canEditGeneral}
                    onToggle={() => updateItem(item.id, { checked: !item.checked })}
                    onEdit={() => openItemForm(cat.id, item)}
                    onDelete={() => setDelTarget({ type: 'item', id: item.id })}
                  />
                ))}
                {catItems.length === 0 && (
                  <button
                    className="w-full glass-mini p-3 text-secondary text-sm text-center rounded-xl"
                    style={{ border: '1px dashed var(--mini-border)' }}
                    onClick={() => canEditGeneral && openItemForm(cat.id)}
                  >
                    {t('packing.addItem')}
                  </button>
                )}
              </div>
            </section>
          )
        })}
      </div>

      {delTarget && (
        <ConfirmDialog onConfirm={confirmDelete} onCancel={() => setDelTarget(null)} />
      )}
    </div>
  )
}
