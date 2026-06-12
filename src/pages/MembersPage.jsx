import { useTranslation } from 'react-i18next'
import { doc, setDoc } from 'firebase/firestore'
import { UserMinus, Crown, ShieldCheck, Users } from 'lucide-react'
import { useTrip } from '../hooks/useTrip'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/firebase'
import toast from 'react-hot-toast'

const ROLES = ['owner', 'admin', 'editor', 'viewer']

const ROLE_META = {
  owner:  { Icon: Crown,       color: '#f59e0b', label: { zh: '擁有者', en: 'Owner'  } },
  admin:  { Icon: ShieldCheck, color: '#6366f1', label: { zh: '管理員', en: 'Admin'  } },
  editor: { Icon: Users,       color: '#10b981', label: { zh: '編輯者', en: 'Editor' } },
  viewer: { Icon: Users,       color: '#94a3b8', label: { zh: '檢視者', en: 'Viewer' } },
}

function RoleBadge({ role, lang }) {
  const meta = ROLE_META[role] || ROLE_META.viewer
  const label = lang === 'zh-TW' ? meta.label.zh : meta.label.en
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
      style={{
        background: `color-mix(in srgb, ${meta.color} 15%, transparent)`,
        color: meta.color,
        border: `0.5px solid color-mix(in srgb, ${meta.color} 40%, transparent)`,
      }}
    >
      <meta.Icon size={10} />
      {label}
    </span>
  )
}

function Avatar({ member }) {
  if (member.photoURL) {
    return <img src={member.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />
  }
  const initial = (member.displayName || member.email || '?')[0].toUpperCase()
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
      style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent)' }}
    >
      {initial}
    </div>
  )
}

export default function MembersPage() {
  const { t, i18n } = useTranslation()
  const { user, canManageMembers } = useAuth()
  const { trip, updateTrip } = useTrip()
  const lang = i18n.language

  const syncUserRole = (uid, role) =>
    setDoc(doc(db, 'users', uid), { role }, { merge: true })

  const changeRole = async (uid, newRole) => {
    if (!trip) return
    const members = trip.members.map(m => m.uid === uid ? { ...m, role: newRole } : m)
    await updateTrip({ members })
    await syncUserRole(uid, newRole)
  }

  const removeMember = async (uid) => {
    if (!trip) return
    const members = trip.members.filter(m => m.uid !== uid)
    await updateTrip({ members })
    await syncUserRole(uid, 'viewer')
    toast.success('已移除成員')
  }

  const members = trip?.members || []

  return (
    <div className="px-4 pb-24">
      <h2 className="text-primary font-medium text-xl py-4">{t('members.title')}</h2>

      <div className="glass-card divide-y" style={{ borderColor: 'var(--glass-border)' }}>
        {members.length === 0 && (
          <div className="px-4 py-8 text-center text-secondary text-sm">
            尚無成員資料
          </div>
        )}

        {members.map(member => {
          const isMe = member.uid === user?.uid

          return (
            <div key={member.uid} className="flex items-center gap-3 px-4 py-3">
              <Avatar member={member} />

              <div className="flex-1 min-w-0">
                <p className="text-primary text-sm font-medium truncate">
                  {member.displayName || member.email}
                  {isMe && <span className="text-secondary text-xs font-normal ml-1.5">（我）</span>}
                </p>
                <p className="text-secondary text-xs truncate">{member.email}</p>
              </div>

              {canManageMembers && !isMe ? (
                <div className="flex items-center gap-1.5 shrink-0">
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
                  <button
                    className="text-secondary p-2"
                    style={{ minHeight: 44 }}
                    onClick={() => removeMember(member.uid)}
                  >
                    <UserMinus size={16} />
                  </button>
                </div>
              ) : (
                <RoleBadge role={member.role} lang={lang} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
