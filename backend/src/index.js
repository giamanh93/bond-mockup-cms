require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./config/swagger')
const { apiLimiter } = require('./middleware/rateLimit')
const errorMiddleware = require('./middleware/error')
const { ensureBuckets } = require('./config/minio')

const app = express()

app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))
app.use(apiLimiter)

// Swagger UI — http://localhost/api/api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec))

// Routes
app.use('/auth', require('./routes/auth'))
app.use('/users', require('./routes/users'))

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.use(errorMiddleware)

const PORT = process.env.APP_PORT || 4000

async function start() {
  await ensureBuckets().catch((err) => console.warn('[MinIO] Bucket init skipped:', err.message))
  app.listen(PORT, () => console.log(`[API] Running on port ${PORT}`))
}

start()
