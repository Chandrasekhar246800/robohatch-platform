import express, { Request, Response } from 'express'
import { logger } from './utils/logger';
import cors from 'cors'
import { env } from './config/env';

const app = express()
const port = env.port

app.use(cors())
app.use(express.json())

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to RoboHatch API',
    version: '1.0.0',
    status: 'healthy'
  })
})

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  })
})

app.listen(port, () => {
  logger.info(`🚀 API Server running on http://localhost:${port}`)
})
