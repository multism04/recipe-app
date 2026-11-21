import type { Recipe } from './types'

// 全角/半角・大文字小文字・ひらがな/カタカナの違いを無視して検索できるよう正規化する
export function normalize(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
}

export function haystack(r: Recipe): string {
  return normalize(
    [r.title, r.ingredients.map((i) => i.name).join(' '), r.steps.join(' '), r.memo].join(' '),
  )
}

// スペース区切りはAND検索
export function matches(hay: string, query: string): boolean {
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  return terms.every((t) => hay.includes(t))
}
