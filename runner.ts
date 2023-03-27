require('dotenv').config({ path: __dirname + `/.env.${process.env.NODE_ENV}` })
import cron from 'node-cron'
import { Worker, isMainThread } from 'worker_threads'
import { RedisKeys } from '@boter/constants'
import { RedisService } from '@boter/core'
import ip from 'ip'
import os from 'os'
import { apiService } from '@boter/api-sdk'

type WorkerData = {
  botId: number
  userId: number
  params: any
  api: any
  code: string
  lang: string
}

export class Runner {
  private runJSCode(data: WorkerData) {
    const { code } = data
    if (isMainThread) {
      const worker = new Worker(code, { eval: true, workerData: data })

      worker.on('error', (error) => {
        console.log('worker error=======:', error)
      })

      worker.on('exit', (code) => {
        console.log('worker exited======', code)
      })
    } else {
      console.log('Inside Worker!')
    }
  }

  private checkHeartbeat(runnerId: number) {
    // */1 * * * * 一分钟
    // */5 * * * * * 五秒
    cron.schedule('*/3 * * * * *', async () => {
      apiService
        .updateRunnerHeartbeat({
          runnerId,
          heartbeatAt: new Date(),
        })
        .catch((error) => {
          console.log('update runner heartbeat error:', error)
        })
    })
  }

  async init() {
    console.log('init runner...')
    console.log('process.env.NODE_ENV:', process.env.NODE_ENV)
    console.log(
      'redis:',
      process.env.REDIS_PASSWORD,
      process.env.REDIS_HOST,
      process.env.REDIS_PORT,
    )
    console.log('token:', process.env.TOKEN)
    console.log('BASE_URL:', process.env.BASE_URL)

    const machineHash = os.hostname()

    console.log('machineHash:', machineHash)

    const runner = await apiService.registerRunner({
      machineHash,
      machineIp: ip.address(),
      token: process.env.TOKEN,
    })

    const pubSub = RedisService.getSubPub('common')

    const key = RedisKeys.botBooting(runner.id as any)

    console.log('runner sub key:', key)

    pubSub.subscribe(key, (msg) => {
      const data: WorkerData = JSON.parse(msg)
      const { lang } = data
      console.log('run bot id:', data.botId)
      if (lang === 'py') {
        console.log('python.......')
        // 暂时不支持了
        // this.runPython(data)
      } else if (lang === 'go') {
        console.log('run go.......')
        // 暂时不支持了
        // this.runGo(data)
      } else {
        this.runJSCode(data)
      }
    })

    this.checkHeartbeat(runner.id)
  }
}
