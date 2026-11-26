import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
} from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import { UPLOADS_DIR } from './paths.js'

const scrypt = promisify(scryptCallback)
const SESSION_COOKIE = 'gift_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LENGTH = 64

function httpError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

export function normalizeEmail(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function validatePassword(passwordValue) {
  const password = String(passwordValue ?? '')
  if ([...password].length < 8) {
    throw httpError(400, '密码至少需要 8 个字符')
  }
  if ([...password].length > 128) {
    throw httpError(400, '密码不能超过 128 个字符')
  }
  return password
}

function validateEmailAddress(emailValue) {
  const email = normalizeEmail(emailValue)
  if (!email) throw httpError(400, '请填写邮箱')
  if (email.length > 254) throw httpError(400, '邮箱地址过长')

  const at = email.lastIndexOf('@')
  if (at <= 0 || at === email.length - 1) {
    throw httpError(400, '邮箱格式不正确')
  }

  const local = email.slice(0, at)
  const domain = email.slice(at + 1)

  if (
    local.length > 64 ||
    local.startsWith('.') ||
    local.endsWith('.') ||
    local.includes('..') ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)
  ) {
    throw httpError(400, '邮箱格式不正确')
  }

  const labels = domain.split('.')
  if (labels.length < 2) throw httpError(400, '邮箱格式不正确')

  for (const label of labels) {
    if (
      !label ||
      label.length > 63 ||
      label.startsWith('-') ||
      label.endsWith('-') ||
      !/^[a-z0-9-]+$/.test(label)
    ) {
      throw httpError(400, '邮箱格式不正确')
    }
  }

  if (!/^[a-z]{2,63}$/.test(labels[labels.length - 1])) {
    throw httpError(400, '邮箱格式不正确')
  }

  return email
}

export function validateCredentials(emailValue, passwordValue) {
  return {
    email: validateEmailAddress(emailValue),
    password: validatePassword(passwordValue)
  }
}

