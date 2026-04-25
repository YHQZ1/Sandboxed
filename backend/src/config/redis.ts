import Redis from 'ioredis'
import dotenv from 'dotenv'

dotenv.config()

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

redis.on('connect', () => {
  console.log('🔴 Connected to Redis')
})

redis.on('error', (err) => {
  console.error('Redis error:', err)
})

export default redis
