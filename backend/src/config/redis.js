const Redis = require('ioredis')

const redis = new Redis(process.env.REDIS_URL, {
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 100, 3000),
})

redis.on('error', (err) => console.error('[Redis] Error:', err.message))
redis.on('connect', () => console.log('[Redis] Connected'))

module.exports = redis
