import { useState } from 'react'
import { createRecipe, updateRecipe } from '../api'
import { CATEGORIES, type Recipe, type RecipeDraft } from '../types'

// 文字おこし結果の確認（新規保存）と、保存済みレシピの編集の両方に使う
export function EditScreen({
  recipeId,
  initial,
  onSaved,
  onCancel,
}: {
  recipeId?: string
  initial: RecipeDraft
  onSaved: (r: Recipe) => void
  onCancel: () => void
}) {
  const [d, setD] = useState<RecipeDraft>({
    ...initial,
    ingredients: initial.ingredients.map((i) => ({ ...i })),
  })
  const [stepsText, setStepsText] = useState(initial.steps.join('\n'))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (d.title.trim() === '') {
      setError('料理名を入力してください')
      return
    }
    setBusy(true)
    setError('')
    const payload: RecipeDraft = {
      ...d,
      steps: stepsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    }
    try {
      onSaved(recipeId ? await updateRecipe(recipeId, payload) : await createRecipe(payload))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  const setIng = (i: number, key: 'name' | 'amount', v: string) =>
    setD({
      ...d,
      ingredients: d.ingredients.map((x, idx) => (idx === i ? { ...x, [key]: v } : x)),
    })

  return (
    <div className="detail">
      <h1 className="heading">{recipeId ? 'レシピを編集' : '内容を確認して保存'}</h1>
      {!recipeId && <p className="sub">文字おこしの結果です。間違いがあれば直してください。</p>}

      <span className="label">TITLE</span>
      <input
        className="input"
        value={d.title}
        onChange={(e) => setD({ ...d, title: e.target.value })}
        aria-label="料理名"
      />

      <span className="label">SERVINGS</span>
      <input
        className="input"
        value={d.servings}
        onChange={(e) => setD({ ...d, servings: e.target.value })}
        placeholder="例: 2人分"
        aria-label="分量(何人分)"
      />

      <span className="label">INGREDIENTS（素材の分類）</span>
      <div className="pills">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className="pill"
            aria-pressed={d.categories.includes(c)}
            onClick={() =>
              setD({
                ...d,
                categories: d.categories.includes(c)
                  ? d.categories.filter((x) => x !== c)
                  : [...d.categories, c],
              })
            }
          >
            {c}
          </button>
        ))}
      </div>

      <span className="label">材料</span>
      {d.ingredients.map((ing, i) => (
        <div className="ing-row" key={i}>
          <input
            className="input"
            value={ing.name}
            onChange={(e) => setIng(i, 'name', e.target.value)}
            aria-label={`材料${i + 1}の名前`}
          />
          <input
            className="input"
            value={ing.amount}
            onChange={(e) => setIng(i, 'amount', e.target.value)}
            aria-label={`材料${i + 1}の分量`}
          />
          <button
            className="icon-btn"
            aria-label={`材料${i + 1}を削除`}
            onClick={() => setD({ ...d, ingredients: d.ingredients.filter((_, idx) => idx !== i) })}
          >
            ×
          </button>
        </div>
      ))}
      <button
        className="btn"
        onClick={() => setD({ ...d, ingredients: [...d.ingredients, { name: '', amount: '' }] })}
      >
        材料を追加
      </button>

      <span className="label">作り方（1行に1手順）</span>
      <textarea
        className="textarea"
        style={{ minHeight: 200 }}
        value={stepsText}
        onChange={(e) => setStepsText(e.target.value)}
        aria-label="作り方"
      />

      <span className="label">メモ</span>
      <textarea
        className="textarea"
        value={d.memo}
        onChange={(e) => setD({ ...d, memo: e.target.value })}
        aria-label="メモ"
      />

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button className="btn primary" onClick={save} disabled={busy}>
          {busy ? '保存中…' : '保存する'}
        </button>
        <button className="btn" onClick={onCancel} disabled={busy}>
          キャンセル
        </button>
      </div>
    </div>
  )
}
