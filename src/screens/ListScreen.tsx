import { useMemo, useState } from 'react'
import { haystack, matches } from '../search'
import { CATEGORIES, type Recipe } from '../types'

type Sort = 'new' | 'views'

export function ListScreen({
  recipes,
  error,
  onRetry,
  onOpen,
}: {
  recipes: Recipe[] | null
  error: string
  onRetry: () => void
  onOpen: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [sort, setSort] = useState<Sort>('new')

  const indexed = useMemo(
    () => (recipes ?? []).map((r) => ({ r, hay: haystack(r) })),
    [recipes],
  )

  const shown = useMemo(() => {
    const list = indexed
      .filter(({ r, hay }) => (!category || r.categories.includes(category)) && matches(hay, query))
      .map(({ r }) => r)
    if (sort === 'views') {
      list.sort(
        (a, b) =>
          b.viewCount - a.viewCount ||
          (b.lastViewedAt ?? '').localeCompare(a.lastViewedAt ?? '') ||
          b.createdAt.localeCompare(a.createdAt),
      )
    } else {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
    return list
  }, [indexed, query, category, sort])

  // 保存済みレシピに含まれる素材カテゴリだけをボタンに出す
  const usedCategories = useMemo(
    () => CATEGORIES.filter((c) => (recipes ?? []).some((r) => r.categories.includes(c))),
    [recipes],
  )

  if (error && !recipes) {
    return (
      <div>
        <p className="error">{error}</p>
        <button className="btn" onClick={onRetry}>
          再読み込み
        </button>
      </div>
    )
  }

  return (
    <div>
      <input
        className="input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="料理名・材料・作り方で検索"
        aria-label="検索"
      />

      {usedCategories.length > 0 && (
        <>
          <span className="label">INGREDIENTS</span>
          <div className="pills">
            {usedCategories.map((c) => (
              <button
                key={c}
                className="pill"
                aria-pressed={category === c}
                onClick={() => setCategory(category === c ? null : c)}
              >
                {c}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="sort" role="group" aria-label="並び順">
        <button aria-pressed={sort === 'new'} onClick={() => setSort('new')}>
          登録順
        </button>
        <button aria-pressed={sort === 'views'} onClick={() => setSort('views')}>
          よく見る順
        </button>
      </div>

      {recipes === null ? (
        <p className="empty">読み込み中…</p>
      ) : recipes.length === 0 ? (
        <p className="empty">まだレシピがありません。ADD から追加してください。</p>
      ) : shown.length === 0 ? (
        <p className="empty">該当するレシピがありません。</p>
      ) : (
        <div className="grid">
          {shown.map((r) => (
            <button key={r.id} className="card" onClick={() => onOpen(r.id)}>
              <span className="title">{r.title}</span>
              <span className="ingredients">
                {r.ingredients.map((i) => i.name).join('、') || '材料の記載なし'}
              </span>
              <span className="meta">
                {sort === 'views'
                  ? `閲覧 ${r.viewCount}回`
                  : new Date(r.createdAt).toLocaleDateString('ja-JP')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
