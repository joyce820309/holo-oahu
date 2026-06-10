import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { auth, provider, db } from '../lib/firebase'

const OWNER_EMAIL = 'joyce820309@gmail.com'
const ADMIN_EMAILS = ['belobg1319@gmail.com']
const TRIP_ID = 'holo-oahu-2026'

function fixedRoleForEmail(email) {
  if (email === OWNER_EMAIL) return 'owner'
  if (ADMIN_EMAILS.includes(email)) return 'admin'
  return null
}

async function syncTripMember(u, role) {
  const tripRef = doc(db, 'trips', TRIP_ID)
  const snap = await getDoc(tripRef)
  if (!snap.exists()) return

  const trip = snap.data()
  const members = trip.members || []
  const existing = members.find(m => m.uid === u.uid)
  const nextMember = {
    uid: u.uid,
    displayName: u.displayName,
    email: u.email,
    photoURL: u.photoURL,
    role,
    joinedAt: existing?.joinedAt || new Date().toISOString(),
  }

  const nextMembers = existing
    ? members.map(m => m.uid === u.uid ? { ...m, ...nextMember } : m)
    : [...members, nextMember]

  await updateDoc(tripRef, { members: nextMembers })
}

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      setUser(u)

      if (u) {
        const userRef = doc(db, 'users', u.uid)
        const snap = await getDoc(userRef)
        const fixedRole = fixedRoleForEmail(u.email)
        const storedRole = snap.exists() ? snap.data().role : null
        const nextRole = fixedRole || storedRole || 'editor'

        if (!snap.exists()) {
          await setDoc(userRef, {
            email: u.email,
            name: u.displayName,
            photoURL: u.photoURL,
            role: nextRole,
            createdAt: new Date().toISOString(),
          })
        } else if (fixedRole && storedRole !== fixedRole) {
          await setDoc(userRef, { role: fixedRole }, { merge: true })
        }

        await syncTripMember(u, nextRole)
        setRole(nextRole)
      } else {
        setRole(null)
      }

      setLoading(false)
    })

    return unsub
  }, [])

  const login = () => signInWithPopup(auth, provider)
  const logout = () => signOut(auth)

  const isOwner = role === 'owner'
  const isAdmin = role === 'owner' || role === 'admin'
  const canManageMembers = isOwner
  const canEditTravel = isAdmin
  const canEditGeneral = role === 'owner' || role === 'admin' || role === 'editor'

  return (
    <AuthContext.Provider value={{
      user,
      role,
      isOwner,
      isAdmin,
      canManageMembers,
      canEditTravel,
      canEditGeneral,
      loading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
