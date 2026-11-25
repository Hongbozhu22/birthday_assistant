import { TAG_TREE } from './tags.js'
import { SEED_GIFTS } from './gifts.js'

export const SEED_VERSION = '1'

/**
 * 写入标签树与礼物种子数据。
 * 标签的父级关系在写入商品时自动补齐，所以“运动”这类父标签
 * 也会真实挂在商品上，后面的交集筛选才能生效。
 */
export function runSeed(db) {
  const insertTag = db.prepare(
    'INSERT INTO tags (name, parent_id, sort_order) VALUES (?, ?, ?)'
  )
  const insertGift = db.prepare(`
    INSERT INTO gifts
      (name, emoji, category, fit_for, reason, price_min, price_max,
       gradient_from, gradient_to, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertGiftTag = db.prepare(
    'INSERT OR IGNORE INTO gift_tags (gift_id, tag_id) VALUES (?, ?)'
  )
  const setMeta = db.prepare(
    'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  )

  /** @type {Map<string, number>} */
  const tagIds = new Map()

  TAG_TREE.forEach((root, rootIndex) => {
    const rootResult = insertTag.run(root.name, null, rootIndex + 1)
    tagIds.set(root.name, Number(rootResult.lastInsertRowid))

    root.children.forEach((childName, childIndex) => {
      const childResult = insertTag.run(
        childName,
        Number(rootResult.lastInsertRowid),
        childIndex + 1
      )
      tagIds.set(`${root.name}/${childName}`, Number(childResult.lastInsertRowid))
    })
  })

  SEED_GIFTS.forEach((gift) => {
    const result = insertGift.run(
      gift.name,
      gift.emoji,
      gift.category,
      gift.fitFor,
      gift.reason,
      gift.priceMin,
      gift.priceMax,
      gift.gradientFrom,
      gift.gradientTo,
      gift.sortOrder
    )
    const giftId = Number(result.lastInsertRowid)

    const resolvedTagIds = new Set()
    for (const tagPath of gift.tags) {
      const segments = tagPath.split('/')
      const rootName = segments[0]
      const rootId = tagIds.get(rootName)
      if (!rootId) {
        throw new Error(`礼物「${gift.name}」引用了不存在的标签：${rootName}`)
      }
      resolvedTagIds.add(rootId)

      if (segments.length > 1) {
        const childPath = `${rootName}/${segments[1]}`
        const childId = tagIds.get(childPath)
        if (!childId) {
          throw new Error(`礼物「${gift.name}」引用了不存在的标签：${childPath}`)
        }
        resolvedTagIds.add(childId)
      }
    }

    for (const tagId of resolvedTagIds) {
      insertGiftTag.run(giftId, tagId)
    }
  })

  setMeta.run('seed_version', SEED_VERSION)
  setMeta.run('seeded_at', new Date().toISOString())
}

export const SEED_SUMMARY = {
  giftCount: SEED_GIFTS.length,
  tagCount: TAG_TREE.reduce((sum, root) => sum + 1 + root.children.length, 0)
}