async function hashPassword(password) {
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024
  })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`
}

async function verifyPassword(password, stored) {
  const parts = String(stored ?? '').split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false

  const [, n, r, p, saltText, hashText] = parts
  try {
    const salt = Buffer.from(saltText, 'base64url')
    const expected = Buffer.from(hashText, 'base64url')
    const derived = await scrypt(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024
    })
    const actual = Buffer.from(derived)
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

function mapUser(row) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    isAdmin: Boolean(row.is_admin),
    isBanned: isBanActive(row.banned_until),
    bannedUntil: row.banned_until ?? null,
    createdAt: row.created_at
  }
}

function isBanActive(value) {
  if (!value) return false
  const date = new Date(`${String(value).replace(' ', 'T')}Z`)
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now()
}

function formatBanUntil(value) {
  if (!value) return ''
  const date = new Date(`${String(value).replace(' ', 'T')}Z`)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', { hour12: false })
}

function sqliteDateAfterDays(days) {
  if (days === 0) return '9999-12-31 23:59:59'
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ')
}

function nextUsername(db) {
  const rows = db.prepare('SELECT username FROM users').all()
  let max = 0
  for (const row of rows) {
    const number = Number.parseInt(row.username, 10)
    if (Number.isInteger(number) && number > max) max = number
  }
  if (max >= 9999) {
    throw httpError(409, '用户数量已达到 9999 上限')
  }
  return String(max + 1).padStart(4, '0')
}

function adoptLegacyData(db, userId) {
  db.prepare('UPDATE friends SET user_id = ? WHERE user_id IS NULL').run(userId)
  db.prepare('UPDATE favorites SET user_id = ? WHERE user_id IS NULL').run(userId)
  db.prepare('UPDATE reviews SET user_id = ? WHERE user_id IS NULL').run(userId)
}

export async function registerUser(db, emailValue, passwordValue) {
  const { email, password } = validateCredentials(emailValue, passwordValue)

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) throw httpError(409, '这个邮箱已经注册过了')

  const userCount = Number(
    db.prepare('SELECT COUNT(*) AS count FROM users').get().count
  )
  const passwordHash = await hashPassword(password)
  const username = nextUsername(db)

  db.exec('BEGIN')
  try {
    const result = db
      .prepare(
        'INSERT INTO users (email, username, password_hash, is_admin) VALUES (?, ?, ?, ?)'
      )
      .run(email, username, passwordHash, userCount === 0 ? 1 : 0)
    const userId = Number(result.lastInsertRowid)
    if (userCount === 0) {
      // 单用户版本的旧数据归入第一个注册账号
      adoptLegacyData(db, userId)
    }
    db.exec('COMMIT')

    return mapUser(
      db
        .prepare(
          'SELECT id, email, username, is_admin, banned_until, created_at FROM users WHERE id = ?'
        )
        .get(userId)
    )
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

export async function loginUser(db, emailValue, passwordValue) {
  const email = normalizeEmail(emailValue)
  const password = String(passwordValue ?? '')
  if (!email || !password) {
    throw httpError(400, '请填写邮箱和密码')
  }

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!row) throw httpError(401, '邮箱或密码不正确')

  const valid = await verifyPassword(password, row.password_hash)
  if (!valid) throw httpError(401, '邮箱或密码不正确')

  if (isBanActive(row.banned_until)) {
    const until = formatBanUntil(row.banned_until)
    throw httpError(
      403,
      until.startsWith('9999')
        ? '账号已被永久封禁，请联系管理员'
        : `账号已被封禁，解封时间：${until}`
    )
  }

  return mapUser(row)
}

export async function changePassword(
  db,
  userId,
  currentPassword,
  newPassword
) {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
  if (!row) throw httpError(404, '账号不存在')

  const current = String(currentPassword ?? '')
  if (!current) throw httpError(400, '请填写当前密码')
  if (!(await verifyPassword(current, row.password_hash))) {
    throw httpError(401, '当前密码不正确')
  }

  const next = validatePassword(newPassword)
  const passwordHash = await hashPassword(next)

  db.prepare(
    `UPDATE users SET password_hash = ?, updated_at = datetime('now')
      WHERE id = ?`
  ).run(passwordHash, userId)
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
}

export async function deleteAccount(db, userId, passwordValue) {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
  if (!row) throw httpError(404, '账号不存在')
  if (row.is_admin) {
    throw httpError(400, '管理员账号不能自行注销，请先由服务器管理员处理')
  }

  const password = String(passwordValue ?? '')
  if (!password) throw httpError(400, '请输入密码确认删除')
  if (!(await verifyPassword(password, row.password_hash))) {
    throw httpError(401, '密码不正确')
  }

  const images = db
    .prepare(
      "SELECT image_path FROM reviews WHERE user_id = ? AND image_path IS NOT NULL"
    )
    .all(userId)
  const reviewCount = Number(
    db.prepare('SELECT COUNT(*) AS count FROM reviews WHERE user_id = ?').get(userId)
      .count
  )

  db.exec('BEGIN')
  try {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM reviews WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM favorites WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM friends WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM users WHERE id = ?').run(userId)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  for (const image of images) {
    try {
      const filePath = path.join(UPLOADS_DIR, path.basename(image.image_path))
      if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true })
    } catch {
      // 文件删除失败不应阻断账号注销
    }
  }

  return { deletedReviews: reviewCount }
}

export function createSession(db, userId) {
  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

  db.prepare(
    `DELETE FROM sessions WHERE datetime(expires_at) <= datetime('now')`
  ).run()
  db.prepare(
    `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)`
  ).run(userId, tokenHash, expiresAt)

  return { token, expiresAt }
}

export function hashSessionToken(token) {
  return createHash('sha256').update(String(token)).digest('hex')
}

export function parseCookies(header) {
  const cookies = {}
  if (!header) return cookies
  for (const part of String(header).split(';')) {
    const index = part.indexOf('=')
    if (index < 0) continue
    const key = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (!key) continue
    try {
      cookies[key] = decodeURIComponent(value)
    } catch {
      cookies[key] = value
    }
  }
  return cookies
}

export function getSessionToken(req) {
  const cookies = parseCookies(req.headers.cookie)
  return cookies[SESSION_COOKIE] || null
}

export function getSessionUser(db, req) {
  const token = getSessionToken(req)
  if (!token) return null

  const row = db
    .prepare(
      `SELECT u.id, u.email, u.username, u.is_admin, u.banned_until, u.created_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?
          AND datetime(s.expires_at) > datetime('now')
        LIMIT 1`
    )
    .get(hashSessionToken(token))

  if (!row || isBanActive(row.banned_until)) return null
  return mapUser(row)
}

export function destroySession(db, req) {
  const token = getSessionToken(req)
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(
      hashSessionToken(token)
    )
  }
}

function isSecureRequest(req) {
  return (
    process.env.COOKIE_SECURE === '1' ||
    req.headers['x-forwarded-proto'] === 'https'
  )
}

function sessionCookie(req, token, expiresAt) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    `Expires=${new Date(expiresAt).toUTCString()}`
  ]
  if (isSecureRequest(req)) parts.push('Secure')
  return parts.join('; ')
}

export function setSessionCookie(req, res, token, expiresAt) {
  res.setHeader('Set-Cookie', sessionCookie(req, token, expiresAt))
}

export function clearSessionCookie(req, res) {
  const parts = [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ]
  if (isSecureRequest(req)) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

const loginAttempts = new Map()

export function assertLoginAllowed(ip, email) {
  const key = `${ip}|${normalizeEmail(email)}`
  const entry = loginAttempts.get(key)
  if (!entry) return
  if (Date.now() > entry.resetAt) {
    loginAttempts.delete(key)
    return
  }
  if (entry.count >= 5) {
    throw httpError(429, '登录尝试过多，请 15 分钟后再试')
  }
}

export function recordLoginFailure(ip, email) {
  const key = `${ip}|${normalizeEmail(email)}`
  const now = Date.now()
  const entry = loginAttempts.get(key)
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return
  }
  entry.count += 1
}

export function clearLoginFailures(ip, email) {
  loginAttempts.delete(`${ip}|${normalizeEmail(email)}`)
}

export function listAdminUsers(db) {
  const rows = db
    .prepare(
      `SELECT u.id, u.username, u.email, u.is_admin, u.banned_until,
              u.ban_reason, u.created_at,
              COUNT(r.id) AS review_count
         FROM users u
         LEFT JOIN reviews r ON r.user_id = u.id
        GROUP BY u.id
        ORDER BY u.id ASC`
    )
    .all()

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    email: row.email,
    isAdmin: Boolean(row.is_admin),
    isBanned: isBanActive(row.banned_until),
    bannedUntil: row.banned_until ?? null,
    banReason: row.ban_reason ?? null,
    reviewCount: Number(row.review_count),
    createdAt: row.created_at
  }))
}

export async function adminResetPassword(
  db,
  targetUserId,
  newPassword,
  actor
) {
  if (!actor?.isAdmin) throw httpError(403, '只有管理员可以重置密码')
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(targetUserId)
  if (!user) throw httpError(404, '账号不存在')

  const password = validatePassword(newPassword)
  const passwordHash = await hashPassword(password)
  db.prepare(
    `UPDATE users SET password_hash = ?, updated_at = datetime('now')
      WHERE id = ?`
  ).run(passwordHash, targetUserId)
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetUserId)
}

export function adminBanUser(db, targetUserId, options, actor) {
  if (!actor?.isAdmin) throw httpError(403, '只有管理员可以封禁账号')
  const user = db
    .prepare('SELECT id, is_admin FROM users WHERE id = ?')
    .get(targetUserId)
  if (!user) throw httpError(404, '账号不存在')
  if (user.is_admin) throw httpError(400, '不能封禁管理员账号')

  const days = Number(options?.days)
  if (![0, 1, 3, 7, 30, 90].includes(days)) {
    throw httpError(400, '封禁时长不正确')
  }
  const reason = String(options?.reason ?? '').trim().slice(0, 200)
  const until = sqliteDateAfterDays(days)

  db.prepare(
    `UPDATE users
        SET banned_until = ?, ban_reason = ?, updated_at = datetime('now')
      WHERE id = ?`
  ).run(until, reason || null, targetUserId)
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetUserId)

  return {
    bannedUntil: until,
    days,
    reason: reason || null
  }
}

export function adminUnbanUser(db, targetUserId, actor) {
  if (!actor?.isAdmin) throw httpError(403, '只有管理员可以解封账号')
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(targetUserId)
  if (!user) throw httpError(404, '账号不存在')

  db.prepare(
    `UPDATE users
        SET banned_until = NULL, ban_reason = NULL, updated_at = datetime('now')
      WHERE id = ?`
  ).run(targetUserId)
}
