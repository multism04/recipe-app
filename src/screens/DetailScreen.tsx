import { useEffect, useRef, useState } from 'react'
import { deleteRecipe, recordView } from '../api'
import type { Recipe } from '../types'

export function DetailScreen({
  recipe,
  onEdit,
  onDeleted,
  onViewed,
}: {
  recipe: Recipe
  onEdit: () => void
  onDeleted: () => void
  onViewed: () => void
}) {
  const counted = useRef(false)
  const [error, setError] = useState('')

  // 開いたら閲覧回数を1増やす（よく見る順の元になる）
  useEffect(() => {
    if (counted.current) return
    counted.current = true
    recordView(recipe.id)
      .then(onViewed)
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const remove = async () => {
    if (!window.confirm(`「${recipe.title}」を削除しますか？元に戻せません。`)) return
    try {
      await deleteRecipe(recipe.id)
      onDeleted()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <article className="detail">
      <h1 className="heading">{recipe.title}</h1>
      {recipe.servings && <p className="sub">{recipe.servings}</p>}

      {recipe.categories.length > 0 && (
        <div className="pills" style={{ marginTop: 16 }}>
          {recipe.categories.map((c) => (
            <span key={c} className="pill static">
              {c}
            </span>
          ))}
        </div>
      )}

      {recipe.ingredients.length > 0 && (
        <>
          <h2>INGREDIENTS</h2>
          <ul className="ing-list">
            {recipe.ingredients.map((i, idx) => (
              <li key={idx}>
                <span>{i.name}</span>
                <span className="amount">{i.amount}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {recipe.steps.length > 0 && (
        <>
          <h2>STEPS</h2>
          <ol className="step-list">
            {recipe.steps.map((s, idx) => (
              <li key={idx}>
                <span className="num">{idx + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      {recipe.memo && (
        <>
          <h2>MEMO</h2>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{recipe.memo}</p>
        </>
      )}

      <p className="muted" style={{ marginTop: 32 }}>
        閲覧 {recipe.viewCount}回 ・ 登録 {new Date(recipe.createdAt).toLocaleDateString('ja-JP')}
      </p>

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button className="btn" onClick={onEdit}>
          編集
        </button>
        <button className="btn danger" onClick={remove}>
          削除
        </button>
      </div>
    </article>
  )
}
