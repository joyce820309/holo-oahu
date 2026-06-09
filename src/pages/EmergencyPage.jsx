import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Phone, Plus, Trash2 } from 'lucide-react'
import { useEmergencyContacts } from '../hooks/useEmergencyContacts'
import toast from 'react-hot-toast'

const STATIC_INFO = {
  hawaii: [
    { label: '緊急 / Emergency',               en: 'Emergency',               phone: '911' },
    { label: '非緊急警察 / Non-emergency',      en: 'Non-emergency Police',    phone: '(808) 529-3111' },
    { label: '皇后醫療中心 / Queen\'s Medical', en: 'Queen\'s Medical Center', phone: '(808) 538-9011' },
    { label: '台灣駐檀香山辦事處',              en: 'Taiwan Consulate Honolulu',phone: '(808) 595-6347' },
  ],
  seoul: [
    { label: '警察 / Police',          en: 'Police',        phone: '112' },
    { label: '救護 / Ambulance',       en: 'Ambulance',     phone: '119' },
    { label: '旅遊警察（英語）',        en: 'Tourist Police',phone: '1330' },
    { label: '台灣駐首爾辦事處',        en: 'Taiwan Mission Seoul', phone: '02-399-2780' },
  ],
  transit: [
    { label: '仁川機場服務台 / Incheon Airport', en: 'Incheon Airport',      phone: '1577-2600' },
  ],
  taiwan: [
    { label: '外交部緊急電話',           en: 'MOFA Emergency', phone: '+886-2-2348-2999' },
  ],
}

export default function EmergencyPage() {
  const { t, i18n } = useTranslation()
  const { contacts, addContact, deleteContact } = useEmergencyContacts()
  const lang = i18n.language
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', relation: '', note: '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleAdd = async () => {
    if (!form.name || !form.phone) { toast.error('請填寫姓名和電話'); return }
    try {
      await addContact(form)
      setForm({ name: '', phone: '', relation: '', note: '' })
      setShowForm(false)
      toast.success('已新增')
    } catch { toast.error('新增失敗') }
  }

  const sections = [
    { key: 'hawaii',  titleKey: 'emergency.hawaii' },
    { key: 'seoul',   titleKey: 'emergency.seoul' },
    { key: 'transit', titleKey: 'emergency.korea_transit' },
    { key: 'taiwan',  titleKey: 'emergency.taiwan' },
  ]

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
    <div className="px-4 pb-24">
      <h2 className="text-primary font-medium text-xl py-4">{t('emergency.title')}</h2>

      {sections.map(({ key, titleKey }) => (
        <div key={key} className="mb-5">
          <p className="text-secondary text-sm font-medium mb-2">{t(titleKey)}</p>
          <div className="glass-card divide-y" style={{ borderColor: 'var(--glass-border)' }}>
            {STATIC_INFO[key].map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-primary text-sm">{lang === 'zh-TW' ? item.label : item.en}</p>
                  <p className="text-secondary text-xs">{item.phone}</p>
                </div>
                <a
                  href={`tel:${item.phone.replace(/[^+\d]/g, '')}`}
                  className="flex items-center gap-1 text-accent text-sm font-medium"
                  style={{ minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}
                >
                  <Phone size={16} />
                </a>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Custom contacts */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-secondary text-sm font-medium">{t('emergency.custom')}</p>
          <button className="btn-primary text-sm px-3 py-1.5" style={{ minHeight: 36 }}
            onClick={() => setShowForm(s => !s)}>
            <Plus size={14} />{t('emergency.addContact')}
          </button>
        </div>

        {showForm && (
          <div className="glass-card p-4 mb-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('emergency.fields.name')}     k="name" />
              <Input label={t('emergency.fields.phone')}    k="phone" type="tel" />
              <Input label={t('emergency.fields.relation')} k="relation" />
              <Input label={t('emergency.fields.note')}     k="note" />
            </div>
            <div className="flex gap-3 pt-1">
              <button className="btn-ghost flex-1 justify-center" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
              <button className="btn-primary flex-1 justify-center" onClick={handleAdd}>{t('common.save')}</button>
            </div>
          </div>
        )}

        {contacts.length > 0 && (
          <div className="glass-card divide-y" style={{ borderColor: 'var(--glass-border)' }}>
            {contacts.map(c => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-primary text-sm">{c.name} {c.relation && `· ${c.relation}`}</p>
                  <p className="text-secondary text-xs">{c.phone}</p>
                  {c.note && <p className="text-secondary text-xs">{c.note}</p>}
                </div>
                <div className="flex gap-2">
                  <a href={`tel:${c.phone.replace(/[^+\d]/g, '')}`}
                    className="text-accent p-2" style={{ minHeight: 44 }}>
                    <Phone size={16} />
                  </a>
                  <button className="text-secondary p-2" onClick={() => deleteContact(c.id)} style={{ minHeight: 44 }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
