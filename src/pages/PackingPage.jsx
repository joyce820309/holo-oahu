import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, PackagePlus, Pencil, Settings2, ShoppingBag, Square, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePacking } from '../hooks/usePacking'
import { useShopping } from '../hooks/useShopping'
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

// ── Swipeable packing item row ─────────────────────────────────────────────

const ACTION_W = 112

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

  useEffect(() => {
    if (offset === 0) return
    const h = () => setOffset(0)
    document.addEventListener('touchstart', h, { passive: true })
    return () => document.removeEventListener('touchstart', h)
  }, [offset])

  return (
    <div ref={rowRef} style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
      {canEdit && offset < 0 && (
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: ACTION_W, display: 'flex' }}>
          <button
            className="flex-1 flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--accent) 90%, black)', color: 'white' }}
            onMouseDown={e => { e.stopPropagation(); setOffset(0); onEdit() }}
          >
            <Pencil size={16} />
          </button>
          <button
            className="flex-1 flex items-center justify-center"
            style={{ background: 'var(--danger)', color: 'white', borderRadius: '0 12px 12px 0' }}
            onMouseDown={e => { e.stopPropagation(); setOffset(0); onDelete() }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
      <div
        className={`glass-mini p-3 flex items-start justify-between ${item.checked ? 'opacity-60' : ''}`}
        style={{ transform: `translateX(${offset}px)`, transition: isDragging.current ? 'none' : 'transform 0.2s ease', position: 'relative', zIndex: 1 }}
      >
        <button className="flex items-start gap-3 flex-1 min-h-[44px] text-left" onClick={onToggle}>
          {item.checked
            ? <Check size={20} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
            : <Square size={20} style={{ color: 'var(--text-secondary)', flexShrink: 0, marginTop: 2 }} />
          }
          <div>
            <span className={`text-base ${item.checked ? 'line-through text-secondary' : 'text-primary'}`}>
              {bi(item.item, lang)}
            </span>
            {item.notes ? <p className="text-secondary text-xs mt-0.5">{item.notes}</p> : null}
          </div>
        </button>
        {canEdit && (
          <div className="hidden md:flex gap-1 ml-2">
            <button className="text-secondary p-1.5 rounded-lg" style={{ transition: 'opacity 0.15s' }} onMouseEnter={e => e.currentTarget.style.opacity='0.5'} onMouseLeave={e => e.currentTarget.style.opacity='1'} onClick={onEdit}><Pencil size={14} /></button>
            <button className="p-1.5 rounded-lg" style={{ color: 'var(--danger)', transition: 'opacity 0.15s' }} onMouseEnter={e => e.currentTarget.style.opacity='0.5'} onMouseLeave={e => e.currentTarget.style.opacity='1'} onClick={onDelete}><Trash2 size={14} /></button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Packing item form ──────────────────────────────────────────────────────

function ItemForm({ categories, defaultCategoryId, lang, editingItem, onSave, onCancel }) {
  const [inputLang, setInputLang] = useState('zh')
  const [form, setForm] = useState(() => editingItem
    ? {
        item: editingItem.item || { zh: '', en: '' },
        categoryId: editingItem.categoryId || editingItem.category || defaultCategoryId,
        notes: editingItem.notes || '',
      }
    : { item: { zh: '', en: '' }, categoryId: defaultCategoryId, notes: '' }
  )

  return (
    <div className="glass-card p-4 mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-primary font-medium text-sm">{editingItem ? '編輯項目' : '新增項目'}</p>
        <button className="text-secondary p-1 rounded-lg" onClick={onCancel}><X size={17} /></button>
      </div>

      <BilingualField
        label="項目名稱"
        inputLang={inputLang} setInputLang={setInputLang}
        zhValue={form.item.zh} enValue={form.item.en}
        onZhChange={v => setForm(f => ({ ...f, item: { ...f.item, zh: v } }))}
        onEnChange={v => setForm(f => ({ ...f, item: { ...f.item, en: v } }))}
        placeholder={lang === 'zh-TW' ? '例如：護照' : 'e.g. Passport'}
      />

      <div className="space-y-1">
        <label className="text-secondary text-sm">類別</label>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button key={cat.id} type="button"
              onClick={() => setForm(f => ({ ...f, categoryId: cat.id }))}
              className="px-3 py-1.5 rounded-full text-sm border"
              style={{
                background:  form.categoryId === cat.id ? 'var(--accent)' : 'var(--mini-bg)',
                color:       form.categoryId === cat.id ? 'white'         : 'var(--text-secondary)',
                borderColor: form.categoryId === cat.id ? 'var(--accent)' : 'var(--mini-border)',
              }}
            >{bi(cat.name, lang)}</button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-secondary text-sm">備註</label>
        <input
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="選填"
          className="w-full glass-mini px-3 py-2.5 text-primary text-base outline-none rounded-xl"
          style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button className="btn-ghost flex-1 justify-center" onClick={onCancel}>取消</button>
        <button className="btn-primary flex-1 justify-center" onClick={() => onSave(form)}>儲存</button>
      </div>
    </div>
  )
}

// ── Shopping item form ─────────────────────────────────────────────────────

function ShoppingForm({ editingItem, onSave, onCancel }) {
  const [form, setForm] = useState(() => editingItem
    ? { brand: editingItem.brand || '', item: editingItem.item || '', notes: editingItem.notes || '' }
    : { brand: '', item: '', notes: '' }
  )

  const field = (key, label, placeholder) => (
    <div className="space-y-1">
      <label className="text-secondary text-sm">{label}</label>
      <input
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full glass-mini px-3 py-2.5 text-primary text-base outline-none rounded-xl"
        style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
      />
    </div>
  )

  return (
    <div className="glass-card p-4 mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-primary font-medium text-sm">{editingItem ? '編輯品項' : '新增品項'}</p>
        <button className="text-secondary p-1 rounded-lg" onClick={onCancel}><X size={17} /></button>
      </div>
      {field('brand', '品牌', '選填')}
      {field('item',  '品項', '必填，夏威夷豆')}
      {field('notes', '備註', '選填，例如：口味')}
      <div className="flex gap-3 pt-1">
        <button className="btn-ghost flex-1 justify-center" onClick={onCancel}>取消</button>
        <button className="btn-primary flex-1 justify-center" onClick={() => onSave(form)}>儲存</button>
      </div>
    </div>
  )
}

// ── Shopping item row ──────────────────────────────────────────────────────

function ShoppingRow({ item, canEdit, onEdit, onDelete }) {
  return (
    <div className="glass-mini p-3 flex items-start justify-between" style={{ borderRadius: 12 }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          {item.brand ? (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent-soft, color-mix(in srgb, var(--accent) 15%, transparent))', color: 'var(--accent)' }}>
              {item.brand}
            </span>
          ) : null}
          <span className="text-primary text-base font-medium">{item.item}</span>
        </div>
        {item.notes ? <p className="text-secondary text-xs mt-1">{item.notes}</p> : null}
      </div>
      {canEdit && (
        <div className="flex gap-1 ml-2 shrink-0">
          <button className="text-secondary p-1.5 rounded-lg" style={{ transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity='0.5'}
            onMouseLeave={e => e.currentTarget.style.opacity='1'}
            onClick={onEdit}><Pencil size={14} /></button>
          <button className="p-1.5 rounded-lg" style={{ color: 'var(--danger)', transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity='0.5'}
            onMouseLeave={e => e.currentTarget.style.opacity='1'}
            onClick={onDelete}><Trash2 size={14} /></button>
        </div>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function PackingPage() {
  const { t, i18n } = useTranslation()
  const { items, categories, loading: loadingPacking, addItem, updateItem, deleteItem } = usePacking()
  const { items: shopItems, loading: loadingShopping, addItem: addShopItem, updateItem: updateShopItem, deleteItem: deleteShopItem } = useShopping()

  const [tab, setTab] = useState('packing')

  // packing state
  const [showItemForm, setShowItemForm]   = useState(false)
  const [editingItem, setEditingItem]     = useState(null)
  const [delTarget, setDelTarget]         = useState(null)

  // shopping state
  const [showShopForm, setShowShopForm]   = useState(false)
  const [editingShop, setEditingShop]     = useState(null)
  const [delShop, setDelShop]             = useState(null)

  const lang = i18n.language

  const categoriesWithItems = useMemo(
    () => categories.filter(cat => items.some(i => (i.categoryId || i.category) === cat.id)),
    [categories, items]
  )

  const defaultCategoryId = categories.find(c => c.id === 'documents')?.id || categories[0]?.id || ''
  const checkedCount = items.filter(i => i.checked).length

  const openAdd  = () => { setEditingItem(null); setShowItemForm(true) }
  const openEdit = (item) => { setEditingItem(item); setShowItemForm(true) }
  const closeForm = () => { setShowItemForm(false); setEditingItem(null) }

  const saveItem = async (form) => {
    if (!form.item.zh && !form.item.en) { toast.error('請輸入項目名稱'); return }
    if (!form.categoryId) { toast.error('請選擇類別'); return }
    const data = {
      item: form.item,
      categoryId: form.categoryId,
      category: form.categoryId,
      notes: form.notes || '',
      checked: editingItem ? (editingItem.checked || false) : false,
    }
    try {
      if (editingItem) await updateItem(editingItem.id, data)
      else await addItem(data)
      closeForm()
      toast.success('已儲存')
    } catch { toast.error('儲存失敗') }
  }

  const openAddShop  = () => { setEditingShop(null); setShowShopForm(true) }
  const openEditShop = (item) => { setEditingShop(item); setShowShopForm(true) }
  const closeShopForm = () => { setShowShopForm(false); setEditingShop(null) }

  const saveShopItem = async (form) => {
    if (!form.item) { toast.error('請輸入品項名稱'); return }
    const data = { brand: form.brand || '', item: form.item, notes: form.notes || '' }
    try {
      if (editingShop) await updateShopItem(editingShop.id, data)
      else await addShopItem(data)
      closeShopForm()
      toast.success('已儲存')
    } catch { toast.error('儲存失敗') }
  }

  const loading = loadingPacking || loadingShopping

  if (loading) return (
    <div className="px-4 pb-36">
      <div className="py-4"><h2 className="text-primary font-medium text-xl">{t('packing.title')}</h2></div>
      <PackingSkeleton />
    </div>
  )

  return (
    <div className="px-4 pb-36">
      {/* Header */}
      <div className="flex items-center justify-between py-4">
        <div>
          <h2 className="text-primary font-medium text-xl">{tab === 'packing' ? t('packing.title') : '必買清單'}</h2>
          {tab === 'packing'
            ? <p className="text-secondary text-sm">{checkedCount}/{items.length}</p>
            : <p className="text-secondary text-sm">{shopItems.length} 項</p>
          }
        </div>
        <div className="flex gap-2">
          {tab === 'packing' && (
            <>
              <Link to="/trip/packing/categories" className="btn-ghost px-3" title="管理類別">
                <Settings2 size={17} />
              </Link>
              <button className="btn-primary" onClick={openAdd}>
                <PackagePlus size={18} />{t('packing.new')}
              </button>
            </>
          )}
          {tab === 'shopping' && (
            <button className="btn-primary" onClick={openAddShop}>
              <ShoppingBag size={18} />新增品項
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5">
        {[
          { key: 'packing',  label: '打包' },
          { key: 'shopping', label: '必買' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            style={tab === key
              ? { background: 'var(--accent)', color: 'white' }
              : { color: 'var(--text-secondary)' }
            }
          >{label}</button>
        ))}
      </div>

      {/* ── Packing tab ── */}
      {tab === 'packing' && (
        <>
          {showItemForm && (
            <ItemForm
              categories={categories}
              defaultCategoryId={defaultCategoryId}
              lang={lang}
              editingItem={editingItem}
              onSave={saveItem}
              onCancel={closeForm}
            />
          )}

          {items.length === 0 && (
            <p className="text-secondary text-center py-8">{t('packing.noData')}</p>
          )}

          <div className="space-y-5">
            {categoriesWithItems.map(cat => {
              const catItems = items.filter(i => (i.categoryId || i.category) === cat.id)
              const catChecked = catItems.filter(i => i.checked).length
              return (
                <section key={cat.id}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div>
                      <span className="text-primary font-medium text-sm">{bi(cat.name, lang)}</span>
                      <span className="text-secondary text-xs ml-2">{catChecked}/{catItems.length}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {catItems.map(item => (
                      <SwipeableItemRow
                        key={item.id}
                        item={item}
                        lang={lang}
                        canEdit={true}
                        onToggle={() => updateItem(item.id, { checked: !item.checked })}
                        onEdit={() => openEdit(item)}
                        onDelete={() => setDelTarget({ type: 'item', id: item.id })}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>

          {delTarget && (
            <ConfirmDialog
              onConfirm={async () => {
                try { await deleteItem(delTarget.id) } catch { toast.error('刪除失敗') }
                setDelTarget(null)
              }}
              onCancel={() => setDelTarget(null)}
            />
          )}
        </>
      )}

      {/* ── Shopping tab ── */}
      {tab === 'shopping' && (
        <>
          {showShopForm && (
            <ShoppingForm
              editingItem={editingShop}
              onSave={saveShopItem}
              onCancel={closeShopForm}
            />
          )}

          {shopItems.length === 0 && (
            <p className="text-secondary text-center py-8">尚無必買清單</p>
          )}

          <div className="space-y-2">
            {shopItems.map(item => (
              <ShoppingRow
                key={item.id}
                item={item}
                canEdit={true}
                onEdit={() => openEditShop(item)}
                onDelete={() => setDelShop(item)}
              />
            ))}
          </div>

          {delShop && (
            <ConfirmDialog
              onConfirm={async () => {
                try { await deleteShopItem(delShop.id); toast.success('已刪除') }
                catch { toast.error('刪除失敗') }
                setDelShop(null)
              }}
              onCancel={() => setDelShop(null)}
            />
          )}
        </>
      )}
    </div>
  )
}
