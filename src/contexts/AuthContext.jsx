import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { auth, provider, db } from '../lib/firebase'

const OWNER_EMAIL  = 'joyce820309@gmail.com'
const ADMIN_EMAILS = ['belobg1319@gmail.com']
const TRIP_ID      = 'holo-oahu-2026'

// iOS Safari / WebKit blocks third-party storage needed by signInWithPopup
function needsRedirect() {
  const ua = navigator.userAgent
  return /iP(hone|ad|od)/.test(ua) || (navigator.maxTouchPoints > 1 && /Mac/.test(ua) && /Safari/.test(ua) && !/Chrome/.test(ua))
}

function fixedRoleForEmail(email) {
  if (email === OWNER_EMAIL) return 'owner'
  if (ADMIN_EMAILS.includes(email)) return 'admin'
  return null
}

async function syncTripMember(u, role) {
  const tripRef = doc(db, 'trips', TRIP_ID)
  const snap    = await getDoc(tripRef)
  if (!snap.exists()) return
  const members  = snap.data().members || []
  const existing = members.find(m => m.uid === u.uid)
  const next     = { uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL, role, joinedAt: existing?.joinedAt || new Date().toISOString() }
  await updateDoc(tripRef, {
    members: existing ? members.map(m => m.uid === u.uid ? { ...m, ...next } : m) : [...members, next],
  })
}

async function resolveRole(u) {
  const userRef    = doc(db, 'users', u.uid)
  const snap       = await getDoc(userRef)
  const fixedRole  = fixedRoleForEmail(u.email)
  const storedRole = snap.exists() ? snap.data().role : null
  const nextRole   = fixedRole || storedRole || 'editor'

  if (!snap.exists()) {
    await setDoc(userRef, { email: u.email, name: u.displayName, photoURL: u.photoURL, role: nextRole, createdAt: new Date().toISOString() })
  } else if (fixedRole && storedRole !== fixedRole) {
    await setDoc(userRef, { role: fixedRole }, { merge: true })
  }

  await syncTripMember(u, nextRole)
  return nextRole
}

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [role, setRole]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // After signInWithRedirect returns, pick up the result before onAuthStateChanged fires
    getRedirectResult(auth).catch(() => {})

    const unsub = onAuthStateChanged(auth, async u => {
      setUser(u)
      if (u) {
        const r = await resolveRole(u)
        setRole(r)
      } else {
        setRole(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const login  = () => needsRedirect() ? signInWithRedirect(auth, provider) : signInWithPopup(auth, provider)
  const logout = () => signOut(auth)

  const isOwner        = role === 'owner'
  const isAdmin        = role === 'owner' || role === 'admin'
  const canManageMembers = isOwner
  const canEditTravel  = isAdmin
  const canEditGeneral = role === 'owner' || role === 'admin' || role === 'editor'

  return (
    <AuthContext.Provider value={{ user, role, isOwner, isAdmin, canManageMembers, canEditTravel, canEditGeneral, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
