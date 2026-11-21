import { useEffect, useState } from 'react'
import { fileToOcrImage, ocr } from '../api'
import type { RecipeDraft } from '../types'

const MAX_FILES = 4

export function AddScreen({ onRecognized }: { onRecognized: (d: RecipeDraft) => void }) {
  const [files, setFiles] = useState<File[]>([])
  const [urls, setUrls] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const u = files.map((f) => URL.createObjectURL(f))
    setUrls(u)
    return () => u.forEach((x) => URL.revokeObjectURL(x))
  }, [files])

  const run = async () => {
    setBusy(true)
    setError('')
    try {
      const images = await Promise.all(files.map(fileToOcrImage))
      onRecognized(await ocr(images))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <div className="detail">
      <h1 className="heading">レシピを追加</h1>
      <p className="sub">
        レシピのスクリーンショットを選ぶと、文字おこしします。画像は保存されず、文字だけが残ります。
      </p>

      <div className="row" style={{ marginTop: 24 }}>
        <div className="filebox">
          <span className="btn" style={{ display: 'inline-flex', alignItems: 'center' }}>
            画像を選ぶ
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            aria-label="画像を選ぶ"
            onChange={(e) => {
              setFiles([...e.target.files!].slice(0, MAX_FILES))
              setError('')
              e.target.value = ''
            }}
          />
        </div>
        <span className="muted">最大{MAX_FILES}枚（1つのレシピが複数枚に分かれている場合）</span>
      </div>

      {urls.length > 0 && (
        <div className="thumbs">
          {urls.map((u) => (
            <img key={u} src={u} alt="" />
          ))}
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button className="btn primary" disabled={files.length === 0 || busy} onClick={run}>
          {busy ? '文字おこし中…' : '文字おこしする'}
        </button>
      </div>
    </div>
  )
}
