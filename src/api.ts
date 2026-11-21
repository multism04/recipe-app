import type { Recipe, RecipeDraft } from './types'

// 開発サーバー(npm run dev)ではローカルのWorker、本番では公開済みのWorkerを使う
const API_URL: string = import.meta.env.DEV
  ? 'http://localhost:8787'
  : 'https://recipe-app-worker.multism04.workers.dev'

const CODE_KEY = 'recipe_code'

// ---------- 引き継ぎコード ----------
// ログインの代わりに、長いランダムなコードでデータを紐づける。
// iPhoneはSafariとホーム画面アプリで保存領域が別なので、
// コードを入力すれば同じレシピに繋がる。

export function getCode(): string | null {
  try {
    return localStorage.getItem(CODE_KEY)
  } catch {
    return null
  }
}

export function setCode(code: string) {
  localStorage.setItem(CODE_KEY, code)
}

export function clearCode() {
  localStorage.removeItem(CODE_KEY)
}

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789' // 紛らわしい文字(i,l,o,0,1)を除く

export function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length])
  // 4文字ずつ区切る（8グループ = 32文字）
  return Array.from({ length: 8 }, (_, i) => chars.slice(i * 4, i * 4 + 4).join('')).join('-')
}

export function normalizeCode(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, '')
}

export function isValidCode(code: string): boolean {
  return /^[a-z0-9-]{24,100}$/.test(code)
}

// ---------- 通信 ----------

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const code = getCode()
  if (!code) throw new Error('引き継ぎコードが未設定です')
  let res: Response
  try {
    res = await fetch(API_URL + path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Code': code,
        ...init.headers,
      },
    })
  } catch {
    throw new Error('通信に失敗しました。ネットワーク接続を確認してください。')
  }
  if (!res.ok) {
    let message = `エラー (${res.status})`
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export const listRecipes = () => request<Recipe[]>('/recipes')

export const createRecipe = (d: RecipeDraft) =>
  request<Recipe>('/recipes', { method: 'POST', body: JSON.stringify(d) })

export const updateRecipe = (id: string, d: RecipeDraft) =>
  request<Recipe>(`/recipes/${id}`, { method: 'PUT', body: JSON.stringify(d) })

export const deleteRecipe = (id: string) =>
  request<{ ok: true }>(`/recipes/${id}`, { method: 'DELETE' })

export const recordView = (id: string) =>
  request<{ ok: true }>(`/recipes/${id}/view`, { method: 'POST' })

export type OcrImage = { mime: string; data: string }

export const ocr = (images: OcrImage[]) =>
  request<RecipeDraft>('/ocr', { method: 'POST', body: JSON.stringify({ images }) })

// ---------- 画像の縮小（送信量を減らす） ----------

const MAX_SIDE = 2000

type Decoded = { source: CanvasImageSource; width: number; height: number; close: () => void }

async function decode(file: File): Promise<Decoded> {
  // createImageBitmap は形式の対応が広く、写真の向き(EXIF)も反映してくれる
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() }
    } catch {
      // 次の方法を試す
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('decode failed'))
      el.src = url
    })
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} }
  } finally {
    URL.revokeObjectURL(url)
  }
}

// ブラウザで開けない形式でも、AIが読める形式なら元のまま送る
const RAW_OK = /^image\/(jpeg|png|webp|heic|heif)$/
const MAX_RAW_BYTES = 2_800_000

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(new Error('画像を読み込めませんでした'))
    reader.readAsDataURL(file)
  })
}

export async function fileToOcrImage(file: File): Promise<OcrImage> {
  let d: Decoded
  try {
    d = await decode(file)
  } catch {
    if (RAW_OK.test(file.type) && file.size <= MAX_RAW_BYTES) {
      return { mime: file.type, data: await fileToBase64(file) }
    }
    throw new Error(
      `この画像は読み込めませんでした（形式: ${file.type || '不明'}）。スクリーンショットを撮り直すか、別の画像で試してください。`,
    )
  }
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(d.width, d.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(d.width * scale))
    canvas.height = Math.max(1, Math.round(d.height * scale))
    canvas.getContext('2d')!.drawImage(d.source, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    return { mime: 'image/jpeg', data: dataUrl.split(',')[1] }
  } finally {
    d.close()
  }
}
