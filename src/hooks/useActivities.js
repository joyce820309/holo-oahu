import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, writeBatch,
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

  // 將某天的整日備案套用為正式行程：目前的正式行程整組改為備案（沿用一個新的
  // altGroupId 把它們分成一組），備案那組改為正式行程。用 batch 確保原子性，
  // 避免只改了一半導致同一天同時有兩組 primary 或都沒有 primary。
  const applyDayPlan = (primaryIds, altIds) => {
    const batch = writeBatch(db)
    const newAltGroupId = `alt-${Date.now()}`
    primaryIds.forEach(id => {
      batch.update(doc(db, 'trips', TRIP_ID, 'activities', id), { dayPlan: 'alternate', altGroupId: newAltGroupId })
    })
    altIds.forEach(id => {
      batch.update(doc(db, 'trips', TRIP_ID, 'activities', id), { dayPlan: 'primary', altGroupId: null })
    })
    return batch.commit()
  }

  // 建立整日備案：可能是複製來源活動（去掉 id/createdAt），也可能是單筆空白活動，
  // 統一掛上同一個新產生的 altGroupId、標記為 dayPlan: 'alternate'。
  const createDayPlan = (sourceActivities) => {
    const altGroupId = `alt-${Date.now()}`
    return Promise.all(sourceActivities.map(data => addActivity({ ...data, dayPlan: 'alternate', altGroupId })))
  }

  return { activities, loading, addActivity, updateActivity, deleteActivity, applyDayPlan, createDayPlan }
}
