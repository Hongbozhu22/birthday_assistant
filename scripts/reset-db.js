import fs from 'node:fs'
import { DB_PATH } from '../server/paths.js'

for (const file of [DB_PATH, `${DB_PATH}-shm`, `${DB_PATH}-wal`]) {
  if (fs.existsSync(file)) {
    fs.rmSync(file)
    console.log(`已删除 ${file}`)
  }
}

console.log('数据库已重置，下次启动会重新写入种子数据。')
