import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { DB_PATH } from './paths.js'
import { SCHEMA_SQL } from './schema.js'
import { runSeed, runSeedAdditions } from './seed/index.js'

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

  // 管理员标记：第一个注册账号作为审核员
  const userColumns = db.prepare('PRAGMA table_info(users)').all()
  if (!userColumns.some((column) => column.name === 'is_admin')) {
    db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0')
    console.log('[db] 已补充 users.is_admin 字段')
  }
  if (!userColumns.some((column) => column.name === 'username')) {
    db.exec('ALTER TABLE users ADD COLUMN username TEXT')
    console.log('[db] 已补充 users.username 字段')
  }
  if (!userColumns.some((column) => column.name === 'banned_until')) {
    db.exec('ALTER TABLE users ADD COLUMN banned_until TEXT')
    console.log('[db] 已补充 users.banned_until 字段')
  }
  if (!userColumns.some((column) => column.name === 'ban_reason')) {
    db.exec('ALTER TABLE users ADD COLUMN ban_reason TEXT')
    console.log('[db] 已补充 users.ban_reason 字段')
  }

  const allUsers = db
    .prepare('SELECT id, username FROM users ORDER BY id ASC')
    .all()
  const usedUsernames = new Set(
    allUsers.map((user) => user.username).filter(Boolean)
  )
  let nextNumber = 1
  for (const user of allUsers) {
    if (user.username) continue
    while (
      nextNumber <= 9999 &&
      usedUsernames.has(String(nextNumber).padStart(4, '0'))
    ) {
      nextNumber += 1
    }
    if (nextNumber > 9999) {
      throw new Error('用户数量已超过 9999，无法分配默认用户名')
    }
    const username = String(nextNumber).padStart(4, '0')
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(
      username,
      user.id
    )
    usedUsernames.add(username)
    nextNumber += 1
  }
  db.exec(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)'
  )

  const admin = db
    .prepare('SELECT id FROM users WHERE is_admin = 1 ORDER BY id LIMIT 1')
    .get()
  if (!admin) {
    const firstUser = db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get()
    if (firstUser) {
      db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(firstUser.id)
      console.log('[db] 已将最早注册的账号设为管理员')
    }
  }

  // 兼容单用户版本：补上 user_id，旧数据会在第一个账号注册时归入该账号
  for (const table of ['friends', 'favorites', 'reviews']) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all()
    if (!columns.some((column) => column.name === 'user_id')) {
      db.exec(
        `ALTER TABLE ${table} ADD COLUMN user_id INTEGER REFERENCES users(id)`
      )
      console.log(`[db] 已补充 ${table}.user_id 字段`)
    }
  }

  db.exec('DROP INDEX IF EXISTS idx_favorites_active_gift')
  db.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_active_user_gift
       ON favorites(user_id, gift_id) WHERE deleted_at IS NULL`
  )
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id)'
  )
  db.exec('CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id)')

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

  const added = runSeedAdditions(db)
  if (added > 0) {
    console.log(`[db] 已补充 ${added} 条新礼物`)
  }

  return db
}

export function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}
