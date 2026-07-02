import { useEffect, useState } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, getDocs, setDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'

const TRIP_ID = 'holo-oahu-2026'
// 類別共用（trip-level），物品個人（user-level）
const CATEGORIES_COL = () => collection(db, 'trips', TRIP_ID, 'packingCategories')
const ITEMS_COL      = (uid) => collection(db, 'trips', TRIP_ID, 'users', uid, 'packing')

const DEFAULT_CATEGORIES = [
  { id: 'documents',   name: { zh: '文件', en: 'Documents'   }, order: 0 },
  { id: 'clothing',    name: { zh: '衣物', en: 'Clothing'    }, order: 1 },
  { id: 'accessories', name: { zh: '配件', en: 'Accessories' }, order: 2 },
  { id: 'electronics', name: { zh: '電子', en: 'Electronics' }, order: 3 },
  { id: 'medicine',    name: { zh: '藥品', en: 'Medicine'    }, order: 4 },
  { id: 'toiletries',  name: { zh: '盥洗', en: 'Toiletries'  }, order: 5 },
  { id: 'other',       name: { zh: '其他', en: 'Other'       }, order: 6 },
]

export function usePacking() {
  const { user } = useAuth()
  const uid = user?.uid
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  // Seed 共用類別（trip-level，只需跑一次）
  useEffect(() => {
    let mounted = true
    async function seedCategories() {
      const snap = await getDocs(CATEGORIES_COL())
      if (!mounted) return
      const existingMap = new Map(snap.docs.map(d => [d.id, d.data()]))
      await Promise.all(DEFAULT_CATEGORIES.map(category => {
        const existing = existingMap.get(category.id)
        if (!existing) {
          return setDoc(doc(db, 'trips', TRIP_ID, 'packingCategories', category.id), {
            ...category, builtIn: true, createdAt: serverTimestamp(),
          })
        }
        const needsUpdate =
          existing.order !== category.order ||
          existing.name?.zh !== category.name.zh ||
          existing.name?.en !== category.name.en
        if (needsUpdate) {
          return updateDoc(doc(db, 'trips', TRIP_ID, 'packingCategories', category.id), {
            order: category.order, name: category.name,
          })
        }
        return Promise.resolve()
      }))
    }
    seedCategories()
    return () => { mounted = false }
  }, [])

  // 訂閱共用類別 + 個人物品
  useEffect(() => {
    setLoading(true)

    const categoriesQuery = query(CATEGORIES_COL(), orderBy('order'))
    let categoriesReady = false
    let itemsReady = false
    const finishLoading = () => { if (categoriesReady && itemsReady) setLoading(false) }

    const unsubCategories = onSnapshot(categoriesQuery, snap => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      categoriesReady = true
      finishLoading()
    }, () => { categoriesReady = true; finishLoading() })

    if (!uid) {
      setItems([])
      itemsReady = true
      finishLoading()
      return () => unsubCategories()
    }

    const itemsQuery = query(ITEMS_COL(uid), orderBy('createdAt'))
    const unsubItems = onSnapshot(itemsQuery, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      itemsReady = true
      finishLoading()
    }, () => { itemsReady = true; finishLoading() })

    return () => { unsubCategories(); unsubItems() }
  }, [uid])

  const addItem      = data => {
    if (!uid) return Promise.reject(new Error('Not authenticated'))
    return addDoc(ITEMS_COL(uid), { ...data, createdAt: serverTimestamp() })
  }
  const updateItem   = (id, data) => {
    if (!uid) return Promise.reject(new Error('Not authenticated'))
    return updateDoc(doc(db, 'trips', TRIP_ID, 'users', uid, 'packing', id), data)
  }
  const deleteItem   = id => {
    if (!uid) return Promise.reject(new Error('Not authenticated'))
    return deleteDoc(doc(db, 'trips', TRIP_ID, 'users', uid, 'packing', id))
  }

  const addCategory    = data => addDoc(CATEGORIES_COL(), { ...data, builtIn: false, createdAt: serverTimestamp() })
  const updateCategory = (id, data) => updateDoc(doc(db, 'trips', TRIP_ID, 'packingCategories', id), data)
  const deleteCategory = id => deleteDoc(doc(db, 'trips', TRIP_ID, 'packingCategories', id))

  return { items, categories, loading, addItem, updateItem, deleteItem, addCategory, updateCategory, deleteCategory }
}
