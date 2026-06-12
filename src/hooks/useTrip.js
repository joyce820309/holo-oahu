import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

const TRIP_ID = 'holo-oahu-2026'

export function useTrip() {
  const [trip, setTrip]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ref = doc(db, 'trips', TRIP_ID)
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) setTrip({ id: snap.id, ...snap.data() })
      else setTrip(null)
      setLoading(false)
    }, err => {
      console.error('[useTrip] onSnapshot error:', err.code, err.message)
      setLoading(false)
    })
    return unsub
  }, [])

  const updateTrip = data => updateDoc(doc(db, 'trips', TRIP_ID), data)

  const initTrip = async (user) => {
    await setDoc(doc(db, 'trips', TRIP_ID), {
      name: 'Holo · Hawaii 2026',
      segments: [
        { id: 'hawaii', name: { zh: '夏威夷', en: 'Hawaii' }, location: { zh: '歐胡島', en: 'Oahu' }, dateFrom: '2026-07-18', dateTo: '2026-07-24', timezone: 'Pacific/Honolulu' },
        { id: 'seoul',  name: { zh: '首爾',   en: 'Seoul'  }, location: { zh: '首爾',   en: 'Seoul'  }, dateFrom: '2026-07-25', dateTo: '2026-07-25', timezone: 'Asia/Seoul' },
      ],
      members: [{ uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL, role: 'owner', joinedAt: new Date() }],
      settings: { theme: 'dusk', lang: 'zh-TW', inviteCode: Math.random().toString(36).slice(2,8).toUpperCase(), defaultCurrency: 'USD' },
    })
  }

  return { trip, loading, updateTrip, initTrip, TRIP_ID }
}
