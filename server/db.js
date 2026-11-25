import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { DB_PATH } from './paths.js'
import { SCHEMA_SQL } from './schema.js'
import { runSeed } from './seed/index.js'

/** @type {DatabaseSync | null} */
let db = null

export function getDb() {
  if (db) return db

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

  db = new DatabaseSync(DB_PATH)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(SCHEMA_SQL)

  // 兼容阶段 2 创建的旧数据库：补上性别字段
  const friendColumns = db.prepare('PRAGMA table_info(friends)').all()
  if (!friendColumns.some((column) => column.name === 'gender')) {
    db.exec(
      "ALTER TABLE friends ADD COLUMN gender TEXT CHECK (gender IS NULL OR gender IN ('male', 'female', 'other'))"
    )
    console.log('[db] 已补充 friends.gender 字段')
  }

  const row = db.prepare('SELECT COUNT(*) AS count FROM gifts').get()
  if (Number(row.count) === 0) {
    db.exec('BEGIN')
    try {
      runSeed(db)
      db.exec('COMMIT')
      console.log('[db] 已写入种子数据')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }

  return db
}

export function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}
