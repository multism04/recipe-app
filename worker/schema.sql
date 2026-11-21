-- user_id は「引き継ぎコード」のSHA-256。コード自体は保存しない。
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  servings TEXT NOT NULL DEFAULT '',
  ingredients TEXT NOT NULL DEFAULT '[]',   -- [{name, amount}]
  steps TEXT NOT NULL DEFAULT '[]',         -- [string]
  categories TEXT NOT NULL DEFAULT '[]',    -- 素材カテゴリ [string]
  memo TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_recipes_user ON recipes(user_id);
