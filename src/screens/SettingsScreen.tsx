import { useState } from 'react'
import { clearCode, getCode, isValidCode, normalizeCode, setCode } from '../api'

export function SettingsScreen({
  onChanged,
  onReset,
}: {
  onChanged: () => void
  onReset: () => void
}) {
  const [code, setCodeState] = useState(getCode() ?? '')
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      setError('コピーできませんでした。コードを長押しして選択してください。')
    }
  }

  const change = () => {
    const next = normalizeCode(input)
    if (!isValidCode(next)) {
      setError('コードの形式が正しくありません')
      return
    }
    if (!window.confirm('このコードに切り替えます。よろしいですか？')) return
    setCode(next)
    setCodeState(next)
    setInput('')
    setError('')
    onChanged()
  }

  const forget = () => {
    if (
      !window.confirm(
        'この端末からコードを削除します。コードを控えていないと、レシピに二度とアクセスできなくなります。よろしいですか？',
      )
    )
      return
    clearCode()
    onReset()
  }

  return (
    <div className="detail">
      <h1 className="heading">設定</h1>

      <span className="label">引き継ぎコード</span>
      <p className="muted">
        このコードがあなたのレシピへの鍵です。別の端末や、iPhoneのホーム画面アプリでは、
        このコードを入力すると同じレシピが使えます。他の人には教えないでください。
        紛失すると復元できないので、メモなどに控えてください。
      </p>
      <div className="code">{code}</div>
      <button className="btn" onClick={copy}>
        {copied ? 'コピーしました' : 'コピー'}
      </button>

      <span className="label">別のコードに切り替える</span>
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
        aria-label="別のコード"
      />
      {error && <p className="error">{error}</p>}
      <div className="actions" style={{ marginTop: 16 }}>
        <button className="btn" onClick={change} disabled={input.trim() === ''}>
          切り替える
        </button>
      </div>

      <span className="label">この端末からコードを削除</span>
      <button className="btn danger" onClick={forget}>
        コードを削除
      </button>
    </div>
  )
}
