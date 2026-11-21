export interface Env {
  DB: D1Database
  ALLOWED_ORIGIN: string
  GEMINI_MODEL: string
  GEMINI_API_KEY: string
}

const CATEGORIES = [
  '肉',
  '魚介',
  '野菜',
  'きのこ',
  '卵・乳製品',
  '豆・大豆製品',
  '米・麺・パン',
  '果物',
  'その他',
]

const MAX_IMAGES = 4
const MAX_IMAGE_BASE64 = 4_000_000

function cors(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Code',
    Vary: 'Origin',
  }
}

function json(env: Env, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(env) },
  })
}

function fail(env: Env, status: number, message: string): Response {
  return json(env, { error: message }, status)
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ---------- 入力の整形 ----------

interface Ingredient {
  name: string
  amount: string
}

function cleanStr(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

function cleanIngredients(v: unknown): Ingredient[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => ({
      name: cleanStr((x as Ingredient)?.name, 100),
      amount: cleanStr((x as Ingredient)?.amount, 100),
    }))
    .filter((x) => x.name !== '')
    .slice(0, 100)
}

function cleanStrings(v: unknown, max: number, count: number): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => cleanStr(x, max))
    .filter((x) => x !== '')
    .slice(0, count)
}

function cleanCategories(v: unknown): string[] {
  return cleanStrings(v, 20, 10).filter((c) => CATEGORIES.includes(c))
}

interface RecipeInput {
  title: string
  servings: string
  ingredients: Ingredient[]
  steps: string[]
  categories: string[]
  memo: string
}

function cleanRecipe(body: unknown): RecipeInput | null {
  const b = (body ?? {}) as Record<string, unknown>
  const title = cleanStr(b.title, 200)
  if (title === '') return null
  return {
    title,
    servings: cleanStr(b.servings, 50),
    ingredients: cleanIngredients(b.ingredients),
    steps: cleanStrings(b.steps, 2000, 100),
    categories: cleanCategories(b.categories),
    memo: cleanStr(b.memo, 5000),
  }
}

interface RecipeRow {
  id: string
  title: string
  servings: string
  ingredients: string
  steps: string
  categories: string
  memo: string
  created_at: string
  updated_at: string
  view_count: number
  last_viewed_at: string | null
}

function toRecipe(r: RecipeRow) {
  return {
    id: r.id,
    title: r.title,
    servings: r.servings,
    ingredients: JSON.parse(r.ingredients) as Ingredient[],
    steps: JSON.parse(r.steps) as string[],
    categories: JSON.parse(r.categories) as string[],
    memo: r.memo,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    viewCount: r.view_count,
    lastViewedAt: r.last_viewed_at,
  }
}

// ---------- Gemini による文字おこし ----------

async function ocrRecipe(env: Env, images: { mime: string; data: string }[]) {
  if (!env.GEMINI_API_KEY) throw new Error('サーバーにGeminiのAPIキーが設定されていません')

  const prompt = `あなたはレシピ画像の文字おこしアシスタントです。
添付された画像（スマホのスクリーンショット）から、レシピを読み取ってJSONで返してください。
複数枚ある場合は同じ1つのレシピの続きです。

キー:
- title: 料理名（文字列）。レシピが写っていない画像なら null
- servings: 何人分か（例「2人分」。無ければ空文字）
- ingredients: 材料の配列。各要素は {"name": 材料名, "amount": 分量}。分量が無ければ空文字
- steps: 作り方の手順の配列（番号は付けず、1手順を1要素に）
- categories: 主な素材の分類。次から該当するものだけ複数選択: ${CATEGORIES.join('、')}
- memo: コツ・ポイント・補足があれば文字列。無ければ空文字

ルール:
- 画像にある文字をできるだけそのまま書き起こす。推測で足さない
- 調味料（塩・醤油など）だけでは categories に入れない。主役の素材を選ぶ
- 出力はJSONオブジェクトのみ`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            ...images.map((i) => ({ inline_data: { mime_type: i.mime, data: i.data } })),
          ],
        },
      ],
      generationConfig: { responseMimeType: 'application/json', temperature: 0 },
    }),
  })
  if (!res.ok) {
    throw new Error(`Gemini APIエラー (${res.status})`)
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const out = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!out) throw new Error('AIから有効な応答が得られませんでした')
  let parsed: unknown
  try {
    parsed = JSON.parse(out)
  } catch {
    throw new Error('AIの応答を解釈できませんでした')
  }
  const recipe = cleanRecipe(parsed)
  if (!recipe) throw new Error('画像からレシピを読み取れませんでした')
  return recipe
}

