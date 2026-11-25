import fs from 'node:fs'
import path from 'node:path'
import { getDb } from './db.js'
import { addFriend, listFriends, updateFriendGender } from './friends.js'
import {
  addFavorite,
  deleteFavorite,
  listFavoriteRows,
  restoreFavorite,
  updateFavorite
} from './favorites.js'
import { UPLOADS_DIR } from './paths.js'
import { createReview, getGiftReviewData } from './reviews.js'

const IMAGE_MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
}

export const PRICE_DISCLAIMER = '参考价，非实时售价'

function sendJson(res, statusCode, payload, headers = {}) {
  const body = JSON.stringify(payload, null, 2)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...headers
  })
  res.end(body)
}

function methodNotAllowed(res, allowedMethods) {
  sendJson(
    res,
    405,
    { error: 'Method Not Allowed' },
    { Allow: allowedMethods.join(', ') }
  )
}

function requestError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function readJsonBody(req, maxBytes = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const declaredLength = Number(req.headers['content-length'] || 0)
    if (declaredLength > maxBytes) {
      req.resume()
      reject(requestError(413, '请求内容过大'))
      return
    }

    let size = 0
    let finished = false
    const chunks = []

    req.on('data', (chunk) => {
      if (finished) return
      size += chunk.length
      if (size > maxBytes) {
        finished = true
        req.resume()
        reject(requestError(413, '请求内容过大'))
        return
      }
      chunks.push(chunk)
    })

    req.on('end', () => {
      if (finished) return
      if (size === 0) {
        reject(requestError(400, '请求体为空'))
        return
      }
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve(JSON.parse(text))
      } catch {
        reject(requestError(400, '请求体需要是合法 JSON'))
      }
    })

    req.on('error', (error) => {
      if (finished) return
      finished = true
      reject(error)
    })
  })
}

function serializeFavorite(row, giftsById) {
  const gift = giftsById.get(row.gift_id) ?? null
  return {
    id: row.id,
    giftId: row.gift_id,
    status: row.status,
    channel: row.channel,
    actualPrice: row.actual_price,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    gift
  }
}

function buildGiftMap(db) {
  const catalog = getCatalog(db)
  return {
    catalog,
    giftsById: new Map(catalog.gifts.map((gift) => [gift.id, gift]))
  }
}

/**
 * 读取商品目录：礼物 + 标签（扁平结构，带 parentId 与 path）。
 * 标签顺序为：每个父级后面紧跟它的子级，方便前端直接渲染层级。
 */
