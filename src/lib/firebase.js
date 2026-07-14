import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth     = getAuth(app)
// 記憶體快取（SDK 預設）：不使用 IndexedDB 離線持久化，避免本地快取與
// 伺服器狀態不同步導致已刪除的資料仍顯示在畫面上。代價是不支援離線瀏覽，
// 但資料一致性優先。
export const db       = getFirestore(app)
export const storage  = getStorage(app)
export const provider = new GoogleAuthProvider()

let messaging = null
try {
  messaging = getMessaging(app)
} catch (_) {}
export { messaging, getToken, onMessage }

// 目前使用記憶體快取（無 IndexedDB 持久化），重新整理頁面即可讓
// Firestore 以乾淨狀態重新從伺服器讀取所有資料。
export async function clearFirestoreCache() {}
