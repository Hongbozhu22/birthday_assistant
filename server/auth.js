import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
} from 'node:crypto'
import { promisify } from 'node:util'

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

export function validateCredentials(emailValue, passwordValue) {
  const email = normalizeEmail(emailValue)
  const password = String(passwordValue ?? '')

  if (!email) throw httpError(400, '请填写邮箱')
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw httpError(400, '邮箱格式不正确')
  }
  if ([...password].length < 8) {
    throw httpError(400, '密码至少需要 8 个字符')
  }
  if ([...password].length > 128) {
    throw httpError(400, '密码不能超过 128 个字符')
  }

  return { email, password }
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
    createdAt: row.created_at
  }
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

  db.exec('BEGIN')
  try {
    const result = db
      .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
      .run(email, passwordHash)
    const userId = Number(result.lastInsertRowid)
    if (userCount === 0) {
      // 单用户版本的旧数据归入第一个注册账号
      adoptLegacyData(db, userId)
    }
    db.exec('COMMIT')

    return mapUser(
      db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').get(userId)
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

  return mapUser(row)
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
      `SELECT u.id, u.email, u.created_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ?
          AND datetime(s.expires_at) > datetime('now')
        LIMIT 1`
    )
    .get(hashSessionToken(token))

  return row ? mapUser(row) : null
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
