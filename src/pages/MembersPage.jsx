import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { doc, setDoc } from 'firebase/firestore'
import { Copy, Check, UserMinus } from 'lucide-react'
import { useTrip } from '../hooks/useTrip'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/firebase'
import toast from 'react-hot-toast'

const ROLES = ['owner', 'admin', 'editor', 'viewer']

export default function MembersPage() {
  const { t } = useTranslation()
  const { user, canManageMembers } = useAuth()
  const { trip, updateTrip } = useTrip()
  const [copied, setCopied] = useState(false)

  const inviteLink = trip
    ? `${window.location.origin}/join/${trip.settings?.inviteCode}`
    : ''

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true)
      toast.success(t('common.copied'))
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const syncUserRole = (uid, role) => (
    setDoc(doc(db, 'users', uid), { role }, { merge: true })
  )

  const changeRole = async (uid, role) => {
    if (!trip) return
    const members = trip.members.map(m => m.uid === uid ? { ...m, role } : m)
    await updateTrip({ members })
    await syncUserRole(uid, role)
  }

  const removeMember = async (uid) => {
    if (!trip) return
    const members = trip.members.filter(m => m.uid !== uid)
    await updateTrip({ members })
    await syncUserRole(uid, 'viewer')
    toast.success(t('common.delete'))
  }

  return (
    <div className="px-4 pb-24">
      <h2 className="text-primary font-medium text-xl py-4">{t('members.title')}</h2>

      <div className="glass-card p-4 mb-4">
        <p className="text-secondary text-sm mb-2">{t('members.invite')}</p>
        <div className="flex gap-2">
          <div className="glass-mini flex-1 px-3 py-2.5 text-secondary text-sm truncate rounded-xl">
            {trip?.settings?.inviteCode ? `.../${trip.settings.inviteCode}` : '-'}
          </div>
          <button className="btn-primary" onClick={copyInvite}>
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {t('members.copy')}
          </button>
        </div>
      </div>

      <div className="glass-card divide-y" style={{ borderColor: 'var(--glass-border)' }}>
        {trip?.members?.map(member => (
          <div key={member.uid} className="flex items-center gap-3 px-4 py-3">
            {member.photoURL
              ? <img src={member.photoURL} alt="" className="w-10 h-10 rounded-full" />
              : <div className="w-10 h-10 rounded-full glass-mini flex items-center justify-center text-primary font-medium">
                  {(member.displayName || member.email || '?')[0].toUpperCase()}
                </div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-primary text-sm font-medium truncate">{member.displayName || member.email}</p>
              <p className="text-secondary text-xs">{member.email}</p>
            </div>
            {canManageMembers && member.uid !== user?.uid ? (
              <div className="flex gap-2">
                <select
                  value={member.role}
                  onChange={e => changeRole(member.uid, e.target.value)}
                  className="text-xs glass-mini px-2 py-1.5 rounded-lg outline-none"
                  style={{ background: 'var(--mini-bg)', color: 'var(--text-primary)', border: '0.5px solid var(--mini-border)' }}
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{t(`members.roles.${r}`)}</option>
                  ))}
                </select>
                <button className="text-secondary p-2" style={{ minHeight: 44 }} onClick={() => removeMember(member.uid)}>
                  <UserMinus size={16} />
                </button>
              </div>
            ) : (
              <span className="text-secondary text-xs">{t(`members.roles.${member.role}`)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
