import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { UPLOADS_DIR } from './paths.js'

export const PRIOR_MEAN = 3.5
export const PRIOR_WEIGHT = 10

function httpError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function toGiftId(value) {
  const giftId = Number(value)
  if (!Number.isInteger(giftId) || giftId <= 0) {
    throw httpError(400, '礼物 id 不正确')
  }
  return giftId
}

function ensureGift(db, giftId) {
  const gift = db.prepare('SELECT id FROM gifts WHERE id = ?').get(giftId)
  if (!gift) throw httpError(404, '礼物不存在')
}

function mapReview(row) {
  return {
    id: row.id,
    giftId: row.gift_id,
    rating: row.rating,
    comment: row.comment,
    imagePath: row.image_path,
    createdAt: row.created_at
  }
}

export function getReviewSummary(db, giftIdInput) {
  const giftId = toGiftId(giftIdInput)
  ensureGift(db, giftId)

  const row = db
    .prepare(
      `SELECT COUNT(*) AS count, COALESCE(SUM(rating), 0) AS total
         FROM reviews WHERE gift_id = ?`
    )
    .get(giftId)

  const count = Number(row.count)
  const total = Number(row.total)
  const rawScore = ((PRIOR_WEIGHT * PRIOR_MEAN + total) / (PRIOR_WEIGHT + count)) * 2

  return {
    giftId,
    score: Math.round(rawScore * 10) / 10,
    ratingCount: count,
    averageRating: count === 0 ? null : Math.round((total / count) * 100) / 100,
    prior: { mean: PRIOR_MEAN, weight: PRIOR_WEIGHT }
  }
}

export function getGiftReviewData(db, giftIdInput) {
  const summary = getReviewSummary(db, giftIdInput)

  const rows = db
    .prepare(
      `SELECT id, gift_id, rating, comment, image_path, created_at
         FROM reviews
        WHERE gift_id = ?
        ORDER BY datetime(created_at) DESC, id DESC`
    )
    .all(summary.giftId)

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const row of rows) {
    distribution[row.rating] += 1
  }

  return {
    ...summary,
    distribution,
    reviews: rows.map(mapReview)
  }
}

function detectImageType(buffer) {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    )
  ) {
    return { mimeType: 'image/png', extension: 'png' }
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { mimeType: 'image/jpeg', extension: 'jpg' }
  }
  if (
    buffer.length >= 6 &&
    ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))
  ) {
    return { mimeType: 'image/gif', extension: 'gif' }
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: 'webp' }
  }
  return null
}

function saveImage(image) {
  if (!image || typeof image !== 'object') return null

  const data = typeof image.data === 'string' ? image.data : ''
  if (!data) return null

  const base64 = data.includes(',') ? data.slice(data.indexOf(',') + 1) : data
  const buffer = Buffer.from(base64, 'base64')

  if (buffer.length === 0) {
    throw httpError(400, '图片内容为空')
  }
  if (buffer.length > 4 * 1024 * 1024) {
    throw httpError(413, '图片不能超过 4MB')
  }

  const type = detectImageType(buffer)
  if (!type) {
    throw httpError(400, '只支持 PNG、JPEG、WebP 或 GIF 图片')
  }

  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  const filename = `${randomUUID()}.${type.extension}`
  const filePath = path.join(UPLOADS_DIR, filename)
  fs.writeFileSync(filePath, buffer)

  return {
    filePath,
    imagePath: `/api/uploads/${filename}`
  }
}

export function createReview(db, giftIdInput, input, userId) {
  const giftId = toGiftId(giftIdInput)
  ensureGift(db, giftId)

  if (!input || typeof input !== 'object') {
    throw httpError(400, '请求内容格式不正确')
  }

  const rating = Number(input.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw httpError(400, '评分需要是 1-5 的整数')
  }

  const comment = String(input.comment ?? '').trim()
  if ([...comment].length > 1000) {
    throw httpError(400, '评价文字不能超过 1000 个字')
  }

  const saved = saveImage(input.image)
  try {
    const result = db
      .prepare(
        `INSERT INTO reviews (user_id, gift_id, rating, comment, image_path)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(userId, giftId, rating, comment || null, saved?.imagePath ?? null)

    const row = db
      .prepare(
        `SELECT id, gift_id, rating, comment, image_path, created_at
           FROM reviews WHERE id = ? AND user_id = ?`
      )
      .get(Number(result.lastInsertRowid), userId)

    return {
      review: mapReview(row),
      summary: getReviewSummary(db, giftId)
    }
  } catch (error) {
    if (saved?.filePath) {
      try {
        fs.rmSync(saved.filePath, { force: true })
      } catch {
        // 忽略清理失败
      }
    }
    throw error
  }
}
