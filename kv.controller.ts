import { Express } from 'express'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import SQL from 'sql-template-strings'

async function initDB() {
  const db = await open({
    filename: '/tmp/database.db',
    driver: sqlite3.Database,
  })

  await db.exec('CREATE TABLE IF NOT EXISTS kv (key TEXT, value TEXT)')
  return db
}

function success(data: any) {
  return { success: true, data }
}

function fail(message: any) {
  return { success: false, message }
}

export async function initKVController(app: Express) {
  const db = await initDB()

  app.get('/kv/list', async (req, res) => {
    let result = await db.all(SQL`SELECT key,value FROM kv`)
    res.json(success(result))
  })

  app.post('/kv/clearAll', async (req, res) => {
    await db.exec('delete from kv')
    res.json(success(null))
  })

  app.get('/kv/get', async (req, res) => {
    const { key } = req.query
    const kv = await db.get(SQL`SELECT * FROM kv WHERE key = ${key}`)

    if (!kv) {
      res.status(400).json(fail('该配置 key 不存在'))
      return
    }

    res.json(kv)
  })

  app.post('/kv/delete', async (req, res) => {
    const { key } = req.body
    await db.run(SQL`DELETE from kv WHERE key = ${key}`)

    res.json({
      success: true,
    })
  })

  app.post('/kv/update', async (req, res) => {
    const { key, value } = req.body

    const kv = await db.get(SQL`SELECT * FROM kv WHERE key = ${key}`)

    if (!kv) {
      res.status(400).json(fail('该配置 key 不存在, 更新失败'))
      return
    }

    await db.run(SQL`UPDATE kv SET value = ${value} WHERE key = ${key}`)

    res.json({
      success: true,
    })
  })

  app.post('/kv/create', async (req, res) => {
    const { key, value } = req.body

    if (!key || !value) {
      res.status(400).json(fail('key and value is required'))
      return
    }

    const kv = await db.get(SQL`SELECT * FROM kv WHERE key = ${key}`)

    if (kv) {
      res.status(400).json(fail('该配置 key 已存在'))
      return
    }

    await db.run('INSERT INTO kv(key,value) VALUES ($key,$value)', {
      $key: key,
      $value: value,
    })

    res.json(success(null))
  })
}
