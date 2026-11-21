export const CATEGORIES = [
  '肉',
  '魚介',
  '野菜',
  'きのこ',
  '卵・乳製品',
  '豆・大豆製品',
  '米・麺・パン',
  '果物',
  'その他',
] as const

export type Ingredient = { name: string; amount: string }

// 保存前（新規・編集中）のレシピ
export type RecipeDraft = {
  title: string
  servings: string
  ingredients: Ingredient[]
  steps: string[]
  categories: string[]
  memo: string
}

export type Recipe = RecipeDraft & {
  id: string
  createdAt: string
  updatedAt: string
  viewCount: number
  lastViewedAt: string | null
}

export const EMPTY_DRAFT: RecipeDraft = {
  title: '',
  servings: '',
  ingredients: [],
  steps: [],
  categories: [],
  memo: '',
}
