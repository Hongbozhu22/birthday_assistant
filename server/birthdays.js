const DAY_MS = 24 * 60 * 60 * 1000

export function daysInMonth(year, month) {
  if (!Number.isInteger(month) || month < 1 || month > 12) return 0
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function localDateParts(date = new Date()) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate()
  }
}

export function formatIsoDate(year, month, day) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function formatBirthdayLabel(month, day) {
  return `${month}月${day}日`
}

/**
 * 计算距离下一次生日的天数（按服务器本地日期）。
 * 2 月 29 日在平年按 2 月 28 日提醒，避免日期溢出到 3 月。
 */
export function upcomingBirthday(birthMonth, birthDay, now = new Date()) {
  const today = localDateParts(now)
  const todayMs = Date.UTC(today.year, today.month - 1, today.day)

  let year = today.year
  let actualDay = Math.min(birthDay, daysInMonth(year, birthMonth))
  let targetMs = Date.UTC(year, birthMonth - 1, actualDay)

  if (targetMs < todayMs) {
    year += 1
    actualDay = Math.min(birthDay, daysInMonth(year, birthMonth))
    targetMs = Date.UTC(year, birthMonth - 1, actualDay)
  }

  return {
    daysUntil: Math.round((targetMs - todayMs) / DAY_MS),
    nextYear: year,
    nextMonth: birthMonth,
    nextDay: actualDay,
    nextDate: formatIsoDate(year, birthMonth, actualDay),
    adjusted: actualDay !== birthDay
  }
}
