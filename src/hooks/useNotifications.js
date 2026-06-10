import { useEffect, useState, useCallback } from 'react'
import {
  doc, collection, onSnapshot, setDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, Timestamp, arrayUnion,
} from 'firebase/firestore'
import { db, messaging, getToken, onMessage } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''

const DEFAULT_PREFS = {
  enabled: false,
  categories: {
    tripReminder: true,
    activityUpdate: true,
    flightAlert: true,
    expenseUpdate: true,
    packingReminder: true,
  },
}

export function useNotifications() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState(DEFAULT_PREFS)
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [permissionStatus, setPermissionStatus] = useState('default')
  const [fcmToken, setFcmToken] = useState(null)

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  // Watch browser permission
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission)
    } else {
      setPermissionStatus('unsupported')
    }
  }, [])

  // Listen to Firestore prefs
  useEffect(() => {
    if (!user) { setLoading(false); return }
    const ref = doc(db, 'users', user.uid, 'settings', 'notifications')
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) setPrefs({ ...DEFAULT_PREFS, ...snap.data() })
      else setPrefs(DEFAULT_PREFS)
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [user])

  // Listen to custom reminders
  useEffect(() => {
    if (!user) return
    const col = collection(db, 'users', user.uid, 'reminders')
    const q = query(col, orderBy('notifyAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setReminders(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [user])

  const savePrefs = useCallback(async (data) => {
    if (!user) return
    const ref = doc(db, 'users', user.uid, 'settings', 'notifications')
    await setDoc(ref, data, { merge: true })
  }, [user])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported'
    const result = await Notification.requestPermission()
    setPermissionStatus(result)
    if (result !== 'granted') return result

    // Get FCM token
    if (messaging && VAPID_KEY) {
      try {
        const token = await getToken(messaging, { vapidKey: VAPID_KEY })
        setFcmToken(token)
        await savePrefs({
          enabled: true,
          fcmToken: token,
          fcmTokens: arrayUnion(token),
          timezone,
          tokenUpdatedAt: new Date().toISOString(),
        })
      } catch {
        await savePrefs({ enabled: true, timezone })
      }
    } else {
      await savePrefs({ enabled: true, timezone })
    }
    return result
  }, [savePrefs, timezone])

  useEffect(() => {
    if (!messaging) return undefined
    return onMessage(messaging, payload => {
      const title = payload.notification?.title || payload.data?.title || 'Holo'
      const body = payload.notification?.body || payload.data?.body || ''

      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon-192.png' })
      }
    })
  }, [])

  const toggleEnabled = useCallback(async (enabled) => {
    if (enabled) {
      await requestPermission()
    } else {
      await savePrefs({ enabled: false })
    }
  }, [requestPermission, savePrefs])

  const toggleCategory = useCallback(async (key, value) => {
    await savePrefs({
      categories: { ...prefs.categories, [key]: value },
    })
  }, [prefs.categories, savePrefs])

  const addReminder = useCallback(async ({ title, notifyAt }) => {
    if (!user) return
    const notifyAtDate = new Date(notifyAt)
    if (isNaN(notifyAtDate)) throw new Error('Invalid reminder time')

    const col = collection(db, 'users', user.uid, 'reminders')
    await addDoc(col, {
      title,
      notifyAt,
      notifyAtLocal: notifyAt,
      notifyAtUtc: Timestamp.fromDate(notifyAtDate),
      timezone,
      enabled: true,
      status: 'pending',
      sentAt: null,
      createdAt: new Date(),
    })
  }, [user, timezone])

  const updateReminder = useCallback(async (id, data) => {
    if (!user) return
    const ref = doc(db, 'users', user.uid, 'reminders', id)
    await updateDoc(ref, data)
  }, [user])

  const deleteReminder = useCallback(async (id) => {
    if (!user) return
    const ref = doc(db, 'users', user.uid, 'reminders', id)
    await deleteDoc(ref)
  }, [user])

  return {
    prefs,
    reminders,
    loading,
    permissionStatus,
    fcmToken,
    toggleEnabled,
    toggleCategory,
    requestPermission,
    addReminder,
    updateReminder,
    deleteReminder,
  }
}
