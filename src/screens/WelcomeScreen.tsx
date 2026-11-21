import { useState } from 'react'
import { generateCode, isValidCode, normalizeCode, setCode } from '../api'

export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  const startNew = () => {
    setCode(generateCode())
    onDone()
  }

  const useExisting = () => {
    const code = normalizeCode(input)
    if (!isValidCode(code)) {
      setError('コードの形式が正しくありません。設定画面に表示されているコードをそのまま入力してください。')
      return
    }
    setCode(code)
    onDone()
  }

  return (
    <div className="welcome">
      <h1 className="heading">RECIPE NOTE</h1>
      <p className="sub">スクリーンショットのレシピを文字おこしして、保存・検索できます。</p>

      <span className="label">はじめて使う</span>
      <button className="btn primary" onClick={startNew}>
        はじめる
      </button>

      <span className="label">すでに使っている（引き継ぎコードで続ける）</span>
      <input
        className="input"
        value={input}
        onChange={(e) => {
          setInput(e.target.value)
          setError('')
        }}
        placeholder="xxxx-xxxx-xxxx-…"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {error && <p className="error">{error}</p>}
      <p className="muted">
        iPhoneでは、Safariとホーム画面のアプリでデータが別々になります。ホーム画面から開いたときは、
        ここにコードを入力すると同じレシピが表示されます。
      </p>
      <button className="btn" onClick={useExisting} disabled={input.trim() === ''}>
        このコードで続ける
      </button>
    </div>
  )
}