// ---------- ルーティング ----------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(env) })
    }

    const url = new URL(request.url)
    const path = url.pathname

    if (path === '/health') return json(env, { ok: true })

    const code = request.headers.get('X-Code') ?? ''
    if (code.length < 24 || code.length > 200) {
      return fail(env, 401, '引き継ぎコードが正しくありません')
    }
    const userId = await sha256Hex(code)

    try {
      if (path === '/ocr' && request.method === 'POST') {
        const body = (await request.json()) as {
          images?: { mime?: string; data?: string }[]
        }
        const images = (body.images ?? [])
          .filter(
            (i) =>
              typeof i?.data === 'string' &&
              i.data.length > 0 &&
              i.data.length <= MAX_IMAGE_BASE64 &&
              typeof i.mime === 'string' &&
              /^image\/(jpeg|png|webp)$/.test(i.mime),
          )
          .slice(0, MAX_IMAGES) as { mime: string; data: string }[]
        if (images.length === 0) return fail(env, 400, '画像がありません')
        // 画像は保存せず、文字おこしの結果だけを返す。
        return json(env, await ocrRecipe(env, images))
      }

      if (path === '/recipes' && request.method === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT * FROM recipes WHERE user_id = ? ORDER BY created_at DESC',
        )
          .bind(userId)
          .all<RecipeRow>()
        return json(env, results.map(toRecipe))
      }

      if (path === '/recipes' && request.method === 'POST') {
        const input = cleanRecipe(await request.json())
        if (!input) return fail(env, 400, '料理名が必要です')
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        await env.DB.prepare(
          `INSERT INTO recipes (id, user_id, title, servings, ingredients, steps, categories, memo, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            id,
            userId,
            input.title,
            input.servings,
            JSON.stringify(input.ingredients),
            JSON.stringify(input.steps),
            JSON.stringify(input.categories),
            input.memo,
            now,
            now,
          )
          .run()
        const row = await env.DB.prepare('SELECT * FROM recipes WHERE id = ? AND user_id = ?')
          .bind(id, userId)
          .first<RecipeRow>()
        return json(env, toRecipe(row!), 201)
      }

      const m = path.match(/^\/recipes\/([0-9a-f-]{36})(\/view)?$/)
      if (m) {
        const id = m[1]
        const isView = m[2] === '/view'

        if (isView && request.method === 'POST') {
          const r = await env.DB.prepare(
            `UPDATE recipes SET view_count = view_count + 1, last_viewed_at = ?
             WHERE id = ? AND user_id = ?`,
          )
            .bind(new Date().toISOString(), id, userId)
            .run()
          if (!r.meta.changes) return fail(env, 404, 'レシピが見つかりません')
          return json(env, { ok: true })
        }

        if (!isView && request.method === 'PUT') {
          const input = cleanRecipe(await request.json())
          if (!input) return fail(env, 400, '料理名が必要です')
          const r = await env.DB.prepare(
            `UPDATE recipes SET title = ?, servings = ?, ingredients = ?, steps = ?,
               categories = ?, memo = ?, updated_at = ?
             WHERE id = ? AND user_id = ?`,
          )
            .bind(
              input.title,
              input.servings,
              JSON.stringify(input.ingredients),
              JSON.stringify(input.steps),
              JSON.stringify(input.categories),
              input.memo,
              new Date().toISOString(),
              id,
              userId,
            )
            .run()
          if (!r.meta.changes) return fail(env, 404, 'レシピが見つかりません')
          const row = await env.DB.prepare('SELECT * FROM recipes WHERE id = ? AND user_id = ?')
            .bind(id, userId)
            .first<RecipeRow>()
          return json(env, toRecipe(row!))
        }

        if (!isView && request.method === 'DELETE') {
          await env.DB.prepare('DELETE FROM recipes WHERE id = ? AND user_id = ?')
            .bind(id, userId)
            .run()
          return json(env, { ok: true })
        }
      }

      return fail(env, 404, 'Not found')
    } catch (e) {
      return fail(env, 500, e instanceof Error ? e.message : '内部エラー')
    }
  },
}
