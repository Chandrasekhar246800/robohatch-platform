import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const port = process.env.PORT || 3001

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
  console.log(`🚀 API Server running on http://localhost:${port}`)
})
