// Storage feature disabled until Firebase Blaze plan is enabled
// eslint-disable-next-line
export default function ImageUploader() { return null }

/*
import { useRef, useState } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../lib/firebase'
import Compressor from 'compressorjs'
import { Image, Loader, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'

const compress = file => new Promise((resolve, reject) =>
  new Compressor(file, { quality: 0.7, maxWidth: 1200, maxHeight: 1200, success: resolve, error: reject })
)

export default function ImageUploader({ images = [], onChange, storagePath }) {
  const { t } = useTranslation()
  const inputRef = useRef()
  const [uploading, setUploading] = useState(false)

  const handleFiles = async (files) => {
    if (images.length + files.length > 2) {
      toast.error('最多 2 張圖片 / Max 2 photos')
      return
    }
    setUploading(true)
    try {
      const urls = await Promise.all(Array.from(files).map(async file => {
        const compressed = await compress(file)
        const storageRef = ref(storage, `${storagePath}/${Date.now()}_${file.name}`)
        await uploadBytes(storageRef, compressed)
        return getDownloadURL(storageRef)
      }))
      onChange([...images, ...urls])
    } catch (e) {
      toast.error('上傳失敗 / Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const remove = url => onChange(images.filter(u => u !== url))

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {images.map(url => (
          <div key={url} className="relative">
            <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
            <button
              onClick={() => remove(url)}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'var(--accent)', color: 'white' }}
            ><X size={12} /></button>
          </div>
        ))}
        {images.length < 2 && (
          <button
            className="glass-mini w-20 h-20 flex flex-col items-center justify-center gap-1 text-secondary text-xs"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader size={18} className="animate-spin" /> : <Image size={18} />}
            <span>{t('common.upload')}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  )
}
*/
