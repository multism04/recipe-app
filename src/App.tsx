import { useCallback, useEffect, useState } from 'react'
import { getCode, listRecipes } from './api'
import type { Recipe, RecipeDraft } from './types'
import { AddScreen } from './screens/AddScreen'
import { DetailScreen } from './screens/DetailScreen'
import { EditScreen } from './screens/EditScreen'
import { ListScreen } from './screens/ListScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { WelcomeScreen } from './screens/WelcomeScreen'

type View =
  | { name: 'list' }
  | { name: 'add' }
  | { name: 'settings' }
  | { name: 'detail'; id: string }
  | { name: 'edit'; id: string }
  | { name: 'review'; draft: RecipeDraft } // 文字おこし結果の確認→保存

export default function App() {
  const [hasCode, setHasCode] = useState(() => getCode() !== null)
  const [view, setView] = useState<View>({ name: 'list' })
  const [recipes, setRecipes] = useState<Recipe[] | null>(null)
  const [loadError, setLoadError] = useState('')

  const reload = useCallback(async () => {
    try {
      setRecipes(await listRecipes())
      setLoadError('')
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    if (hasCode) void reload()
  }, [hasCode, reload])

  if (!hasCode) {
    return (
      <div className="app">
        <WelcomeScreen
          onDone={() => {
            setRecipes(null)
            setView({ name: 'list' })
            setHasCode(true)
          }}
        />
      </div>
    )
  }

  const go = (v: View) => {
    setView(v)
    window.scrollTo(0, 0)
  }

  const current = view.name === 'detail' || view.name === 'edit' ? view.name : null
  const navKey = current ? 'list' : view.name === 'review' ? 'add' : view.name
  const target =
    view.name === 'detail' || view.name === 'edit'
      ? (recipes?.find((r) => r.id === view.id) ?? null)
      : null

  return (
    <div className="app">
      <header className="header">
        <button className="logo" onClick={() => go({ name: 'list' })}>
          RECIPE NOTE
        </button>
        <nav className="nav">
          <button
            aria-current={navKey === 'list' ? 'page' : undefined}
            onClick={() => go({ name: 'list' })}
          >
            LIST
          </button>
          <button
            aria-current={navKey === 'add' ? 'page' : undefined}
            onClick={() => go({ name: 'add' })}
          >
            ADD
          </button>
          <button
            aria-current={navKey === 'settings' ? 'page' : undefined}
            onClick={() => go({ name: 'settings' })}
          >
            SETTINGS
          </button>
        </nav>
      </header>

      <main className="screen">
        {view.name === 'list' && (
          <ListScreen
            recipes={recipes}
            error={loadError}
            onRetry={reload}
            onOpen={(id) => go({ name: 'detail', id })}
          />
        )}
        {view.name === 'add' && (
          <AddScreen onRecognized={(draft) => go({ name: 'review', draft })} />
        )}
        {view.name === 'review' && (
          <EditScreen
            key="review"
            initial={view.draft}
            onSaved={async (r) => {
              await reload()
              go({ name: 'detail', id: r.id })
            }}
            onCancel={() => go({ name: 'add' })}
          />
        )}
        {view.name === 'detail' &&
          (target ? (
            <DetailScreen
              key={target.id}
              recipe={target}
              onEdit={() => go({ name: 'edit', id: target.id })}
              onDeleted={async () => {
                await reload()
                go({ name: 'list' })
              }}
              onViewed={reload}
            />
          ) : (
            <p className="empty">{recipes ? 'レシピが見つかりません' : '読み込み中…'}</p>
          ))}
        {view.name === 'edit' &&
          (target ? (
            <EditScreen
              key={target.id}
              recipeId={target.id}
              initial={target}
              onSaved={async (r) => {
                await reload()
                go({ name: 'detail', id: r.id })
              }}
              onCancel={() => go({ name: 'detail', id: target.id })}
            />
          ) : (
            <p className="empty">読み込み中…</p>
          ))}
        {view.name === 'settings' && (
          <SettingsScreen
            onChanged={() => {
              setRecipes(null)
              void reload()
            }}
            onReset={() => setHasCode(false)}
          />
        )}
      </main>
    </div>
  )
}
