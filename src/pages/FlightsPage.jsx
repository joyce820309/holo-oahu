import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Plane, ChevronRight, ChevronDown, X } from 'lucide-react'
import { useFlights } from '../hooks/useFlights'
import ConfirmDialog from '../components/ConfirmDialog'
import ImageUploader from '../components/ImageUploader'
import toast from 'react-hot-toast'

const TZ_LABELS = { TPE: 'CST', ICN: 'KST', HNL: 'HST', GMP: 'KST' }

const emptyForm = () => ({
  flightNo: '', airline: '', from: '', to: '',
  departAt: '', arriveAt: '', seat: '', confirmCode: '', note: '', images: [],
})

function FlightForm({ initial, onSave, onCancel, id }) {
  const { t } = useTranslation()
  const [form, setForm] = useState(initial || emptyForm())
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const Input = ({ label, k, type = 'text' }) => (
    <div className="space-y-1">
      <label className="text-secondary text-sm">{label}</label>
      <input type={type} value={form[k]} onChange={e => set(k, e.target.value)}
        className="w-full glass-mini px-3 py-2.5 text-primary text-base outline-none rounded-xl"
        style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
      />
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label={t('flights.fields.flightNo')}    k="flightNo" />
        <Input label={t('flights.fields.airline')}     k="airline" />
        <Input label={t('flights.fields.from')}        k="from" />
        <Input label={t('flights.fields.to')}          k="to" />
        <Input label={t('flights.fields.departAt')}    k="departAt"    type="datetime-local" />
        <Input label={t('flights.fields.arriveAt')}    k="arriveAt"    type="datetime-local" />
        <Input label={t('flights.fields.seat')}        k="seat" />
        <Input label={t('flights.fields.confirmCode')} k="confirmCode" />
      </div>
      <Input label={t('flights.fields.note')} k="note" />
      <ImageUploader
        images={form.images}
        onChange={urls => set('images', urls)}
        storagePath={`trips/holo-oahu-2025/flights/${id || 'new'}`}
      />
      <div className="flex gap-3 pt-2">
        <button className="btn-ghost flex-1 justify-center" onClick={onCancel}>{t('common.cancel')}</button>
        <button className="btn-primary flex-1 justify-center" onClick={() => onSave(form)}>{t('common.save')}</button>
      </div>
    </div>
  )
}

export default function FlightsPage() {
  const { t } = useTranslation()
  const { flights, loading, addFlight, updateFlight, deleteFlight } = useFlights()
  const [showForm, setShowForm]   = useState(false)
  const [editId, setEditId]       = useState(null)
  const [delId, setDelId]         = useState(null)

  const handleSave = async (form) => {
    try {
      if (editId) { await updateFlight(editId, form); setEditId(null) }
      else        { await addFlight(form); setShowForm(false) }
      toast.success(t('common.save'))
    } catch { toast.error('儲存失敗') }
  }

  const fmtDT = (dt) => {
    if (!dt) return ''
    return new Date(dt).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="px-4 pb-24">
      <div className="flex items-center justify-between py-4">
        <h2 className="text-primary font-medium text-xl">{t('flights.title')}</h2>
        <button className="btn-primary" onClick={() => setShowForm(s => !s)}>
          <Plus size={18} />{t('flights.new')}
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-4 mb-4">
          <FlightForm onSave={handleSave} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {loading && <p className="text-secondary text-center py-8">{t('common.loading')}</p>}
      {!loading && flights.length === 0 && !showForm && (
        <p className="text-secondary text-center py-8">{t('flights.noData')}</p>
      )}

      <div className="space-y-3">
        {flights.map(f => (
          <div key={f.id} className="glass-card p-4">
            {editId === f.id ? (
              <FlightForm
                initial={f}
                onSave={handleSave}
                onCancel={() => setEditId(null)}
                id={f.id}
              />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Plane size={20} style={{ color: 'var(--accent)' }} />
                    <div>
                      <p className="text-primary font-medium">{f.flightNo} · {f.airline}</p>
                      <p className="text-secondary text-sm">{f.from} → {f.to}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-ghost text-xs px-2 py-1" style={{ minHeight: 36 }} onClick={() => setEditId(f.id)}>{t('common.edit')}</button>
                    <button className="text-secondary text-xs p-2" onClick={() => setDelId(f.id)}>{t('common.delete')}</button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="glass-mini p-2">
                    <p className="text-secondary text-xs">{t('flights.fields.departAt')}</p>
                    <p className="text-primary text-sm">{fmtDT(f.departAt)}</p>
                  </div>
                  <div className="glass-mini p-2">
                    <p className="text-secondary text-xs">{t('flights.fields.arriveAt')}</p>
                    <p className="text-primary text-sm">{fmtDT(f.arriveAt)}</p>
                  </div>
                </div>
                {f.seat && <p className="text-secondary text-sm mt-2">{t('flights.fields.seat')}: {f.seat}</p>}
                {f.confirmCode && <p className="text-secondary text-sm">{t('flights.fields.confirmCode')}: {f.confirmCode}</p>}
                {f.images?.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {f.images.map(url => <img key={url} src={url} alt="" className="w-16 h-16 object-cover rounded-lg" />)}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {delId && (
        <ConfirmDialog
          onConfirm={() => { deleteFlight(delId); setDelId(null) }}
          onCancel={() => setDelId(null)}
        />
      )}
    </div>
  )
}