export function getCatalog(db = getDb()) {
  const rawTags = db
    .prepare('SELECT id, name, parent_id, sort_order FROM tags')
    .all()

  const tagById = new Map(
    rawTags.map((tag) => [
      tag.id,
      {
        id: tag.id,
        name: tag.name,
        parentId: tag.parent_id,
        parentName: null,
        path: tag.name,
        depth: tag.parent_id == null ? 0 : 1,
        sortOrder: tag.sort_order
      }
    ])
  )

  for (const tag of tagById.values()) {
    if (tag.parentId != null) {
      const parent = tagById.get(tag.parentId)
      if (parent) {
        tag.parentName = parent.name
        tag.path = `${parent.name}/${tag.name}`
      }
    }
  }

  const roots = [...tagById.values()]
    .filter((tag) => tag.depth === 0)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const orderedTags = []
  for (const root of roots) {
    orderedTags.push(root)
    const children = [...tagById.values()]
      .filter((tag) => tag.parentId === root.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    orderedTags.push(...children)
  }

  const tagOrder = new Map(orderedTags.map((tag, index) => [tag.id, index]))

  const giftRows = db
    .prepare(
      `SELECT id, name, emoji, category, fit_for, reason, price_min, price_max,
              gradient_from, gradient_to, sort_order
         FROM gifts
        ORDER BY sort_order ASC, id ASC`
    )
    .all()

  const relationRows = db
    .prepare('SELECT gift_id, tag_id FROM gift_tags')
    .all()

  const tagsByGift = new Map()
  for (const relation of relationRows) {
    const list = tagsByGift.get(relation.gift_id) ?? []
    list.push(relation.tag_id)
    tagsByGift.set(relation.gift_id, list)
  }

  const gifts = giftRows.map((gift) => {
    const giftTagIds = (tagsByGift.get(gift.id) ?? []).sort(
      (a, b) => (tagOrder.get(a) ?? 0) - (tagOrder.get(b) ?? 0)
    )

    return {
      id: gift.id,
      name: gift.name,
      emoji: gift.emoji,
      category: gift.category,
      fitFor: gift.fit_for,
      reason: gift.reason,
      priceMin: gift.price_min,
      priceMax: gift.price_max,
      priceLabel: `${gift.price_min}-${gift.price_max} 元`,
      priceNote: PRICE_DISCLAIMER,
      gradientFrom: gift.gradient_from,
      gradientTo: gift.gradient_to,
      tags: giftTagIds.map((tagId) => {
        const tag = tagById.get(tagId)
        return {
          id: tag.id,
          name: tag.name,
          parentId: tag.parentId,
          parentName: tag.parentName,
          path: tag.path
        }
      })
    }
  })

  return {
    total: gifts.length,
    priceDisclaimer: PRICE_DISCLAIMER,
    tags: orderedTags,
    gifts
  }
}

export function createApiMiddleware() {
  return async function apiMiddleware(req, res, next) {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (!url.pathname.startsWith('/api/')) {
      next()
      return
    }

    const uploadMatch = url.pathname.match(
      /^\/api\/uploads\/([A-Za-z0-9_-]+\.(png|jpe?g|webp|gif))$/
    )
    if (uploadMatch) {
      if (req.method !== 'GET') {
        methodNotAllowed(res, ['GET'])
        return
      }
      const filePath = path.join(UPLOADS_DIR, uploadMatch[1])
      if (!fs.existsSync(filePath)) {
        sendJson(res, 404, { error: 'Image Not Found' })
        return
      }
      const stat = fs.statSync(filePath)
      res.writeHead(200, {
        'Content-Type':
          IMAGE_MIME_TYPES[path.extname(filePath).toLowerCase()] ||
          'application/octet-stream',
        'Content-Length': stat.size,
        'Cache-Control': 'public, max-age=31536000, immutable'
      })
      fs.createReadStream(filePath).pipe(res)
      return
    }

    try {
      if (url.pathname === '/api/gifts') {
        if (req.method !== 'GET') {
          methodNotAllowed(res, ['GET'])
          return
        }
        sendJson(res, 200, getCatalog())
        return
      }

      const reviewMatch = url.pathname.match(/^\/api\/gifts\/(\d+)\/reviews$/)
      if (reviewMatch) {
        const giftId = Number(reviewMatch[1])
        const db = getDb()

        if (req.method === 'GET') {
          sendJson(res, 200, getGiftReviewData(db, giftId))
          return
        }

        if (req.method === 'POST') {
          const body = await readJsonBody(req, 8 * 1024 * 1024)
          const result = createReview(db, giftId, body)
          sendJson(res, 201, result)
          return
        }

        methodNotAllowed(res, ['GET', 'POST'])
        return
      }

      if (url.pathname === '/api/friends') {
        if (req.method === 'GET') {
          sendJson(res, 200, listFriends(getDb()))
          return
        }
        if (req.method === 'POST') {
          const body = await readJsonBody(req)
          const friend = addFriend(getDb(), body)
          sendJson(res, 201, { friend })
          return
        }
        methodNotAllowed(res, ['GET', 'POST'])
        return
      }

      const friendIdMatch = url.pathname.match(/^\/api\/friends\/(\d+)$/)
      if (friendIdMatch) {
        if (req.method !== 'PATCH') {
          methodNotAllowed(res, ['PATCH'])
          return
        }
        const body = await readJsonBody(req)
        const friend = updateFriendGender(
          getDb(),
          Number(friendIdMatch[1]),
          body?.gender
        )
        sendJson(res, 200, { friend })
        return
      }

      if (url.pathname === '/api/favorites') {
        if (req.method === 'GET') {
          const db = getDb()
          const { giftsById } = buildGiftMap(db)
          const rows = listFavoriteRows(db)
          const favorites = rows
            .filter((row) => !row.deleted_at)
            .map((row) => serializeFavorite(row, giftsById))
          const deleted = rows
            .filter((row) => row.deleted_at)
            .map((row) => serializeFavorite(row, giftsById))

          sendJson(res, 200, {
            total: favorites.length,
            favorites,
            deleted,
            counts: {
              wishlist: favorites.filter((item) => item.status === 'wishlist').length,
              gifted: favorites.filter((item) => item.status === 'gifted').length,
              deleted: deleted.length
            }
          })
          return
        }

        if (req.method === 'POST') {
          const db = getDb()
          const body = await readJsonBody(req)
          const row = addFavorite(db, body?.giftId)
          const { giftsById } = buildGiftMap(db)
          sendJson(res, 201, { favorite: serializeFavorite(row, giftsById) })
          return
        }

        methodNotAllowed(res, ['GET', 'POST'])
        return
      }

      const favoriteRestoreMatch = url.pathname.match(
        /^\/api\/favorites\/(\d+)\/restore$/
      )
      if (favoriteRestoreMatch) {
        if (req.method !== 'POST') {
          methodNotAllowed(res, ['POST'])
          return
        }
        const db = getDb()
        const row = restoreFavorite(db, Number(favoriteRestoreMatch[1]))
        const { giftsById } = buildGiftMap(db)
        sendJson(res, 200, { favorite: serializeFavorite(row, giftsById) })
        return
      }

      const favoriteIdMatch = url.pathname.match(/^\/api\/favorites\/(\d+)$/)
      if (favoriteIdMatch) {
        const favoriteId = Number(favoriteIdMatch[1])
        const db = getDb()

        if (req.method === 'PATCH') {
          const body = await readJsonBody(req)
          const row = updateFavorite(db, favoriteId, body)
          const { giftsById } = buildGiftMap(db)
          sendJson(res, 200, { favorite: serializeFavorite(row, giftsById) })
          return
        }

        if (req.method === 'DELETE') {
          const row = deleteFavorite(db, favoriteId)
          const { giftsById } = buildGiftMap(db)
          sendJson(res, 200, { favorite: serializeFavorite(row, giftsById) })
          return
        }

        methodNotAllowed(res, ['PATCH', 'DELETE'])
        return
      }

      if (url.pathname === '/api/health') {
        if (req.method !== 'GET') {
          methodNotAllowed(res, ['GET'])
          return
        }
        const db = getDb()
        const gifts = db.prepare('SELECT COUNT(*) AS count FROM gifts').get()
        const tags = db.prepare('SELECT COUNT(*) AS count FROM tags').get()
        const friends = db.prepare('SELECT COUNT(*) AS count FROM friends').get()
        sendJson(res, 200, {
          ok: true,
          counts: {
            gifts: Number(gifts.count),
            tags: Number(tags.count),
            friends: Number(friends.count)
          }
        })
        return
      }

      sendJson(res, 404, { error: 'Not Found', path: url.pathname })
    } catch (error) {
      if (error.statusCode) {
        sendJson(res, error.statusCode, { error: error.message })
        return
      }
      console.error('[api]', error)
      sendJson(res, 500, { error: 'Internal Server Error' })
    }
  }
}
