import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Car, Trash2, Pencil, MapPin, Phone, ShieldCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCarRentals } from '../hooks/useCarRentals'
import ConfirmDialog from '../components/ConfirmDialog'
import NoteContent from '../components/NoteContent'
import toast from 'react-hot-toast'

function InputField({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="space-y-1">
      <label className="text-secondary text-sm">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full glass-mini px-3 py-2.5 text-primary text-base outline-none rounded-xl"
        style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
      />
    </div>
  )
}

const emptyForm = () => ({
  companyName: '',
  address: '',
  phone: '',
  note: '',
  pickupAt: '',
  returnAt: '',
  carClass: '',
  reservationNo: '',
  insurancePolicy: '',
  fuelPolicy: '',
})

function CarRentalForm({ initial, onSave, onCancel }) {
  const { t } = useTranslation()
  const [form, setForm] = useState(initial ? { ...emptyForm(), ...initial } : emptyForm())
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 space-y-3">
        <InputField label={t('carRental.fields.companyName')} value={form.companyName} onChange={v => set('companyName', v)} placeholder="Hertz / Avis / Enterprise" />
        <InputField label={t('carRental.fields.address')} value={form.address} onChange={v => set('address', v)} placeholder="Honolulu Airport ..." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField label={t('carRental.fields.phone')} value={form.phone} onChange={v => set('phone', v)} type="tel" placeholder="+1-808-..." />
          <InputField label={t('carRental.fields.reservationNo')} value={form.reservationNo} onChange={v => set('reservationNo', v)} placeholder="ABC123" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField label={t('carRental.fields.pickupAt')} value={form.pickupAt} onChange={v => set('pickupAt', v)} type="datetime-local" />
          <InputField label={t('carRental.fields.returnAt')} value={form.returnAt} onChange={v => set('returnAt', v)} type="datetime-local" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField label={t('carRental.fields.carClass')} value={form.carClass} onChange={v => set('carClass', v)} placeholder={t('carRental.suggest.carClass')} />
          <InputField label={t('carRental.fields.insurancePolicy')} value={form.insurancePolicy} onChange={v => set('insurancePolicy', v)} placeholder={t('carRental.suggest.insurance')} />
        </div>
        <InputField label={t('carRental.fields.fuelPolicy')} value={form.fuelPolicy} onChange={v => set('fuelPolicy', v)} placeholder={t('carRental.suggest.fuel')} />
        <div className="space-y-1">
          <label className="text-secondary text-sm">{t('carRental.fields.note')}</label>
          <textarea
            value={form.note}
            onChange={e => set('note', e.target.value)}
            rows={4}
            className="w-full glass-mini px-3 py-2.5 text-primary text-base outline-none rounded-xl resize-y"
            style={{ background: 'var(--mini-bg)', border: '0.5px solid var(--mini-border)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button className="btn-ghost flex-1 justify-center" onClick={onCancel}>{t('common.cancel')}</button>
        <button className="btn-primary flex-1 justify-center" onClick={() => onSave(form)}>{t('common.save')}</button>
      </div>
    </div>
  )
}

export default function CarRentalPage() {
  const { t } = useTranslation()
  const { canEditTravel } = useAuth()
  const { carRentals, loading, addCarRental, updateCarRental, deleteCarRental } = useCarRentals()

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [delId, setDelId] = useState(null)

  const fmtDateTime = (value) => {
    if (!value) return ''
    const d = new Date(value)
    if (isNaN(d)) return value
    return d.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const openMap = (address) => {
    if (!address) return
    window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`)
  }

  const handleSave = async (form) => {
    if (!form.companyName.trim()) {
      toast.error(t('carRental.errors.companyNameRequired'))
      return
    }
    const data = { ...form }
    try {
      if (editId) {
        await updateCarRental(editId, data)
        setEditId(null)
      } else {
        await addCarRental(data)
        setShowForm(false)
      }
      toast.success(t('carRental.saved'))
    } catch {
      toast.error(t('carRental.saveFailed'))
    }
  }

  return (
    <div className="px-4 pb-36">
      <div className="flex items-center justify-between py-4">
        <h2 className="text-primary font-medium text-xl">{t('carRental.title')}</h2>
        {canEditTravel && (
          <button className="btn-primary" onClick={() => { setShowForm(v => !v); setEditId(null) }}>
            <Plus size={18} />{t('carRental.new')}
          </button>
        )}
      </div>

      <div className="glass-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={16} className="text-accent" />
          <p className="text-primary font-medium text-sm">{t('carRental.tipsTitle')}</p>
        </div>
        <ul className="list-disc pl-5 space-y-1 text-secondary text-sm">
          <li>{t('carRental.tips.insurance')}</li>
          <li>{t('carRental.tips.fuel')}</li>
          <li>{t('carRental.tips.pickup')}</li>
          <li>{t('carRental.tips.parking')}</li>
        </ul>
      </div>

      {showForm && (
        <div className="mb-4">
          <CarRentalForm onSave={handleSave} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {!loading && carRentals.length === 0 && !showForm && (
        <p className="text-secondary text-center py-8">{t('carRental.noData')}</p>
      )}

      <div className="space-y-3">
        {carRentals.map((item) => (
          <div key={item.id}>
            {editId === item.id ? (
              <CarRentalForm initial={item} onSave={handleSave} onCancel={() => setEditId(null)} />
            ) : (
              <div className="glass-card p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg glass-mini flex-shrink-0 mt-0.5">
                    <Car size={18} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-primary font-medium text-base leading-snug">{item.companyName}</p>
                    {item.address && (
                      <button className="flex items-center gap-1 mt-1 text-secondary text-sm" onClick={() => openMap(item.address)}>
                        <MapPin size={12} />
                        <span className="truncate text-left">{item.address}</span>
                      </button>
                    )}
                    {item.phone && (
                      <a className="flex items-center gap-1 mt-1 text-secondary text-sm" href={`tel:${item.phone}`}>
                        <Phone size={12} />
                        <span>{item.phone}</span>
                      </a>
                    )}

                    {(item.pickupAt || item.returnAt) && (
                      <p className="text-secondary text-xs mt-2">
                        {item.pickupAt ? `${t('carRental.fields.pickupAt')} ${fmtDateTime(item.pickupAt)}` : ''}
                        {item.pickupAt && item.returnAt ? ' · ' : ''}
                        {item.returnAt ? `${t('carRental.fields.returnAt')} ${fmtDateTime(item.returnAt)}` : ''}
                      </p>
                    )}

                    {(item.carClass || item.reservationNo) && (
                      <p className="text-secondary text-xs mt-1">
                        {item.carClass ? `${t('carRental.fields.carClass')} ${item.carClass}` : ''}
                        {item.carClass && item.reservationNo ? ' · ' : ''}
                        {item.reservationNo ? `${t('carRental.fields.reservationNo')} ${item.reservationNo}` : ''}
                      </p>
                    )}

                    {item.note && (
                      <div className="mt-2">
                        <NoteContent text={item.note} className="text-secondary text-sm leading-relaxed" />
                      </div>
                    )}
                  </div>
                  {canEditTravel && (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        className="p-1.5 rounded-lg"
                        style={{ color: 'var(--text-secondary)', transition: 'opacity 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.5'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        onClick={() => { setEditId(item.id); setShowForm(false) }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="p-1.5 rounded-lg"
                        style={{ color: '#e05555', transition: 'opacity 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.5'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        onClick={() => setDelId(item.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {delId && (
        <ConfirmDialog
          onConfirm={async () => {
            try {
              await deleteCarRental(delId)
              toast.success(t('common.delete'))
            } catch {
              toast.error(t('carRental.deleteFailed'))
            }
            setDelId(null)
          }}
          onCancel={() => setDelId(null)}
        />
      )}
    </div>
  )
}