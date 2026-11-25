function httpError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function toFavoriteId(value) {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) {
    throw httpError(400, '收藏 id 不正确')
  }
  return id
}

function getFavoriteRow(db, id) {
  return db.prepare('SELECT * FROM favorites WHERE id = ?').get(id)
}

export function listFavoriteRows(db) {
  return db
    .prepare(
      `SELECT * FROM favorites
        ORDER BY (deleted_at IS NOT NULL) ASC, datetime(updated_at) DESC, id DESC`
    )
    .all()
}

export function addFavorite(db, giftIdInput) {
  const giftId = Number(giftIdInput)
  if (!Number.isInteger(giftId) || giftId <= 0) {
    throw httpError(400, '礼物 id 不正确')
  }

  const gift = db.prepare('SELECT id FROM gifts WHERE id = ?').get(giftId)
  if (!gift) throw httpError(404, '礼物不存在')

  const active = db
    .prepare('SELECT * FROM favorites WHERE gift_id = ? AND deleted_at IS NULL LIMIT 1')
    .get(giftId)
  if (active) throw httpError(409, '这件礼物已经在仓库里了')

  const deleted = db
    .prepare(
      `SELECT * FROM favorites
        WHERE gift_id = ? AND deleted_at IS NOT NULL
        ORDER BY datetime(deleted_at) DESC, id DESC
        LIMIT 1`
    )
    .get(giftId)

  if (deleted) {
    db.prepare(
      `UPDATE favorites
          SET deleted_at = NULL, status = 'wishlist', updated_at = datetime('now')
        WHERE id = ?`
    ).run(deleted.id)
    return getFavoriteRow(db, deleted.id)
  }

  const result = db
    .prepare(
      `INSERT INTO favorites (gift_id, status)
       VALUES (?, 'wishlist')`
    )
    .run(giftId)

  return getFavoriteRow(db, Number(result.lastInsertRowid))
}

export function updateFavorite(db, idInput, patch) {
  const id = toFavoriteId(idInput)
  const row = getFavoriteRow(db, id)
  if (!row) throw httpError(404, '收藏不存在')
  if (row.deleted_at) throw httpError(409, '已删除的收藏需要先恢复才能编辑')

  if (!patch || typeof patch !== 'object') {
    throw httpError(400, '请求内容格式不正确')
  }

  const updates = []
  const values = []

  if (Object.hasOwn(patch, 'status')) {
    if (!['wishlist', 'gifted'].includes(patch.status)) {
      throw httpError(400, '状态只能是 wishlist 或 gifted')
    }
    updates.push('status = ?')
    values.push(patch.status)
  }

  if (Object.hasOwn(patch, 'channel')) {
    let channel = patch.channel
    if (channel === null || channel === undefined) {
      channel = null
    } else {
      channel = String(channel).trim()
      if ([...channel].length > 80) {
        throw httpError(400, '购买渠道不能超过 80 个字')
      }
      if (channel === '') channel = null
    }
    updates.push('channel = ?')
    values.push(channel)
  }

  if (Object.hasOwn(patch, 'actualPrice')) {
    let price = patch.actualPrice
    if (price === null || price === undefined || price === '') {
      price = null
    } else {
      price = Number(price)
      if (!Number.isFinite(price) || price < 0 || price > 10000000) {
        throw httpError(400, '实际价格需要是 0 以上的数字')
      }
      price = Math.round(price * 100) / 100
    }
    updates.push('actual_price = ?')
    values.push(price)
  }

  if (updates.length === 0) {
    throw httpError(400, '没有可保存的字段')
  }

  updates.push("updated_at = datetime('now')")
  db.prepare(`UPDATE favorites SET ${updates.join(', ')} WHERE id = ?`).run(
    ...values,
    id
  )

  return getFavoriteRow(db, id)
}

export function deleteFavorite(db, idInput) {
  const id = toFavoriteId(idInput)
  const row = getFavoriteRow(db, id)
  if (!row) throw httpError(404, '收藏不存在')
  if (row.deleted_at) return row

  db.prepare(
    `UPDATE favorites
        SET deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?`
  ).run(id)

  return getFavoriteRow(db, id)
}

export function restoreFavorite(db, idInput) {
  const id = toFavoriteId(idInput)
  const row = getFavoriteRow(db, id)
  if (!row) throw httpError(404, '收藏不存在')
  if (!row.deleted_at) return row

  const active = db
    .prepare(
      `SELECT id FROM favorites
        WHERE gift_id = ? AND deleted_at IS NULL AND id <> ?
        LIMIT 1`
    )
    .get(row.gift_id, id)
  if (active) throw httpError(409, '这件礼物已经有另一条有效收藏')

  db.prepare(
    `UPDATE favorites
        SET deleted_at = NULL, updated_at = datetime('now')
      WHERE id = ?`
  ).run(id)

  return getFavoriteRow(db, id)
}
