import { fileURLToPath } from 'node:url'
import path from 'node:path'

export const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url))
export const ROOT_DIR = path.resolve(SERVER_DIR, '..')
export const DATA_DIR = process.env.GIFT_DATA_DIR
  ? path.resolve(process.env.GIFT_DATA_DIR)
  : path.join(ROOT_DIR, 'data')
export const DB_PATH = process.env.GIFT_DB_PATH
  ? path.resolve(process.env.GIFT_DB_PATH)
  : path.join(DATA_DIR, 'gift-assistant.db')
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')
