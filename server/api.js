import fs from 'node:fs'
import path from 'node:path'
import { getGiftFacets } from './facets.js'
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
import { adminDeleteReview, createReview, getGiftReviewData } from './reviews.js'
import {
  assertLoginAllowed,
  changePassword,
  clearLoginFailures,
  clearSessionCookie,
  createSession,
  deleteAccount,
  destroySession,
  getSessionUser,
  listAdminUsers,
  loginUser,
  recordLoginFailure,
  registerUser,
  setSessionCookie,
  adminMuteUser,
  adminResetPassword,
  adminUnmuteUser
} from './auth.js'

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
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
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

    const facets = getGiftFacets(gift)

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
      recipients: facets.recipients,
      occasions: facets.occasions,
      interests: facets.interests,
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

    try {
      const db = getDb()

      // 简单的同源校验，降低跨站请求风险
      if (req.method !== 'GET' && req.headers.origin) {
        try {
          if (new URL(req.headers.origin).host !== req.headers.host) {
            sendJson(res, 403, { error: '跨站请求被拒绝' })
            return
          }
        } catch {
          sendJson(res, 403, { error: '请求来源不正确' })
          return
        }
      }

      const publicPaths = new Set([
        '/api/auth/register',
        '/api/auth/login',
        '/api/auth/logout',
        '/api/auth/config',
        '/api/health'
      ])
      const isPublic = publicPaths.has(url.pathname)
      let currentUser = null

      if (!isPublic) {
        currentUser = getSessionUser(db, req)
        if (!currentUser) {
          sendJson(res, 401, { error: '请先登录' })
          return
        }
      }

      if (url.pathname === '/api/auth/config') {
        if (req.method !== 'GET') {
          methodNotAllowed(res, ['GET'])
          return
        }
        sendJson(res, 200, { inviteRequired: true })
        return
      }

      if (url.pathname === '/api/auth/register') {
        if (req.method !== 'POST') {
          methodNotAllowed(res, ['POST'])
          return
        }
        const body = await readJsonBody(req)
        if (!process.env.INVITE_CODE) {
          sendJson(res, 503, { error: '注册暂未开放，请联系管理员' })
          return
        }
        if (String(body?.inviteCode ?? '') !== process.env.INVITE_CODE) {
          sendJson(res, 403, { error: '邀请码不正确' })
          return
        }
        const user = await registerUser(db, body?.password)
        const session = createSession(db, user.id)
        setSessionCookie(req, res, session.token, session.expiresAt)
        sendJson(res, 201, { user })
        return
      }

      if (url.pathname === '/api/auth/login') {
        if (req.method !== 'POST') {
          methodNotAllowed(res, ['POST'])
          return
        }
        const body = await readJsonBody(req)
        const ip = req.socket.remoteAddress || 'unknown'
        assertLoginAllowed(ip, body?.username)
        try {
          const user = await loginUser(db, body?.username, body?.password)
          clearLoginFailures(ip, body?.username)
          const session = createSession(db, user.id)
          setSessionCookie(req, res, session.token, session.expiresAt)
          sendJson(res, 200, { user })
        } catch (error) {
          if (error.statusCode === 401) recordLoginFailure(ip, body?.username)
          throw error
        }
        return
      }

      if (url.pathname === '/api/auth/logout') {
        if (req.method !== 'POST') {
          methodNotAllowed(res, ['POST'])
          return
        }
        destroySession(db, req)
        clearSessionCookie(req, res)
        sendJson(res, 200, { ok: true })
        return
      }

      if (url.pathname === '/api/auth/me') {
        sendJson(res, 200, { user: currentUser })
        return
      }

      if (url.pathname === '/api/auth/change-password') {
        if (req.method !== 'POST') {
          methodNotAllowed(res, ['POST'])
          return
        }
        const body = await readJsonBody(req)
        await changePassword(
          db,
          currentUser.id,
          body?.currentPassword,
          body?.newPassword
        )
        const session = createSession(db, currentUser.id)
        setSessionCookie(req, res, session.token, session.expiresAt)
        sendJson(res, 200, { ok: true })
        return
      }

      if (url.pathname === '/api/auth/delete-account') {
        if (req.method !== 'POST') {
          methodNotAllowed(res, ['POST'])
          return
        }
        const body = await readJsonBody(req)
        const result = await deleteAccount(db, currentUser.id, body?.password)
        clearSessionCookie(req, res)
        sendJson(res, 200, { ok: true, ...result })
        return
      }

      if (url.pathname.startsWith('/api/admin/')) {
        if (!currentUser.isAdmin) {
          sendJson(res, 403, { error: '只有管理员可以访问' })
          return
        }
      }

      if (url.pathname === '/api/admin/users') {
        if (req.method !== 'GET') {
          methodNotAllowed(res, ['GET'])
          return
        }
        sendJson(res, 200, { users: listAdminUsers(db) })
        return
      }

      if (url.pathname === '/api/admin/reviews') {
        if (req.method !== 'GET') {
          methodNotAllowed(res, ['GET'])
          return
        }
        const rows = db
          .prepare(
            `SELECT r.id, r.gift_id, r.rating, r.comment, r.image_path,
                    r.created_at, u.id AS user_id, u.username, u.email,
                    g.name AS gift_name
               FROM reviews r
               JOIN users u ON u.id = r.user_id
               JOIN gifts g ON g.id = r.gift_id
              ORDER BY datetime(r.created_at) DESC, r.id DESC
              LIMIT 200`
          )
          .all()

        sendJson(res, 200, {
          reviews: rows.map((row) => ({
            id: row.id,
            giftId: row.gift_id,
            giftName: row.gift_name,
            rating: row.rating,
            comment: row.comment,
            imagePath: row.image_path,
            createdAt: row.created_at,
            userId: row.user_id,
            username: row.username,
            email: null
          }))
        })
        return
      }

      const adminResetMatch = url.pathname.match(
        /^\/api\/admin\/users\/(\d+)\/reset-password$/
      )
      if (adminResetMatch) {
        if (req.method !== 'POST') {
          methodNotAllowed(res, ['POST'])
          return
        }
        const body = await readJsonBody(req)
        await adminResetPassword(
          db,
          Number(adminResetMatch[1]),
          body?.newPassword,
          currentUser
        )
        sendJson(res, 200, { ok: true })
        return
      }

      const adminMuteMatch = url.pathname.match(
        /^\/api\/admin\/users\/(\d+)\/mute$/
      )
      if (adminMuteMatch) {
        if (req.method !== 'POST') {
          methodNotAllowed(res, ['POST'])
          return
        }
        const body = await readJsonBody(req)
        const result = adminMuteUser(
          db,
          Number(adminMuteMatch[1]),
          body,
          currentUser
        )
        sendJson(res, 200, { ok: true, ...result })
        return
      }

      const adminUnmuteMatch = url.pathname.match(
        /^\/api\/admin\/users\/(\d+)\/unmute$/
      )
      if (adminUnmuteMatch) {
        if (req.method !== 'POST') {
          methodNotAllowed(res, ['POST'])
          return
        }
        adminUnmuteUser(db, Number(adminUnmuteMatch[1]), currentUser)
        sendJson(res, 200, { ok: true })
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
        const owned = db
          .prepare('SELECT id FROM reviews WHERE image_path = ? LIMIT 1')
          .get(url.pathname)
        if (!owned) {
          sendJson(res, 404, { error: 'Image Not Found' })
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
          'Cache-Control': 'private, max-age=86400'
        })
        fs.createReadStream(filePath).pipe(res)
        return
      }

      if (url.pathname === '/api/gifts') {
        if (req.method !== 'GET') {
          methodNotAllowed(res, ['GET'])
          return
        }
        sendJson(res, 200, getCatalog(db))
        return
      }

      const reviewMatch = url.pathname.match(/^\/api\/gifts\/(\d+)\/reviews$/)
      if (reviewMatch) {
        const giftId = Number(reviewMatch[1])

        if (req.method === 'GET') {
          sendJson(res, 200, getGiftReviewData(db, giftId))
          return
        }

        if (req.method === 'POST') {
          if (currentUser.isMuted) {
            sendJson(res, 403, {
              error: '你已被禁言，暂时不能发表评价'
            })
            return
          }
          const body = await readJsonBody(req, 8 * 1024 * 1024)
          const result = createReview(db, giftId, body, currentUser.id)
          sendJson(res, 201, result)
          return
        }

        methodNotAllowed(res, ['GET', 'POST'])
        return
      }

      const reviewAdminMatch = url.pathname.match(/^\/api\/reviews\/(\d+)$/)
      if (reviewAdminMatch) {
        if (req.method !== 'DELETE') {
          methodNotAllowed(res, ['DELETE'])
          return
        }
        const result = adminDeleteReview(
          db,
          Number(reviewAdminMatch[1]),
          currentUser
        )
        sendJson(res, 200, result)
        return
      }

      if (url.pathname === '/api/friends') {
        if (req.method === 'GET') {
          sendJson(res, 200, listFriends(db, currentUser.id))
          return
        }
        if (req.method === 'POST') {
          const body = await readJsonBody(req)
          const friend = addFriend(db, body, currentUser.id)
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
          db,
          Number(friendIdMatch[1]),
          body?.gender,
          currentUser.id
        )
        sendJson(res, 200, { friend })
        return
      }

      if (url.pathname === '/api/favorites') {
        if (req.method === 'GET') {
          const { giftsById } = buildGiftMap(db)
          const rows = listFavoriteRows(db, currentUser.id)
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
          const body = await readJsonBody(req)
          const row = addFavorite(db, body?.giftId, currentUser.id)
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
        const row = restoreFavorite(
          db,
          Number(favoriteRestoreMatch[1]),
          currentUser.id
        )
        const { giftsById } = buildGiftMap(db)
        sendJson(res, 200, { favorite: serializeFavorite(row, giftsById) })
        return
      }

      const favoriteIdMatch = url.pathname.match(/^\/api\/favorites\/(\d+)$/)
      if (favoriteIdMatch) {
        const favoriteId = Number(favoriteIdMatch[1])

        if (req.method === 'PATCH') {
          const body = await readJsonBody(req)
          const row = updateFavorite(db, favoriteId, body, currentUser.id)
          const { giftsById } = buildGiftMap(db)
          sendJson(res, 200, { favorite: serializeFavorite(row, giftsById) })
          return
        }

        if (req.method === 'DELETE') {
          const row = deleteFavorite(db, favoriteId, currentUser.id)
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
        const gifts = db.prepare('SELECT COUNT(*) AS count FROM gifts').get()
        const tags = db.prepare('SELECT COUNT(*) AS count FROM tags').get()
        sendJson(res, 200, {
          ok: true,
          counts: {
            gifts: Number(gifts.count),
            tags: Number(tags.count)
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
