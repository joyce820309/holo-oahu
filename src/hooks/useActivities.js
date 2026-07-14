import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const TRIP_ID = 'holo-oahu-2026'

export function useActivities() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    const q = query(
      collection(db, 'trips', TRIP_ID, 'activities'),
      orderBy('date'), orderBy('startTime')
    )
    const unsub = onSnapshot(q, snap => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, err => {
      console.error('[useActivities] onSnapshot error:', err.code, err.message)
      setLoading(false)
    })
    return unsub
  }, [])

  // 本地 IndexedDB 快取偶爾會與伺服器狀態不同步（例如文件已被刪除，
  // 但快取仍保留舊資料）。寫入時遇到 not-found，代表本地看到的這筆
  // 其實已經不存在，主動從畫面上的清單移除，避免使用者卡在幽靈資料上。
  const dropIfNotFound = (id, err) => {
    if (err?.code === 'not-found') {
      setActivities(prev => prev.filter(a => a.id !== id))
    }
    throw err
  }

  const addActivity    = data => addDoc(collection(db, 'trips', TRIP_ID, 'activities'), { ...data, createdAt: serverTimestamp() })
  const updateActivity = (id, data) => updateDoc(doc(db, 'trips', TRIP_ID, 'activities', id), data).catch(err => dropIfNotFound(id, err))
  const deleteActivity = id => deleteDoc(doc(db, 'trips', TRIP_ID, 'activities', id)).catch(err => dropIfNotFound(id, err))

  return { activities, loading, addActivity, updateActivity, deleteActivity }
}
