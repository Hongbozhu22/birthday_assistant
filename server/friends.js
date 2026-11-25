import {
  daysInMonth,
  formatBirthdayLabel,
  formatIsoDate,
  localDateParts,
  upcomingBirthday
} from './birthdays.js'

function httpError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function mapFriend(row, now) {
  const upcoming = upcomingBirthday(row.birth_month, row.birth_day, now)
  return {
    id: row.id,
    name: row.name,
    birthMonth: row.birth_month,
    birthDay: row.birth_day,
    birthYear: row.birth_year,
    gender: row.gender,
    birthdayLabel: formatBirthdayLabel(row.birth_month, row.birth_day),
    nextBirthday: upcoming.nextDate,
    nextBirthdayLabel: formatBirthdayLabel(upcoming.nextMonth, upcoming.nextDay),
    daysUntil: upcoming.daysUntil,
    isToday: upcoming.daysUntil === 0,
    turnsAge: row.birth_year == null ? null : upcoming.nextYear - row.birth_year,
    createdAt: row.created_at
  }
}

export function validateFriendInput(input, now = new Date()) {
  if (!input || typeof input !== 'object') {
    throw httpError(400, '请求内容格式不正确')
  }

  const name = String(input.name ?? '')
    .trim()
    .replace(/\s+/g, ' ')

  if (!name) throw httpError(400, '请填写好友姓名')
  if ([...name].length > 30) throw httpError(400, '姓名不能超过 30 个字')

  const month = Number(input.month)
  const day = Number(input.day)

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw httpError(400, '月份需要是 1-12 之间的整数')
  }
  if (!Number.isInteger(day) || day < 1) {
    throw httpError(400, '日期需要是正整数')
  }

  let year = null
  if (input.year !== undefined && input.year !== null && String(input.year).trim() !== '') {
    year = Number(input.year)
    const currentYear = localDateParts(now).year
    if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
      throw httpError(400, `年份需要是 1900-${currentYear} 之间的整数`)
    }
    if (day > daysInMonth(year, month)) {
      throw httpError(400, '这个年份里没有这一天，请检查月日')
    }
  } else if (day > daysInMonth(2024, month)) {
    // 生日可能落在 2 月 29 日，因此不填年份时按闰年校验
    throw httpError(400, `${month} 月没有 ${day} 日`)
  }

  let gender = null
  if (
    input.gender !== undefined &&
    input.gender !== null &&
    String(input.gender).trim() !== ''
  ) {
    gender = String(input.gender).trim()
    if (!['male', 'female', 'other'].includes(gender)) {
      throw httpError(400, '性别需要是 male、female 或 other')
    }
  }

  return { name, month, day, year, gender }
}

export function listFriends(db, now = new Date()) {
  const rows = db
    .prepare(
      `SELECT id, name, birth_month, birth_day, birth_year, gender, created_at
         FROM friends
        ORDER BY id ASC`
    )
    .all()

  const friends = rows.map((row) => mapFriend(row, now))
  friends.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil
    if (a.birthMonth !== b.birthMonth) return a.birthMonth - b.birthMonth
    if (a.birthDay !== b.birthDay) return a.birthDay - b.birthDay
    return a.name.localeCompare(b.name, 'zh-Hans-CN')
  })

  const today = localDateParts(now)

  return {
    today: formatIsoDate(today.year, today.month, today.day),
    total: friends.length,
    friends
  }
}

export function addFriend(db, input, now = new Date()) {
  const friend = validateFriendInput(input, now)

  const duplicate = db
    .prepare(
      `SELECT id FROM friends
        WHERE name = ? AND birth_month = ? AND birth_day = ?
        LIMIT 1`
    )
    .get(friend.name, friend.month, friend.day)

  if (duplicate) {
    throw httpError(409, `已经记录过「${friend.name}」在 ${friend.month} 月 ${friend.day} 日的生日`)
  }

  const result = db
    .prepare(
      `INSERT INTO friends (name, birth_month, birth_day, birth_year, gender)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(friend.name, friend.month, friend.day, friend.year, friend.gender)

  const row = db
    .prepare(
      `SELECT id, name, birth_month, birth_day, birth_year, gender, created_at
         FROM friends WHERE id = ?`
    )
    .get(Number(result.lastInsertRowid))

  return mapFriend(row, now)
}

export function updateFriendGender(db, idInput, genderInput, now = new Date()) {
  const id = Number(idInput)
  if (!Number.isInteger(id) || id <= 0) {
    throw httpError(400, '好友 id 不正确')
  }

  const row = db.prepare('SELECT id FROM friends WHERE id = ?').get(id)
  if (!row) throw httpError(404, '好友不存在')

  let gender = null
  if (
    genderInput !== undefined &&
    genderInput !== null &&
    String(genderInput).trim() !== ''
  ) {
    gender = String(genderInput).trim()
    if (!['male', 'female', 'other'].includes(gender)) {
      throw httpError(400, '性别需要是 male、female 或 other')
    }
  }

  db.prepare(
    `UPDATE friends SET gender = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(gender, id)

  const updated = db
    .prepare(
      `SELECT id, name, birth_month, birth_day, birth_year, gender, created_at
         FROM friends WHERE id = ?`
    )
    .get(id)

  return mapFriend(updated, now)
}
